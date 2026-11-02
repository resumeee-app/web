import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import {
  TemplatePreviewPane,
  buildPreformattedPreviewDocument,
} from "./template-preview-pane";
import { validateGoTemplateSyntax } from "./template-code-editor";

describe("TemplatePreviewPane Component", () => {
  const defaultProps = {
    htmlTemplate: "<h1>{{.FullName}}</h1><p>{{.Headline}}</p>",
    cssStyles: "h1 { color: #2563eb; }",
    markdownTemplate: "# {{.FullName}}\n{{.Headline}}",
    textTemplate: "{{.FullName}}\n{{.Headline}}",
  };

  it("renders live rendered preview with HTML format by default inside sandboxed iframe", () => {
    render(<TemplatePreviewPane {...defaultProps} />);

    expect(screen.getByText("Live Rendered Preview")).toBeInTheDocument();

    const htmlBtn = screen.getByRole("button", { name: /^html$/i });
    expect(htmlBtn).toHaveAttribute("aria-pressed", "true");

    const iframe = screen.getByTitle("Template Preview");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("sandbox", "");
    expect(iframe.getAttribute("sandbox")).not.toContain("allow-scripts");
    expect(iframe.getAttribute("sandbox")).not.toContain("allow-same-origin");

    // The srcDoc contains the interpolated HTML and CSS
    const srcDoc = iframe.getAttribute("srcdoc") || "";
    expect(srcDoc).toContain("Alex Morgan");
    expect(srcDoc).toContain("Staff Software Engineer & Cloud Architect");
    expect(srcDoc).toContain("h1 { color: #2563eb; }");
  });

  it("switches format to Markdown and Plain Text in uncontrolled mode", async () => {
    const user = userEvent.setup();
    render(<TemplatePreviewPane {...defaultProps} />);

    const mdBtn = screen.getByRole("button", { name: /^markdown$/i });
    await user.click(mdBtn);

    expect(mdBtn).toHaveAttribute("aria-pressed", "true");
    const iframe = screen.getByTitle("Template Preview");
    let srcDoc = iframe.getAttribute("srcdoc") || "";
    expect(srcDoc).toContain("Markdown Source Preview");
    expect(srcDoc).toContain("# Alex Morgan");

    const textBtn = screen.getByRole("button", { name: /^text$/i });
    await user.click(textBtn);

    expect(textBtn).toHaveAttribute("aria-pressed", "true");
    srcDoc = iframe.getAttribute("srcdoc") || "";
    expect(srcDoc).toContain("Plain Text (ATS) Preview");
    expect(srcDoc).toContain("Alex Morgan\nStaff Software Engineer &amp; Cloud Architect");
  });

  it("respects controlled format and triggers onFormatChange callback", async () => {
    const user = userEvent.setup();
    const handleFormatChange = vi.fn();

    const { rerender } = render(
      <TemplatePreviewPane
        {...defaultProps}
        format="html"
        onFormatChange={handleFormatChange}
      />
    );

    const mdBtn = screen.getByRole("button", { name: /^markdown$/i });
    await user.click(mdBtn);

    expect(handleFormatChange).toHaveBeenCalledWith("markdown");

    // Re-render as controlled format "markdown"
    rerender(
      <TemplatePreviewPane
        {...defaultProps}
        format="markdown"
        onFormatChange={handleFormatChange}
      />
    );

    const iframe = screen.getByTitle("Template Preview");
    const srcDoc = iframe.getAttribute("srcdoc") || "";
    expect(srcDoc).toContain("Markdown Source Preview");
  });

  it("displays debouncing indicator when isDebouncing is true", () => {
    render(<TemplatePreviewPane {...defaultProps} isDebouncing={true} />);
    expect(screen.getByText("Updating...")).toBeInTheDocument();
  });

  it("passes automated axe accessibility audit with 0 violations", async () => {
    const { container } = render(<TemplatePreviewPane {...defaultProps} />);
    const results = await axe(container, { iframes: false });
    expect(results).toHaveNoViolations();
  });
});

