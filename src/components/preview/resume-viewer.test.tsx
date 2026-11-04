import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ResumeViewer } from "./resume-viewer";

describe("ResumeViewer Component", () => {
  const mockHtml = "<!DOCTYPE html><html><body><h1>Jane Doe</h1><p>Software Engineer</p></body></html>";
  const mockMarkdown = "# Jane Doe\n\n**Software Engineer**\n\n- Built large-scale applications";
  const mockPlainText = "Jane Doe\nSoftware Engineer\nBuilt large-scale applications";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sandboxed iframe with srcdoc and accessible title", () => {
    render(
      <ResumeViewer
        htmlContent={mockHtml}
        markdownContent={mockMarkdown}
        plainTextContent={mockPlainText}
      />
    );

    const iframe = screen.getByTitle("Rendered Resume Preview");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("srcdoc", mockHtml);
    // Verified sandbox attribute without allow-scripts
    expect(iframe).toHaveAttribute("sandbox");
    expect(iframe.getAttribute("sandbox")).not.toMatch(/allow-scripts/);
  });

  it("toggles between HTML, Markdown, and Plain Text views", async () => {
    const user = userEvent.setup();
    render(
      <ResumeViewer
        htmlContent={mockHtml}
        markdownContent={mockMarkdown}
        plainTextContent={mockPlainText}
      />
    );

    // Initially in HTML mode
    expect(screen.getByTitle("Rendered Resume Preview")).toBeInTheDocument();

    // Switch to Markdown mode
    const markdownToggle = screen.getByRole("radio", { name: /markdown/i });
    await user.click(markdownToggle);

    expect(screen.queryByTitle("Rendered Resume Preview")).not.toBeInTheDocument();
    const markdownElement = screen.getByLabelText(/markdown resume/i);
    expect(markdownElement).toBeInTheDocument();
    expect(markdownElement).toHaveTextContent("# Jane Doe");

    // Switch to Plain Text mode
    const textToggle = screen.getByRole("radio", { name: /plain text/i });
    await user.click(textToggle);

    expect(screen.queryByLabelText(/markdown resume/i)).not.toBeInTheDocument();
    const plainTextElement = screen.getByLabelText(/plain text resume/i);
    expect(plainTextElement).toBeInTheDocument();
    expect(plainTextElement).toHaveTextContent("Jane Doe");
    expect(plainTextElement).toHaveTextContent("Built large-scale applications");
  });

  it("supports page layout toggle (Letter vs A4) and resizes both width and height", async () => {
    const user = userEvent.setup();
    render(
      <ResumeViewer
        htmlContent={mockHtml}
        markdownContent={mockMarkdown}
        plainTextContent={mockPlainText}
      />
    );

    const pagePaper = screen.getByTestId("resume-page-paper");
    // Initially Letter layout: width 816px, height 1056px
    expect(pagePaper).toHaveAttribute("data-layout", "letter");
    expect(pagePaper.className).toMatch(/w-\[816px\]/);
    expect(pagePaper.className).toMatch(/min-h-\[1056px\]/);

    // Switch to A4 layout: width 794px, height 1123px
    const layoutA4 = screen.getByRole("button", { name: /switch to a4 layout/i });
    await user.click(layoutA4);

    expect(pagePaper).toHaveAttribute("data-layout", "a4");
    expect(pagePaper.className).toMatch(/w-\[794px\]/);
    expect(pagePaper.className).toMatch(/min-h-\[1123px\]/);

    // Switch back to Letter
    const layoutLetter = screen.getByRole("button", { name: /switch to letter layout/i });
    await user.click(layoutLetter);
    expect(pagePaper).toHaveAttribute("data-layout", "letter");
    expect(pagePaper.className).toMatch(/w-\[816px\]/);
    expect(pagePaper.className).toMatch(/min-h-\[1056px\]/);
  });

  it("does not render zoom controls (deleted per spec)", () => {
    render(
      <ResumeViewer
        htmlContent={mockHtml}
        markdownContent={mockMarkdown}
        plainTextContent={mockPlainText}
      />
    );

    expect(screen.queryByRole("button", { name: /zoom/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /fit to width/i })).not.toBeInTheDocument();
  });

  it("renders empty state when no resume content is provided", () => {
    render(<ResumeViewer htmlContent="" markdownContent="" plainTextContent="" />);

    expect(screen.getByText(/no rendered resume output available/i)).toBeInTheDocument();
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = render(
      <ResumeViewer
        htmlContent={mockHtml}
        markdownContent={mockMarkdown}
        plainTextContent={mockPlainText}
      />
    );
    // In jsdom, cross-frame messaging for iframes is not supported by axe-core
    const results = await axe(container, { iframes: false });
    expect(results).toHaveNoViolations();
  });
});
