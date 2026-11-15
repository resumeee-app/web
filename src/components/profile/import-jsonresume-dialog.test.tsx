import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "vitest-axe";
import * as React from "react";
import { ImportJSONResumeDialog } from "./import-jsonresume-dialog";
import { api } from "@/api/client";
import type { JSONResume } from "@/api/profile-queries";

vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return {
    ...actual,
    api: {
      POST: vi.fn(),
    },
  };
});

const sampleResume: JSONResume = {
  $schema:
    "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
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
    { name: "Orbital Mechanics", level: "Expert" },
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
      courses: ["Differential Equations", "Abstract Algebra"],
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
  meta: {
    version: "v1.0.0",
  },
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

  it("renders upload stage with replace caution note (not role=alert), Radix tabs, and accept attribute", () => {
    const { wrapper } = createWrapper();
    render(
      <ImportJSONResumeDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper }
    );

    expect(
      screen.getByRole("heading", { name: /import json resume/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      /replaces your existing main profile career records/i
    );
    expect(
      screen.getByRole("tablist", { name: /json resume input mode/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /upload \.json file/i })
    ).toHaveAttribute("aria-selected", "true");
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

    expect(screen.getByRole("note")).toHaveTextContent(
      /you have unsaved contact edits on your profile/i
    );
  });

  it("validates file size boundary and displays clean role=alert when file exceeds 10MB", async () => {
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

    expect(screen.getByRole("alert")).toHaveTextContent(
      /file exceeds maximum allowed size \(10mb\)/i
    );
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

    expect(screen.getByRole("alert")).toHaveTextContent(
      /only json \(\.json\) files are supported/i
    );
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

    expect(screen.getByRole("alert")).toHaveTextContent(
      /the selected json file is empty/i
    );
    expect(
      screen.getByRole("button", { name: /review json resume/i })
    ).toBeDisabled();
  });

  it("clears selected file, resets input on click for same-file reselection, and supports drag-and-drop & keyboard dropzone activation", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    render(
      <ImportJSONResumeDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper }
    );

    const fileInput = screen.getByLabelText(
      /select json resume file/i
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, "click");
    const dropzone = screen.getByRole("button", {
      name: /upload json resume file dropzone/i,
    });

    act(() => {
      dropzone.focus();
    });
    await user.keyboard("{Enter}");
    expect(clickSpy).toHaveBeenCalledTimes(1);

    await user.keyboard(" ");
    expect(clickSpy).toHaveBeenCalledTimes(2);

    const droppedFile = new File([JSON.stringify(sampleResume)], "sample.json", {
      type: "application/json",
    });
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [droppedFile] },
    });

    expect(screen.getAllByText(/sample\.json/i).length).toBeGreaterThan(0);

    // Clicking the input directly resets value so the same path can be re-selected after editing on disk
    Object.defineProperty(fileInput, "value", {
      writable: true,
      value: "C:\\fakepath\\sample.json",
    });
    fireEvent.click(fileInput);
    expect(fileInput.value).toBe("");

    await user.click(
      screen.getByRole("button", { name: /remove selected file/i })
    );

    expect(screen.queryByText(/sample\.json/i)).not.toBeInTheDocument();
  });

  it("shows inline role=alert and remains on upload step for malformed syntax, empty root, invalid sections, and malformed nested sub-fields", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    render(
      <ImportJSONResumeDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper }
    );

    const fileInput = screen.getByLabelText(/select json resume file/i);
    const invalidPayloads = [
      { content: "{not valid json", name: "broken.json", pattern: /invalid json syntax/i },
      { content: "[]", name: "array.json", pattern: /json resume root must be a json object/i },
      { content: "{}", name: "blank.json", pattern: /json resume object cannot be empty/i },
      { content: '{"work":"invalid"}', name: "bad-section.json", pattern: /invalid json resume: "work" must be an array/i },
      { content: '{"basics":{"name":123}}', name: "bad-name.json", pattern: /"basics\.name" must be a string/i },
      { content: '{"work":[null]}', name: "null-work.json", pattern: /each item in "work" must be an object/i },
      { content: '{"work":[{"highlights":"oops"}]}', name: "bad-highlights.json", pattern: /"work\[0\]\.highlights" must be an array of strings/i },
    ];

    for (const testCase of invalidPayloads) {
      await user.upload(
        fileInput,
        new File([testCase.content], testCase.name, {
          type: "application/json",
        })
      );
      await user.click(
        screen.getByRole("button", { name: /review json resume/i })
      );
      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(testCase.pattern);
      });
    }

    expect(
      screen.getByRole("heading", { name: /import json resume/i })
    ).toBeInTheDocument();
  });

  it("supports keyboard-navigable Radix Tabs for Paste Raw JSON and renders courses, skills, $schema, and meta in Step 2", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    render(
      <ImportJSONResumeDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper }
    );

    const uploadTab = screen.getByRole("tab", { name: /upload \.json file/i });
    const pasteTab = screen.getByRole("tab", { name: /paste raw json/i });

    act(() => {
      uploadTab.focus();
    });
    await user.keyboard("{ArrowRight}");
    expect(pasteTab).toHaveAttribute("aria-selected", "true");
    expect(pasteTab).toHaveFocus();

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
    expect(
      screen.getByText(/2 highlights · 2 courses: Differential Equations, Abstract Algebra/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Orbital Mechanics \(Expert\), Celestial Navigation, Fortran/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/\$schema/i)).toBeInTheDocument();
    expect(screen.getByText(/volunteer/i)).toBeInTheDocument();
    expect(screen.getByText(/awards/i)).toBeInTheDocument();
    expect(screen.getByText(/meta/i)).toBeInTheDocument();
    expect(screen.getByText(/x_custom_portfolio/i)).toBeInTheDocument();
    expect(
      screen.getByText(/confirming replaces existing main profile career items/i)
    ).toBeInTheDocument();
  });

  it("renders work.name (v1.0.0) without falling back to company and omits preserved notice when extended arrays are empty", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    render(
      <ImportJSONResumeDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper }
    );

    await user.click(screen.getByRole("tab", { name: /paste raw json/i }));
    const textarea = screen.getByLabelText(/paste json resume content/i);
    await user.click(textarea);
    await user.paste(
      JSON.stringify({
        skills: [{ name: "Go" }],
        work: [{ name: "Canonical Org", company: "Legacy Co", position: "Staff Engineer" }],
        volunteer: [],
        awards: [],
        meta: {},
      })
    );

    await user.click(
      screen.getByRole("button", { name: /review json resume/i })
    );

    await waitFor(() => {
      expect(screen.getByText("Unnamed Candidate")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/no basics\.name was found/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Canonical Org — Staff Engineer/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(
      screen.queryByText(/preserved extended sections/i)
    ).not.toBeInTheDocument();
  });

  it("handles file-read failures cleanly and discards late file read results if dialog closes mid-read", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    const onAnnouncement = vi.fn();

    const { rerender } = render(
      <ImportJSONResumeDialog
        open={true}
        onOpenChange={vi.fn()}
        onAnnouncement={onAnnouncement}
      />,
      { wrapper }
    );

    const failingFile = new File(["{}"], "unreadable.json", {
      type: "application/json",
    });
    Object.defineProperty(failingFile, "text", {
      value: () => Promise.reject(new Error("Disk read failed")),
    });

    const fileInput = screen.getByLabelText(/select json resume file/i);
    await user.upload(fileInput, failingFile);
    await user.click(
      screen.getByRole("button", { name: /review json resume/i })
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/disk read failed/i);
    });
    expect(onAnnouncement).toHaveBeenCalledWith("Disk read failed");

    // In-flight file read cancellation on dialog close
    let resolveRead: (value: string) => void = () => {};
    const slowFile = new File(["{}"], "slow.json", {
      type: "application/json",
    });
    Object.defineProperty(slowFile, "text", {
      value: () =>
        new Promise<string>((resolve) => {
          resolveRead = resolve;
        }),
    });

    await user.upload(fileInput, slowFile);
    await user.click(
      screen.getByRole("button", { name: /review json resume/i })
    );

    expect(
      screen.getByRole("button", { name: /reading json/i })
    ).toBeDisabled();
    expect(
      screen.getByRole("tab", { name: /paste raw json/i })
    ).toBeDisabled();

    rerender(
      <ImportJSONResumeDialog
        open={false}
        onOpenChange={vi.fn()}
        onAnnouncement={onAnnouncement}
      />
    );

    resolveRead(JSON.stringify(sampleResume));
    await Promise.resolve();

    rerender(
      <ImportJSONResumeDialog
        open={true}
        onOpenChange={vi.fn()}
        onAnnouncement={onAnnouncement}
      />
    );

    expect(
      screen.getByRole("heading", { name: /import json resume/i })
    ).toBeInTheDocument();
    expect(screen.queryByText("Katherine Johnson")).not.toBeInTheDocument();
  });

  it("blocks dismissal while import is in-flight and ignores late completion if closed forcefully by parent", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();
    const onAnnouncement = vi.fn();

    let resolveImport: (value: unknown) => void = () => {};
    vi.mocked(api.POST).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveImport = resolve;
        }) as never
    );

    const { rerender } = render(
      <ImportJSONResumeDialog
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
        onAnnouncement={onAnnouncement}
      />,
      { wrapper }
    );

    await user.click(screen.getByRole("tab", { name: /paste raw json/i }));
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

    expect(
      screen.getByRole("button", { name: /importing json resume/i })
    ).toBeDisabled();

    // Top-right Close button and Escape must not dismiss while import mutation is pending
    await user.click(screen.getByRole("button", { name: /^close$/i }));
    await user.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    // Parent forcefully unmounts/closes dialog mid-request; late resolution must not fire callbacks
    rerender(
      <ImportJSONResumeDialog
        open={false}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
        onAnnouncement={onAnnouncement}
      />
    );

    resolveImport({
      data: { profile: { full_name: "Katherine Johnson" } },
      error: undefined,
      response: new Response(),
    });
    await new Promise((r) => setTimeout(r, 20));

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onAnnouncement).not.toHaveBeenCalledWith(
      "JSON Resume successfully imported into Main Profile."
    );
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

    await user.click(screen.getByRole("tab", { name: /paste raw json/i }));
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
      expect(screen.getByRole("alert")).toHaveTextContent(
        /invalid date string in work history/i
      );
    });
    expect(
      screen.getByRole("heading", { name: /review json resume import/i })
    ).toBeInTheDocument();
  });

  it("restores focus to trigger button upon dialog dismissal including Escape key", async () => {
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

    await user.click(openBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(openBtn).toHaveFocus();
  });

  it("passes axe-core accessibility audits across default, unsaved/error alert, Step 2 review, and .dark theme", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    const { container } = render(
      <ImportJSONResumeDialog
        open={true}
        onOpenChange={vi.fn()}
        hasUnsavedChanges={true}
      />,
      { wrapper }
    );

    // Step 1 default + hasUnsavedChanges axe audit
    expect(await axe(container)).toHaveNoViolations();

    // Trigger Step 1 validation error alert and verify axe audit
    await user.click(screen.getByRole("tab", { name: /paste raw json/i }));
    const textarea = screen.getByLabelText(/paste json resume content/i);
    await user.click(textarea);
    await user.paste("{invalid");
    await user.click(
      screen.getByRole("button", { name: /review json resume/i })
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    // Valid paste -> Step 2 axe audit in both light and .dark mode
    await user.clear(textarea);
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

    expect(await axe(container)).toHaveNoViolations();

    document.documentElement.classList.add("dark");
    try {
      expect(await axe(container)).toHaveNoViolations();
    } finally {
      document.documentElement.classList.remove("dark");
    }
  });
});
