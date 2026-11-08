import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ExportToolbar } from "./export-toolbar";
import { TooltipProvider } from "@/components/ui/tooltip";

describe("ExportToolbar Component", () => {
  const defaultProps = {
    htmlDownloadUrl: "/api/v1/branches/b-1/versions/1/export?format=html",
    markdownDownloadUrl: "/api/v1/branches/b-1/versions/1/export?format=markdown",
    textDownloadUrl: "/api/v1/branches/b-1/versions/1/export?format=text",
    jsonResumeDownloadUrl: "/api/v1/branches/b-1/versions/1/export?format=jsonresume",
    markdownContent: "# Stripe - Staff Backend Engineer\n\n- Built distributed systems",
    plainTextContent: "Stripe - Staff Backend Engineer\nBuilt distributed systems",
    branchName: "Stripe - Staff Backend Engineer",
    versionNumber: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWithProviders(ui: React.ReactElement) {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
  }

  it("renders export toolbar with accessible download links and copy buttons", () => {
    renderWithProviders(<ExportToolbar {...defaultProps} />);

    expect(screen.getByRole("toolbar", { name: /resume export actions/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /download html/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /download markdown/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /download plain text/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /export json resume/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy markdown/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy plain text/i })).toBeInTheDocument();
  });

  it("provides valid download link and download filename for HTML export", () => {
    renderWithProviders(<ExportToolbar {...defaultProps} />);

    const downloadLink = screen.getByRole("link", { name: /download html/i });
    expect(downloadLink).toHaveAttribute("href", defaultProps.htmlDownloadUrl);
    expect(downloadLink).toHaveAttribute("download", "resume-Stripe---Staff-Backend-Engineer-v1.html");
  });

  it("provides valid download link and filename for Markdown export", () => {
    renderWithProviders(<ExportToolbar {...defaultProps} />);

    const markdownLink = screen.getByRole("link", { name: /download markdown/i });
    expect(markdownLink).toHaveAttribute("href", defaultProps.markdownDownloadUrl);
    expect(markdownLink).toHaveAttribute("download", "resume-Stripe---Staff-Backend-Engineer-v1.md");
  });

  it("provides valid download link and filename for Plain Text export", () => {
    renderWithProviders(<ExportToolbar {...defaultProps} />);

    const textLink = screen.getByRole("link", { name: /download plain text/i });
    expect(textLink).toHaveAttribute("href", defaultProps.textDownloadUrl);
    expect(textLink).toHaveAttribute("download", "resume-Stripe---Staff-Backend-Engineer-v1.txt");
  });

  it("provides valid download link and filename for JSON Resume export", () => {
    renderWithProviders(<ExportToolbar {...defaultProps} />);

    const jsonLink = screen.getByRole("link", { name: /export json resume/i });
    expect(jsonLink).toHaveAttribute("href", defaultProps.jsonResumeDownloadUrl);
    expect(jsonLink).toHaveAttribute("download", "resume-Stripe---Staff-Backend-Engineer-v1.json");
  });

  it("copies plain text to clipboard and reflects copied feedback", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    renderWithProviders(<ExportToolbar {...defaultProps} />);

    const copyBtn = screen.getByRole("button", { name: /copy plain text/i });
    await user.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(defaultProps.plainTextContent);
    expect(screen.getByRole("button", { name: /plain text copied/i })).toBeInTheDocument();
  });

  it("copies markdown to clipboard and reflects copied feedback", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    renderWithProviders(<ExportToolbar {...defaultProps} />);

    const copyBtn = screen.getByRole("button", { name: /copy markdown/i });
    await user.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(defaultProps.markdownContent);
    expect(screen.getByRole("button", { name: /markdown copied/i })).toBeInTheDocument();
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = renderWithProviders(<ExportToolbar {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
