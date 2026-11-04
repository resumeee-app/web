import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { ExportToolbar } from "./export-toolbar";
import { TooltipProvider } from "@/components/ui/tooltip";

describe("ExportToolbar Component", () => {
  const defaultProps = {
    htmlDownloadUrl: "/api/v1/branches/b-1/versions/1/export?format=html",
    textDownloadUrl: "/api/v1/branches/b-1/versions/1/export?format=text",
    jsonResumeDownloadUrl: "/api/v1/branches/b-1/versions/1/export?format=jsonresume",
    branchName: "Stripe - Staff Backend Engineer",
    versionNumber: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWithProviders(ui: React.ReactElement) {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
  }

  it("renders export toolbar with accessible download buttons", () => {
    renderWithProviders(<ExportToolbar {...defaultProps} />);

    expect(screen.getByRole("toolbar", { name: /resume export actions/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /download plain text/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /export json resume/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /download html/i })).toBeInTheDocument();
  });

  it("does not render Print to PDF or Copy Plain Text actions (deleted per spec)", () => {
    renderWithProviders(<ExportToolbar {...defaultProps} />);

    expect(screen.queryByRole("button", { name: /print to pdf/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy plain text/i })).not.toBeInTheDocument();
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

  it("provides valid download link and download filename for HTML export", () => {
    renderWithProviders(<ExportToolbar {...defaultProps} />);

    const downloadLink = screen.getByRole("link", { name: /download html/i });
    expect(downloadLink).toHaveAttribute("href", defaultProps.htmlDownloadUrl);
    expect(downloadLink).toHaveAttribute("download", "resume-Stripe---Staff-Backend-Engineer-v1.html");
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = renderWithProviders(<ExportToolbar {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