describe("buildPreformattedPreviewDocument Helper", () => {
  it("generates valid sanitized preformatted HTML document with escaped content", () => {
    const doc = buildPreformattedPreviewDocument(
      "Test Title <script>",
      "Badge <&>",
      "<div>Dangerous & Special Characters</div>"
    );

    expect(doc).toContain("<title>Test Title &lt;script&gt;</title>");
    expect(doc).toContain("Badge &lt;&amp;&gt;");
    expect(doc).toContain("&lt;div&gt;Dangerous &amp; Special Characters&lt;/div&gt;");
    expect(doc).toContain("<!DOCTYPE html>");
    expect(doc).toContain("<pre>");
  });
});

describe("validateGoTemplateSyntax Helper Edge Cases", () => {
  it("returns null for empty or whitespace-only template content", () => {
    expect(validateGoTemplateSyntax("")).toBeNull();
    expect(validateGoTemplateSyntax("   ")).toBeNull();
  });

  it("returns null for valid Go template with standard variables and escaped actions", () => {
    const validCode = `
      <h1>{{.FullName}}</h1>
      <p>{{.Headline}}</p>
      {{if .Email}}
        <span>{{.Email}}</span>
      {{end}}
      {{range .Experience}}
        <div>{{.Title}} at {{.Company}}</div>
      {{end}}
    `;
    expect(validateGoTemplateSyntax(validCode)).toBeNull();
  });

  it("detects unclosed template action tags {{ without }}", () => {
    const unclosedTag = "<h1>{{.FullName</h1>";
    const diag = validateGoTemplateSyntax(unclosedTag);
    expect(diag).not.toBeNull();
    expect(diag?.line).toBe(1);
    expect(diag?.column).toBe(5);
    expect(diag?.message).toContain('Unclosed template action "{{"');
  });

  it("detects unexpected {{end}} without opening block", () => {
    const orphanEnd = "{{.FullName}}\n{{end}}";
    const diag = validateGoTemplateSyntax(orphanEnd);
    expect(diag).not.toBeNull();
    expect(diag?.line).toBe(2);
    expect(diag?.message).toContain('Unexpected "{{end}}" with no matching opening block');
  });

  it("detects unclosed if block", () => {
    const unclosedIf = "{{if .Email}}\n<span>{{.Email}}</span>";
    const diag = validateGoTemplateSyntax(unclosedIf);
    expect(diag).not.toBeNull();
    expect(diag?.line).toBe(1);
    expect(diag?.message).toContain('Unclosed condition or block "{{if}}"');
  });

  it("detects unclosed range, with, block, and define structures", () => {
    expect(validateGoTemplateSyntax("{{range .Skills}}{{.}}")?.message).toContain(
      'Unclosed condition or block "{{range}}"'
    );
    expect(validateGoTemplateSyntax("{{with .Location}}{{.City}}")?.message).toContain(
      'Unclosed condition or block "{{with}}"'
    );
    expect(validateGoTemplateSyntax('{{block "content" .}}hello')?.message).toContain(
      'Unclosed condition or block "{{block}}"'
    );
    expect(validateGoTemplateSyntax('{{define "header"}}header text')?.message).toContain(
      'Unclosed condition or block "{{define}}"'
    );
  });

  it("handles nested blocks properly and detects inner or outer imbalances", () => {
    const nestedValid = `
      {{if .HasSkills}}
        {{range .Skills}}
          {{with .Details}}
            {{.Description}}
          {{end}}
        {{end}}
      {{end}}
    `;
    expect(validateGoTemplateSyntax(nestedValid)).toBeNull();

    const nestedMissingEnd = `
      {{if .HasSkills}}
        {{range .Skills}}
          {{with .Details}}
            {{.Description}}
          {{end}}
        {{end}}
    `;
    const diag = validateGoTemplateSyntax(nestedMissingEnd);
    expect(diag).not.toBeNull();
    expect(diag?.message).toContain('Unclosed condition or block "{{if}}"');
  });
});
