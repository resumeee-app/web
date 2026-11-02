/**
 * @file template-preview-pane.tsx
 * @description Renders live previews of resume templates inside a strictly sandboxed iframe.
 * Supports HTML with injected CSS styles, Markdown source previews, and Plain Text (ATS) formats.
 *
 * Security Invariant:
 * The template preview is rendered into an `<iframe>` configured strictly with `sandbox=""`
 * (omitting `allow-scripts`, `allow-same-origin`, and `allow-popups`). This prevents any
 * script execution, cookie access, or host DOM traversal from user-supplied templates.
 * Never uses `dangerouslySetInnerHTML`.
 *
 * Accessibility & WAI-ARIA Considerations:
 * - Format toggle group uses semantic ARIA attributes (`role="group"` with `aria-label`).
 * - Format toggle buttons use `aria-pressed` to indicate the currently selected preview format.
 * - The preview iframe contains a descriptive `title="Template Preview"`.
 */

import * as React from "react";
import { Eye, FileCode, FileText, Code } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Props for the TemplatePreviewPane component.
 */
export interface TemplatePreviewPaneProps {
  /** Raw Go HTML template source code. */
  htmlTemplate?: string;
  /** Custom CSS stylesheet injected into the HTML preview. */
  cssStyles?: string;
  /** Raw Go Markdown template source code. */
  markdownTemplate?: string;
  /** Raw Go Plain Text template source code. */
  textTemplate?: string;
  /** Active format to display ("html" | "markdown" | "text"). */
  format?: "html" | "markdown" | "text";
  /** Callback fired when the user selects a different format tab. */
  onFormatChange?: (format: "html" | "markdown" | "text") => void;
  /** Optional custom CSS classes for the container. */
  className?: string;
  /** Boolean flag indicating that editor input is currently being debounced. */
  isDebouncing?: boolean;
}

/**
 * Representative sample career and personal data used for realistic live resume previews.
 */
const SAMPLE_DATA = {
  FullName: "Alex Morgan",
  Headline: "Staff Software Engineer & Cloud Architect",
  Email: "alex.morgan@example.com",
  Phone: "+1 (555) 019-2834",
  Website: "https://alexmorgan.dev",
  Location: {
    City: "San Francisco",
    Region: "CA",
    CountryCode: "US",
  },
  Summary:
    "Versatile engineering leader with 10+ years specializing in distributed systems, cloud infrastructure, and developer platforms.",
};

/**
 * Client-side helper that safely interpolates sample data into Go template placeholders
 * for realistic live preview rendering.
 *
 * @param rawTemplate - The raw Go template string containing placeholders.
 * @param cssStyles - Optional CSS styles to inject for the `{{.CSSStyles}}` placeholder.
 * @returns The populated string with substituted variables and evaluated simple conditions.
 */
function interpolateTemplate(rawTemplate: string, cssStyles: string = ""): string {
  if (!rawTemplate) return "";

  let result = rawTemplate;

  // Substitute CSS styles
  result = result.replace(/\{\{\.CSSStyles\}\}/g, cssStyles);

  // Substitute core variables
  result = result.replace(/\{\{\.FullName\}\}/g, SAMPLE_DATA.FullName);
  result = result.replace(/\{\{\.Headline\}\}/g, SAMPLE_DATA.Headline);
  result = result.replace(/\{\{\.Email\}\}/g, SAMPLE_DATA.Email);
  result = result.replace(/\{\{\.Phone\}\}/g, SAMPLE_DATA.Phone);
  result = result.replace(/\{\{\.Website\}\}/g, SAMPLE_DATA.Website);
  result = result.replace(/\{\{\.Location\.City\}\}/g, SAMPLE_DATA.Location.City);
  result = result.replace(/\{\{\.Location\.Region\}\}/g, SAMPLE_DATA.Location.Region);
  result = result.replace(/\{\{\.Location\.CountryCode\}\}/g, SAMPLE_DATA.Location.CountryCode);
  result = result.replace(/\{\{\.Summary\}\}/g, SAMPLE_DATA.Summary);

  // Evaluate simple truthy conditionals: {{if .Headline}}...{{end}}
  result = result.replace(/\{\{if\s+\.\w+\}\}([\s\S]*?)\{\{end\}\}/g, "$1");

  // Remove remaining unhandled template tags gracefully for preview
  result = result.replace(/\{\{[\s\S]*?\}\}/g, "");

  return result;
}

/**
 * Helper to encode raw text safely inside HTML `<pre>` tags.
 *
 * @param str - The raw text string to escape.
 * @returns The escaped HTML entity string.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Builds a sanitized, preformatted HTML document wrapper for Markdown or Plain Text preview.
 *
 * @param title - The HTML document title.
 * @param badge - The header badge text displayed above the preformatted content.
 * @param content - The pre-interpolated text or markdown content to display.
 * @returns The complete sanitized HTML document string.
 */
