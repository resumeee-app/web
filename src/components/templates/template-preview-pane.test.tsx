import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  TemplatePreviewPane,
  buildPreformattedPreviewDocument,
} from "./template-preview-pane";
import { validateGoTemplateSyntax } from "./template-code-editor";
import { api } from "@/api/client";

vi.mock("@/api/client", () => ({
  API_BASE_URL: "/api/v1",
  api: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("TemplatePreviewPane Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockServerRenderOutput = {
    html: "<h1>Jane Doe</h1><p>Staff Software Engineer</p>",
    markdown: "# Jane Doe\nStaff Software Engineer",
    plain_text: "Jane Doe\nStaff Software Engineer",
  };

  const defaultProps = {
    htmlTemplate: "<h1>{{.FullName}}</h1><p>{{.Headline}}</p>",
    cssStyles: "h1 { color: #2563eb; }",
    markdownTemplate: "# {{.FullName}}\n{{.Headline}}",
    textTemplate: "{{.FullName}}\n{{.Headline}}",
    initialRenderOutput: mockServerRenderOutput,
  };

  it("renders live rendered preview with HTML format by default inside sandboxed iframe using server values", () => {
    const wrapper = createWrapper();
    render(<TemplatePreviewPane {...defaultProps} />, { wrapper });

    expect(screen.getByText("Live Rendered Preview")).toBeInTheDocument();

    const htmlBtn = screen.getByRole("button", { name: /^html$/i });
    expect(htmlBtn).toHaveAttribute("aria-pressed", "true");

    const iframe = screen.getByTitle("Template Preview");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("sandbox", "");
    expect(iframe.getAttribute("sandbox")).not.toContain("allow-scripts");
    expect(iframe.getAttribute("sandbox")).not.toContain("allow-same-origin");

    // The srcDoc contains the server-rendered HTML and CSS
    const srcDoc = iframe.getAttribute("srcdoc") || "";
    expect(srcDoc).toContain("Jane Doe");
    expect(srcDoc).toContain("Staff Software Engineer");
    expect(srcDoc).toContain("h1 { color: #2563eb; }");
  });

  it("switches format to Markdown and Plain Text in uncontrolled mode", async () => {
    const user = userEvent.setup();
    const wrapper = createWrapper();
    render(<TemplatePreviewPane {...defaultProps} />, { wrapper });

    const mdBtn = screen.getByRole("button", { name: /^markdown$/i });
    await user.click(mdBtn);

    expect(mdBtn).toHaveAttribute("aria-pressed", "true");
    const iframe = screen.getByTitle("Template Preview");
    let srcDoc = iframe.getAttribute("srcdoc") || "";
    expect(srcDoc).toContain("Markdown Source Preview");
    expect(srcDoc).toContain("# Jane Doe");

    const textBtn = screen.getByRole("button", { name: /^text$/i });
    await user.click(textBtn);

    expect(textBtn).toHaveAttribute("aria-pressed", "true");
    srcDoc = iframe.getAttribute("srcdoc") || "";
    expect(srcDoc).toContain("Plain Text (ATS) Preview");
    expect(srcDoc).toContain("Jane Doe\nStaff Software Engineer");
  });

  it("respects controlled format and triggers onFormatChange callback", async () => {
    const user = userEvent.setup();
    const handleFormatChange = vi.fn();
    const wrapper = createWrapper();

    const { rerender } = render(
      <TemplatePreviewPane
        {...defaultProps}
        format="html"
        onFormatChange={handleFormatChange}
      />,
      { wrapper }
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
    const wrapper = createWrapper();
    render(<TemplatePreviewPane {...defaultProps} isDebouncing={true} />, { wrapper });
    expect(screen.getByText("Updating...")).toBeInTheDocument();
  });

  it("displays server syntax error in role='alert' callout banner", async () => {
    vi.mocked(api.POST).mockResolvedValueOnce({
      data: undefined,
      error: {
        error: {
          code: "TEMPLATE_VALIDATION_ERROR",
          message: "template: :1: function 'unknown' not defined",
          details: "template: :1: function 'unknown' not defined",
        },
      },
      response: new Response(null, { status: 422 }),
    } as unknown as Awaited<ReturnType<typeof api.POST>>);

    const wrapper = createWrapper();
    render(
      <TemplatePreviewPane
        htmlTemplate="<h1>{{unknown .FullName}}</h1>"
        isDebouncing={false}
      />,
      { wrapper }
    );

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent("Template Syntax Error");
    });
  });

  it("fetches preview via useTemplatePreview when templateId is provided without inline templates", async () => {
    vi.mocked(api.GET).mockResolvedValueOnce({
      data: {
        html: "<h1>Fetched Template</h1><p>Fetched Headline</p>",
        markdown: "# Fetched Template\nFetched Headline",
        plain_text: "Fetched Template | Fetched Headline",
      },
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as unknown as Awaited<ReturnType<typeof api.GET>>);

    const wrapper = createWrapper();
    render(<TemplatePreviewPane templateId="test-tmpl-123" />, { wrapper });

    await waitFor(() => {
      const iframe = screen.getByTitle("Template Preview");
      const srcDoc = iframe.getAttribute("srcdoc") || "";
      expect(srcDoc).toContain("Fetched Template");
      expect(srcDoc).toContain("Fetched Headline");
    });
    expect(api.GET).toHaveBeenCalledWith("/templates/{id}/preview", {
      params: { path: { id: "test-tmpl-123" } },
    });
  });

  it("immediately renders cached saved template preview on remount without blank flash", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    queryClient.setQueryData(["templates", "cached-tmpl-999", "preview"], {
      html: "<h1>Cached Template Title</h1>",
      markdown: "# Cached Template Title",
      plain_text: "Cached Template Title",
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    // Initial render should immediately contain cached HTML without waiting for useEffect
    render(<TemplatePreviewPane templateId="cached-tmpl-999" />, { wrapper });

    const iframe = screen.getByTitle("Template Preview");
    const srcDoc = iframe.getAttribute("srcdoc") || "";
    expect(srcDoc).toContain("Cached Template Title");
    expect(srcDoc).not.toContain("No HTML output available");
  });

  it("renders empty state placeholder when rendered output contains empty HTML", () => {
    const wrapper = createWrapper();
    render(
      <TemplatePreviewPane
        initialRenderOutput={{
          html: "",
          markdown: "",
          plain_text: "",
        }}
      />,
      { wrapper }
    );

    const iframe = screen.getByTitle("Template Preview");
    const srcDoc = iframe.getAttribute("srcdoc") || "";
    expect(srcDoc).toContain("No HTML output available");
  });

  it("passes automated axe accessibility audit with 0 violations", async () => {
    const wrapper = createWrapper();
    const { container } = render(<TemplatePreviewPane {...defaultProps} />, { wrapper });
    await waitFor(() => {
      expect(screen.getByTitle("Template Preview")).toBeInTheDocument();
    });
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
