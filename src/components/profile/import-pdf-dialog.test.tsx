import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "vitest-axe";
import React from "react";
import { ImportPDFDialog } from "./import-pdf-dialog";
import { api } from "@/api/client";
import type { JSONResume } from "@/api/profile-queries";

vi.mock("@/api/client", () => ({
  api: {
    POST: vi.fn(),
  },
}));

const mockParsedResume: JSONResume = {
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
      name: "NASA Langley Research Center",
      position: "Aerospace Technologist",
      startDate: "1953-06-01",
      endDate: "1986-06-01",
      summary: "Calculated flight trajectories for Project Mercury and Apollo 11.",
      highlights: ["Calculated launch window for Alan Shepard", "Verified Glenn orbit"],
    },
  ],
  education: [
    {
      institution: "West Virginia State University",
      area: "Mathematics and French",
      studyType: "Bachelor of Science",
      startDate: "1933-09-01",
      endDate: "1937-06-01",
    },
  ],
  projects: [
    {
      name: "Apollo 11 Trajectory Model",
      description: "Lunar orbit insertion trajectory mathematics.",
    },
  ],
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

describe("ImportPDFDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders upload stage with caution notice and accept attribute", () => {
    const { wrapper } = createWrapper();
    render(
      <ImportPDFDialog
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper }
    );

    expect(screen.getByRole("heading", { name: /import pdf resume/i })).toBeInTheDocument();
    expect(screen.getByText(/caution:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/select pdf resume file/i)).toHaveAttribute(
      "accept",
      ".pdf,application/pdf"
    );
    expect(screen.getByRole("button", { name: /parse & stage with llm/i })).toBeDisabled();
  });

  it("validates file size boundary and displays inline alert when file exceeds 10MB", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    render(
      <ImportPDFDialog
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper }
    );

    const fileInput = screen.getByLabelText(/select pdf resume file/i);
    const oversizedFile = new File(["dummy"], "oversized.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(oversizedFile, "size", { value: 12 * 1024 * 1024 });

    await user.upload(fileInput, oversizedFile);

    expect(
      screen.getByText(/file exceeds maximum allowed size \(10mb\)/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /parse & stage with llm/i })).toBeDisabled();
  });

  it("validates file extension and rejects non-PDF files", () => {
    const { wrapper } = createWrapper();
    render(
      <ImportPDFDialog
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper }
    );

    const fileInput = screen.getByLabelText(/select pdf resume file/i);
    const textFile = new File(["dummy text"], "resume.txt", {
      type: "text/plain",
    });

    fireEvent.change(fileInput, { target: { files: [textFile] } });

    expect(screen.getByText(/only pdf files are supported/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /parse & stage with llm/i })).toBeDisabled();
  });

  it("validates lower boundary and rejects empty 0-byte files", () => {
    const { wrapper } = createWrapper();
    render(
      <ImportPDFDialog
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper }
    );

    const fileInput = screen.getByLabelText(/select pdf resume file/i);
    const emptyFile = new File([], "empty.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(fileInput, { target: { files: [emptyFile] } });

    expect(screen.getByText(/the selected pdf file is empty/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /parse & stage with llm/i })).toBeDisabled();
  });

  it("displays explicit unsaved changes warning when hasUnsavedChanges is true", () => {
    const { wrapper } = createWrapper();
    render(
      <ImportPDFDialog
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

  it("clears selected file and resets file input value when remove button is clicked", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    render(
      <ImportPDFDialog
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper }
    );

    const fileInput = screen.getByLabelText(/select pdf resume file/i) as HTMLInputElement;
    const validFile = new File(["%PDF-1.4 mock content"], "sample.pdf", {
      type: "application/pdf",
    });
    await user.upload(fileInput, validFile);

    expect(screen.getAllByText(/sample\.pdf/i).length).toBeGreaterThan(0);

    const removeBtn = screen.getByRole("button", { name: /remove selected file/i });
    await user.click(removeBtn);

    expect(screen.queryByText(/sample\.pdf/i)).not.toBeInTheDocument();
    expect(fileInput.value).toBe("");
  });

  it("renders inline error alert when parse API mutation fails", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();

    vi.mocked(api.POST).mockResolvedValueOnce({
      data: undefined,
      error: {
        error: {
          message: "Upstream LLM parser rate limit exceeded",
        },
      },
      response: new Response(null, { status: 429 }),
    });

    render(
      <ImportPDFDialog
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper }
    );

    const fileInput = screen.getByLabelText(/select pdf resume file/i);
    const validFile = new File(["%PDF-1.4 mock content"], "resume.pdf", {
      type: "application/pdf",
    });
    await user.upload(fileInput, validFile);

    await user.click(screen.getByRole("button", { name: /parse & stage with llm/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/upstream llm parser rate limit exceeded/i)
      ).toBeInTheDocument();
    });
    // Remains on upload step
    expect(screen.getByRole("heading", { name: /import pdf resume/i })).toBeInTheDocument();
  });

  it("renders inline error alert when commit API mutation fails", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();

    vi.mocked(api.POST).mockImplementation(async (path) => {
      if (path === "/profile/pdf/parse") {
        return {
          data: mockParsedResume as unknown as Record<string, never>,
          error: undefined,
          response: new Response(),
        };
      }
      if (path === "/profile/pdf/commit") {
        return {
          data: undefined,
          error: {
            error: {
              message: "Database constraint error during commit",
            },
          },
          response: new Response(null, { status: 500 }),
        };
      }
      return { data: undefined, error: undefined, response: new Response() };
    });

    render(
      <ImportPDFDialog
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper }
    );

    const fileInput = screen.getByLabelText(/select pdf resume file/i);
    const validFile = new File(["%PDF-1.4 mock content"], "resume.pdf", {
      type: "application/pdf",
    });
    await user.upload(fileInput, validFile);

    await user.click(screen.getByRole("button", { name: /parse & stage with llm/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /review extracted resume draft/i })
      ).toBeInTheDocument();
    });

    const commitBtn = screen.getByRole("button", {
      name: /commit to master profile/i,
    });
    await user.click(commitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/database constraint error during commit/i)
      ).toBeInTheDocument();
    });
  });

  it("aborts state transition and discards late parsed draft if dialog is closed while parse is in-flight", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();

    let resolveParse: (value: unknown) => void = () => {};
    const parsePromise = new Promise((resolve) => {
      resolveParse = resolve;
    });

    vi.mocked(api.POST).mockReturnValueOnce(parsePromise as never);

    const { rerender } = render(
      <ImportPDFDialog
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper }
    );

    const fileInput = screen.getByLabelText(/select pdf resume file/i);
    const validFile = new File(["%PDF-1.4 mock content"], "katherine.pdf", {
      type: "application/pdf",
    });
    await user.upload(fileInput, validFile);

    await user.click(screen.getByRole("button", { name: /parse & stage with llm/i }));

    // Verify parsing spinner is active
    expect(
      screen.getByText(/extracting text and parsing structured resume via llm/i)
    ).toBeInTheDocument();

    // Close the dialog while parse is in-flight
    rerender(
      <ImportPDFDialog
        open={false}
        onOpenChange={vi.fn()}
      />
    );

    // Now resolve the in-flight network promise with PII
    resolveParse({
      data: mockParsedResume,
      error: undefined,
      response: new Response(),
    });

    await new Promise((r) => setTimeout(r, 50));

    // Re-open dialog: it MUST open at Step 1 (Upload) and NOT leak Katherine's PII
    rerender(
      <ImportPDFDialog
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: /import pdf resume/i })).toBeInTheDocument();
    expect(screen.queryByText(/review extracted resume draft/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Katherine Johnson")).not.toBeInTheDocument();
  });

  it("completes full staging and commit lifecycle: parse -> review -> commit", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();
    const onAnnouncement = vi.fn();

    vi.mocked(api.POST).mockImplementation(async (path) => {
      if (path === "/profile/pdf/parse") {
        return {
          data: mockParsedResume as unknown as Record<string, never>,
          error: undefined,
          response: new Response(),
        };
      }
      if (path === "/profile/pdf/commit") {
        return {
          data: {
            profile: { full_name: "Katherine Johnson" },
          } as unknown as Record<string, never>,
          error: undefined,
          response: new Response(),
        };
      }
      return { data: undefined, error: undefined, response: new Response() };
    });

    render(
      <ImportPDFDialog
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
        onAnnouncement={onAnnouncement}
      />,
      { wrapper }
    );

    // 1. Select a valid PDF file
    const fileInput = screen.getByLabelText(/select pdf resume file/i);
    const validFile = new File(["%PDF-1.4 mock content"], "katherine_johnson.pdf", {
      type: "application/pdf",
    });
    await user.upload(fileInput, validFile);

    const parseBtn = screen.getByRole("button", { name: /parse & stage with llm/i });
    expect(parseBtn).toBeEnabled();

    // 2. Click Parse
    await user.click(parseBtn);

    // Verify loading spinner / text is announced
    expect(api.POST).toHaveBeenCalledWith(
      "/profile/pdf/parse",
      expect.objectContaining({
        headers: { "Content-Type": null },
      })
    );

    // 3. Review Stage appears
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /review extracted resume draft/i })
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Katherine Johnson")).toBeInTheDocument();
    expect(screen.getByText(/orbital mechanics mathematician/i)).toBeInTheDocument();
    expect(screen.getByText(/katherine@nasa.gov/i)).toBeInTheDocument();
    expect(screen.getByText(/3 skills/i)).toBeInTheDocument();
    expect(screen.getByText(/1 work experience/i)).toBeInTheDocument();
    expect(screen.getByText(/1 education/i)).toBeInTheDocument();

    // 4. Click Commit to Master Profile
    const commitBtn = screen.getByRole("button", {
      name: /commit to master profile/i,
    });
    await user.click(commitBtn);

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith("/profile/pdf/commit", {
        body: mockParsedResume,
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onAnnouncement).toHaveBeenCalledWith(
        expect.stringMatching(/successfully imported/i)
      );
    });
  });

  it("allows discarding candidate draft in review stage and resets to upload stage", async () => {
    const user = userEvent.setup();
    const { wrapper } = createWrapper();

    vi.mocked(api.POST).mockResolvedValueOnce({
      data: mockParsedResume as unknown as Record<string, never>,
      error: undefined,
      response: new Response(),
    });

    render(
      <ImportPDFDialog
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper }
    );

    const fileInput = screen.getByLabelText(/select pdf resume file/i);
    const validFile = new File(["%PDF-1.4 mock content"], "sample.pdf", {
      type: "application/pdf",
    });
    await user.upload(fileInput, validFile);

    await user.click(screen.getByRole("button", { name: /parse & stage with llm/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /review extracted resume draft/i })
      ).toBeInTheDocument();
    });

    const discardBtn = screen.getByRole("button", { name: /discard draft/i });
    await user.click(discardBtn);

    // Returns to upload stage
    expect(screen.getByRole("heading", { name: /import pdf resume/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/select pdf resume file/i)).toBeInTheDocument();
  });

  it("passes axe-core accessibility audit with zero violations", async () => {
    const { wrapper } = createWrapper();
    const { container } = render(
      <ImportPDFDialog
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper }
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