export function buildPreformattedPreviewDocument(
  title: string,
  badge: string,
  content: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 24px; color: #1e293b; background: #ffffff; }
    pre { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; background: #f8fafc; padding: 16px; border-radius: 6px; border: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px;">${escapeHtml(badge)}</div>
  <pre>${escapeHtml(content)}</pre>
</body>
</html>`;
}

/**
 * Live template preview pane using a sandboxed iframe.
 *
 * Architectural Role:
 * Provides immediate visual feedback in the template editor split-screen layout
 * and gallery preview dialogs without executing arbitrary scripts.
 *
 * @param props - Component props satisfying TemplatePreviewPaneProps.
 * @returns JSX element representing the sandboxed preview pane.
 */
export const TemplatePreviewPane: React.FC<TemplatePreviewPaneProps> = ({
  htmlTemplate = "",
  cssStyles = "",
  markdownTemplate = "",
  textTemplate = "",
  format: controlledFormat,
  onFormatChange,
  className,
  isDebouncing = false,
}) => {
  const [internalFormat, setInternalFormat] = React.useState<"html" | "markdown" | "text">("html");
  const activeFormat = controlledFormat ?? internalFormat;

  const handleFormatClick = (fmt: "html" | "markdown" | "text") => {
    if (onFormatChange) {
      onFormatChange(fmt);
    } else {
      setInternalFormat(fmt);
    }
  };

  const previewDocument = React.useMemo(() => {
    if (activeFormat === "html") {
      const renderedBody = interpolateTemplate(htmlTemplate, cssStyles);
      const customStyles = cssStyles ? `<style>${cssStyles}</style>` : "";

      // If template is already a full HTML document, ensure styles are injected
      if (renderedBody.toLowerCase().includes("<html")) {
        if (!renderedBody.includes(customStyles)) {
          return renderedBody.replace("</head>", `${customStyles}</head>`);
        }
        return renderedBody;
      }

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Preview</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 24px; color: #1e293b; background: #ffffff; line-height: 1.5; }
    h1 { margin-top: 0; color: #0f172a; }
  </style>
  ${customStyles}
</head>
<body>
  ${renderedBody}
</body>
</html>`;
    }

    if (activeFormat === "markdown") {
      const renderedMd = interpolateTemplate(markdownTemplate);
      return buildPreformattedPreviewDocument(
        "Markdown Preview",
        "Markdown Source Preview",
        renderedMd
      );
    }

    // Plain text format
    const renderedTxt = interpolateTemplate(textTemplate);
    return buildPreformattedPreviewDocument(
      "Plain Text Preview",
      "Plain Text (ATS) Preview",
      renderedTxt
    );
  }, [activeFormat, htmlTemplate, cssStyles, markdownTemplate, textTemplate]);

  return (
    <div
      className={cn(
        "flex flex-col h-full rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shadow-sm",
        className
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center space-x-2 text-sm font-semibold text-slate-800">
          <Eye className="h-4 w-4 text-indigo-600" aria-hidden="true" />
          <span>Live Rendered Preview</span>
          {isDebouncing && (
            <span className="text-xs font-normal text-slate-400 italic">Updating...</span>
          )}
        </div>

        {/* Format Selector */}
        <div
          role="group"
          aria-label="Preview Output Format"
          className="inline-flex rounded-md bg-slate-100 p-0.5"
        >
          <button
            type="button"
            onClick={() => handleFormatClick("html")}
            aria-pressed={activeFormat === "html"}
            className={cn(
              "flex items-center space-x-1 rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              activeFormat === "html"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Code className="h-3 w-3" aria-hidden="true" />
            <span>HTML</span>
          </button>
          <button
            type="button"
            onClick={() => handleFormatClick("markdown")}
            aria-pressed={activeFormat === "markdown"}
            className={cn(
              "flex items-center space-x-1 rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              activeFormat === "markdown"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <FileCode className="h-3 w-3" aria-hidden="true" />
            <span>Markdown</span>
          </button>
          <button
            type="button"
            onClick={() => handleFormatClick("text")}
            aria-pressed={activeFormat === "text"}
            className={cn(
              "flex items-center space-x-1 rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              activeFormat === "text"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <FileText className="h-3 w-3" aria-hidden="true" />
            <span>Text</span>
          </button>
        </div>
      </div>

      {/* Sandboxed iframe container - strictly sandbox="" (no allow-scripts), srcdoc only */}
      <div className="relative flex-1 bg-white p-2">
        <iframe
          srcDoc={previewDocument}
          sandbox=""
          title="Template Preview"
          className="h-full w-full min-h-[380px] rounded border border-slate-200 bg-white shadow-inner"
        />
      </div>
    </div>
  );
};
