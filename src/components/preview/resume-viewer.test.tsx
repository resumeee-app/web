import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ResumeViewer } from "./resume-viewer";

describe("ResumeViewer Component", () => {
  const mockHtml = "<!DOCTYPE html><html><body><h1>Jane Doe</h1><p>Software Engineer</p></body></html>";
  const mockPlainText = "Jane Doe\nSoftware Engineer\nBuilt large-scale applications";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sandboxed iframe with srcdoc and accessible title", () => {
    render(<ResumeViewer htmlContent={mockHtml} plainTextContent={mockPlainText} />);

    const iframe = screen.getByTitle("Rendered Resume Preview");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("srcdoc", mockHtml);
    // Verified sandbox attribute without allow-scripts
    expect(iframe).toHaveAttribute("sandbox");
    expect(iframe.getAttribute("sandbox")).not.toMatch(/allow-scripts/);
  });

  it("toggles between HTML and Plain Text views", async () => {
    const user = userEvent.setup();
    render(<ResumeViewer htmlContent={mockHtml} plainTextContent={mockPlainText} />);

    // Initially in HTML mode
    expect(screen.getByTitle("Rendered Resume Preview")).toBeInTheDocument();

    // Switch to Plain Text mode
    const textToggle = screen.getByRole("radio", { name: /plain text/i });
    await user.click(textToggle);

    expect(screen.queryByTitle("Rendered Resume Preview")).not.toBeInTheDocument();
    const plainTextElement = screen.getByLabelText(/plain text resume/i);
    expect(plainTextElement).toBeInTheDocument();
    expect(plainTextElement).toHaveTextContent("Jane Doe");
    expect(plainTextElement).toHaveTextContent("Built large-scale applications");
  });

  it("supports zoom controls (fit-to-width, 100%, 75%)", async () => {
    const user = userEvent.setup();
    render(<ResumeViewer htmlContent={mockHtml} plainTextContent={mockPlainText} />);

    const zoom75 = screen.getByRole("button", { name: /zoom 75%/i });
    const zoom100 = screen.getByRole("button", { name: /zoom 100%/i });
    const zoomFit = screen.getByRole("button", { name: /fit to width/i });

    expect(zoom75).toBeInTheDocument();
    expect(zoom100).toBeInTheDocument();
    expect(zoomFit).toBeInTheDocument();

    const pagePaper = screen.getByTestId("resume-page-paper");
    expect(pagePaper).toHaveAttribute("data-zoom", "100%");

    await user.click(zoom75);
    expect(pagePaper).toHaveAttribute("data-zoom", "75%");

    await user.click(zoomFit);
    expect(pagePaper).toHaveAttribute("data-zoom", "fit");
  });

  it("supports page layout toggle (Letter vs A4) with boundary indicators", async () => {
    const user = userEvent.setup();
    render(<ResumeViewer htmlContent={mockHtml} plainTextContent={mockPlainText} />);

    const layoutA4 = screen.getByRole("button", { name: /switch to a4 layout/i });
    const pagePaper = screen.getByTestId("resume-page-paper");
    expect(pagePaper).toHaveAttribute("data-layout", "letter");

    await user.click(layoutA4);
    expect(pagePaper).toHaveAttribute("data-layout", "a4");

    const layoutLetter = screen.getByRole("button", { name: /switch to letter layout/i });
    await user.click(layoutLetter);
    expect(pagePaper).toHaveAttribute("data-layout", "letter");
  });

  it("renders empty state when no resume content is provided", () => {
    render(<ResumeViewer htmlContent="" plainTextContent="" />);

    expect(screen.getByText(/no rendered resume output available/i)).toBeInTheDocument();
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = render(
      <ResumeViewer htmlContent={mockHtml} plainTextContent={mockPlainText} />
    );
    // In jsdom, cross-frame messaging for iframes is not supported by axe-core
    const results = await axe(container, { iframes: false });
    expect(results).toHaveNoViolations();
  });
});
