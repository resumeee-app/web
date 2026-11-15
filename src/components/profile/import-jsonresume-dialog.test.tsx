import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "vitest-axe";
import * as React from "react";
import { ImportJSONResumeDialog } from "./import-jsonresume-dialog";
import { api } from "@/api/client";
import type { JSONResume } from "@/api/profile-queries";

vi.mock("@/api/client", () => ({
  api: {
    POST: vi.fn(),
  },
}));

const sampleResume: JSONResume & Record<string, unknown> = {
  basics: {
    name: "Katherine Johnson",
    label: "Orbital Mechanics Mathematician",
    email: "katherine@nasa.gov",
    phone: "555-1969",
    summary: "Pioneered orbital trajectory calculations for NASA spaceflights.",
    location: {
      city: "Hampton",
      region: "VA",
      countryCode: "US",
    },
  },
  skills: [
    { name: "Orbital Mechanics" },
    { name: "Celestial Navigation" },
    { name: "Fortran" },
  ],
  work: [
    {
      company: "NASA Langley Research Center",
      position: "Aerospace Technologist",
      startDate: "1953-06-01",
      endDate: "1986-06-01",
      highlights: ["Calculated launch window for Alan Shepard"],
    },
  ],
  education: [
    {
      institution: "West Virginia State University",
      area: "Mathematics and French",
      studyType: "Bachelor of Science",
      highlights: ["Summa Cum Laude", "Honors in Mathematics"],
    },
  ],
  projects: [
    {
      name: "Apollo 11 Trajectory Model",
    },
  ],
  certificates: [
    {
      name: "Presidential Medal of Freedom",
      issuer: "White House",
    },
  ],
  volunteer: [
    {
      organization: "STEM Outreach",
      position: "Mentor",
    },
  ],
  awards: [
    {
      title: "Lunar Orbiter Award",
    },
  ],
  x_custom_portfolio: {
    featured: true,
  },
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

describe("ImportJSONResumeDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders upload stage with replace caution notice and accept attribute", () => {
    const { wrapper } = createWrapper();
    render(
      <ImportJSONResumeDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper }
    );

    expect(
      screen.getByRole("heading", { name: /import json resume/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/replaces your existing main profile career records/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/select json resume file/i)
    ).toHaveAttribute("accept", ".json,application/json");
    expect(
      screen.getByRole("button", { name: /review json resume/i })
    ).toBeDisabled();
  });

  it("displays explicit unsaved changes warning when hasUnsavedChanges is true", () => {
    const { wrapper } = createWrapper();
    render(
      <ImportJSONResumeDialog
        open={true}
        onOpenChange={vi.fn()}
        hasUnsavedChanges={true}
      />,
      { wrapper }
    );

    expect(
      screen.getByText(/you have unsaved contact edits on your profile/i)
    ).toBeInTheDocument();
  });

  it("validates file size boundary and displays alert when file exceeds 10MB", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    render(
      <ImportJSONResumeDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper }
    );

    const fileInput = screen.getByLabelText(/select json resume file/i);
    const oversizedFile = new File(["{}"], "oversized.json", {
      type: "application/json",
    });
    Object.defineProperty(oversizedFile, "size", { value: 11 * 1024 * 1024 });

    await user.upload(fileInput, oversizedFile);

    expect(
      screen.getByText(/file exceeds maximum allowed size \(10mb\)/i).closest('[role="alert"]')
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /review json resume/i })
    ).toBeDisabled();
  });

  it("validates file extension and rejects non-JSON files", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const { wrapper } = createWrapper();
    render(
      <ImportJSONResumeDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper }
    );

    const fileInput = screen.getByLabelText(/select json resume file/i);
    const textFile = new File(["plain text"], "resume.txt", {
      type: "text/plain",
    });

    await user.upload(fileInput, textFile);

    expect(
      screen.getByText(/only json \(\.json\) files are supported/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /review json resume/i })
    ).toBeDisabled();
  });

  it("rejects empty 0-byte JSON files", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    render(
      <ImportJSONResumeDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper }
    );

    const fileInput = screen.getByLabelText(/select json resume file/i);
    const emptyFile = new File([], "empty.json", {
      type: "application/json",
    });

    await user.upload(fileInput, emptyFile);

    expect(
      screen.getByText(/the selected json file is empty/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /review json resume/i })
    ).toBeDisabled();
  });

  it("clears selected file and resets file input value when remove button is clicked", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    render(
      <ImportJSONResumeDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper }
    );

    const fileInput = screen.getByLabelText(
      /select json resume file/i
    ) as HTMLInputElement;
    const validFile = new File([JSON.stringify(sampleResume)], "sample.json", {
      type: "application/json",
    });

    await user.upload(fileInput, validFile);
    expect(screen.getAllByText(/sample\.json/i).length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("button", { name: /remove selected file/i })
    );

    expect(screen.queryByText(/sample\.json/i)).not.toBeInTheDocument();
    expect(fileInput.value).toBe("");
  });

  it("shows inline alert and remains on upload step when JSON content is malformed, non-object, empty, or has invalid sections", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    render(
      <ImportJSONResumeDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper }
    );

    const fileInput = screen.getByLabelText(/select json resume file/i);

    // 1. Malformed syntax
    await user.upload(
      fileInput,
      new File(["{not valid json"], "broken.json", {
        type: "application/json",
      })
    );
    await user.click(
      screen.getByRole("button", { name: /review json resume/i })
    );
    await waitFor(() => {
      expect(screen.getByText(/invalid json syntax/i)).toBeInTheDocument();
    });

    // 2. Non-object root ([])
    await user.upload(
      fileInput,
      new File(["[]"], "array.json", { type: "application/json" })
    );
    await user.click(
      screen.getByRole("button", { name: /review json resume/i })
    );
    await waitFor(() => {
      expect(
        screen.getByText(/json resume root must be a json object/i)
      ).toBeInTheDocument();
    });

    // 3. Empty {}
    await user.upload(
      fileInput,
      new File(["{}"], "blank.json", { type: "application/json" })
    );
    await user.click(
      screen.getByRole("button", { name: /review json resume/i })
    );
    await waitFor(() => {
      expect(
        screen.getByText(/json resume object cannot be empty/i)
      ).toBeInTheDocument();
    });

    // 4. Invalid section type
    await user.upload(
      fileInput,
      new File(['{"work":"invalid"}'], "bad-section.json", {
        type: "application/json",
      })
    );
    await user.click(
      screen.getByRole("button", { name: /review json resume/i })
    );
    await waitFor(() => {
      expect(
        screen.getByText(/invalid json resume: "work" must be an array/i)
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", { name: /import json resume/i })
    ).toBeInTheDocument();
  });

  it("supports Paste Raw JSON toggle mode and advances to Step 2 review", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    render(
      <ImportJSONResumeDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper }
    );

    await user.click(screen.getByRole("button", { name: /paste raw json/i }));

    const textarea = screen.getByLabelText(/paste json resume content/i);
    await user.click(textarea);
    await user.paste(JSON.stringify(sampleResume));

    await user.click(
      screen.getByRole("button", { name: /review json resume/i })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /review json resume import/i })
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Katherine Johnson")).toBeInTheDocument();
    expect(screen.getByText(/1 work experience/i)).toBeInTheDocument();
    expect(screen.getByText(/3 skills/i)).toBeInTheDocument();
    expect(screen.getByText(/1 education/i)).toBeInTheDocument();
    expect(screen.getByText(/1 project/i)).toBeInTheDocument();
    expect(screen.getByText(/1 certificate/i)).toBeInTheDocument();
    expect(
      screen.getByText(/nasa langley research center — aerospace technologist/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/2 highlights/i)).toBeInTheDocument();
    expect(screen.getByText(/volunteer/i)).toBeInTheDocument();
    expect(screen.getByText(/awards/i)).toBeInTheDocument();
    expect(screen.getByText(/x_custom_portfolio/i)).toBeInTheDocument();
    expect(
      screen.getByText(/confirming replaces existing main profile career items/i)
    ).toBeInTheDocument();
  });

  it("shows missing basics.name hint when reviewed resume omits name", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    render(
      <ImportJSONResumeDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper }
    );

    await user.click(screen.getByRole("button", { name: /paste raw json/i }));
    const textarea = screen.getByLabelText(/paste json resume content/i);
    await user.click(textarea);
    await user.paste(JSON.stringify({ skills: [{ name: "Go" }] }));

    await user.click(
      screen.getByRole("button", { name: /review json resume/i })
    );

    await waitFor(() => {
      expect(screen.getByText("Unnamed Candidate")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/no basics\.name was found/i)
    ).toBeInTheDocument();
  });

  it("returns to Step 1 on Back and resets state cleanly on close and reopen", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <ImportJSONResumeDialog open={true} onOpenChange={onOpenChange} />,
      { wrapper }
    );

    const fileInput = screen.getByLabelText(/select json resume file/i);
    await user.upload(
      fileInput,
      new File([JSON.stringify(sampleResume)], "katherine.json", {
        type: "application/json",
      })
    );
    await user.click(
      screen.getByRole("button", { name: /review json resume/i })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /review json resume import/i })
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^back$/i }));
    expect(
      screen.getByRole("heading", { name: /import json resume/i })
    ).toBeInTheDocument();

    // Advance again and close dialog via prop transition
    await user.click(
      screen.getByRole("button", { name: /review json resume/i })
    );
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /review json resume import/i })
      ).toBeInTheDocument();
    });

    rerender(
      <ImportJSONResumeDialog open={false} onOpenChange={onOpenChange} />
    );
    rerender(
      <ImportJSONResumeDialog open={true} onOpenChange={onOpenChange} />
    );

    expect(
      screen.getByRole("heading", { name: /import json resume/i })
    ).toBeInTheDocument();
    expect(screen.queryByText("Katherine Johnson")).not.toBeInTheDocument();
  });

  it("completes upload -> review -> Replace Main Profile lifecycle and calls API, onSuccess, onOpenChange, and onAnnouncement", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();
    const onAnnouncement = vi.fn();

    const mockSnapshot = {
      profile: {
        id: "profile-1",
        user_id: "user-1",
        full_name: "Katherine Johnson",
      },
      main_revision: 3,
      skills: [],
      experiences: [],
      projects: [],
      education: [],
      certifications: [],
      facts: [],
      exported_at: "2026-11-15T00:00:00Z",
    };

    vi.mocked(api.POST).mockResolvedValueOnce({
      data: mockSnapshot as unknown as Record<string, never>,
      error: undefined,
      response: new Response(),
    });

    render(
      <ImportJSONResumeDialog
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
        onAnnouncement={onAnnouncement}
      />,
      { wrapper }
    );

    const fileInput = screen.getByLabelText(/select json resume file/i);
    await user.upload(
      fileInput,
      new File([JSON.stringify(sampleResume)], "katherine.json", {
        type: "application/json",
      })
    );
    await user.click(
      screen.getByRole("button", { name: /review json resume/i })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /review json resume import/i })
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /replace main profile/i })
    );

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith("/profile/jsonresume/import", {
        body: sampleResume,
      });
      expect(onSuccess).toHaveBeenCalledWith(mockSnapshot);
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onAnnouncement).toHaveBeenCalledWith(
        expect.stringMatching(/successfully imported/i)
      );
    });
  });

  it("displays API error alert and stays on Step 2 when import mutation fails", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();

    vi.mocked(api.POST).mockResolvedValueOnce({
      data: undefined,
      error: {
        error: {
          message: "Invalid date string in work history",
        },
      },
      response: new Response(null, { status: 400 }),
    });

    render(
      <ImportJSONResumeDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper }
    );

    await user.click(screen.getByRole("button", { name: /paste raw json/i }));
    const textarea = screen.getByLabelText(/paste json resume content/i);
    await user.click(textarea);
    await user.paste(JSON.stringify(sampleResume));

    await user.click(
      screen.getByRole("button", { name: /review json resume/i })
    );
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /review json resume import/i })
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /replace main profile/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/invalid date string in work history/i)
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: /review json resume import/i })
    ).toBeInTheDocument();
  });

  it("restores focus to trigger button upon dialog dismissal", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();

    const TestParent = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Open JSON Import
          </button>
          <ImportJSONResumeDialog open={open} onOpenChange={setOpen} />
        </div>
      );
    };

    render(<TestParent />, { wrapper });

    const openBtn = screen.getByRole("button", { name: /open json import/i });
    await user.click(openBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(openBtn).toHaveFocus();
  });

  it("passes axe-core accessibility audit on both Step 1 (upload) and Step 2 (review)", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    const { container } = render(
      <ImportJSONResumeDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper }
    );

    // Step 1 axe audit
    const step1Results = await axe(container);
    expect(step1Results).toHaveNoViolations();

    // Switch to paste mode, stage JSON, and run Step 2 axe audit
    await user.click(screen.getByRole("button", { name: /paste raw json/i }));
    const textarea = screen.getByLabelText(/paste json resume content/i);
    await user.click(textarea);
    await user.paste(JSON.stringify(sampleResume));
    await user.click(
      screen.getByRole("button", { name: /review json resume/i })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /review json resume import/i })
      ).toBeInTheDocument();
    });

    const step2Results = await axe(container);
    expect(step2Results).toHaveNoViolations();
  });
});
