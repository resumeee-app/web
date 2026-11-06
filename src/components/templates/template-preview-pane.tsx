/**
 * @file template-preview-pane.tsx
 * @description Renders live previews of resume templates inside a strictly sandboxed iframe.
 * All formatting and variable interpolation is executed server-side via Go templates.
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
 * - Syntax errors returned by the server are announced via `role="alert"`.
 */

import * as React from "react";
import { Eye, FileCode, FileText, Code, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useTemplatePreview,
  useRenderTemplatePreview,
  type RenderOutput,
} from "@/api/template-queries";

/**
 * Props for the TemplatePreviewPane component.
 */
export interface TemplatePreviewPaneProps {
  /** Optional stored template ID to preview. */
  templateId?: string;
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
  /** Optional pre-rendered output for offline tests or pre-calculated server previews. */
  initialRenderOutput?: RenderOutput;
  /** Optional custom CSS classes for the container. */
  className?: string;
  /** Boolean flag indicating that editor input is currently being debounced. */
  isDebouncing?: boolean;
}

/**
 * Helper to encode raw text safely inside HTML `<pre>` tags.
 *
 * @param str - The raw text string to escape.
 * @returns The escaped HTML entity string.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Safely strips any `<script>` tags (including JSON-LD data islands, inline scripts,
 * and external script references) from HTML before rendering inside a sandboxed iframe.
 *
 * This prevents Chromium from logging blocked script execution warnings or aborting
 * document presentation inside strictly sandboxed iframes (`sandbox=""`).
 *
 * @param html - The raw HTML string.
 * @returns Sanitized HTML string with all script tags removed.
 */
export function stripScriptTags(html: string): string {
  if (!html) {
    return "";
  }
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi, "")
    .replace(/<script\b[^>]*\/?>/gi, "");
}

/**
 * Builds a sanitized, preformatted HTML document wrapper for Markdown or Plain Text preview.
 *
 * @param title - The HTML document title.
 * @param badge - The header badge text displayed above the preformatted content.
 * @param content - The server-rendered text or markdown content to display.
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

const FORMAT_OPTIONS = [
  { id: "html", label: "HTML", icon: Code },
  { id: "markdown", label: "Markdown", icon: FileCode },
  { id: "text", label: "Text", icon: FileText },
] as const;

/**
 * Live template preview pane using a sandboxed iframe.
 *
 * Architectural Role:
 * Renders server-computed resume template outputs without executing arbitrary scripts.
 *
 * @param props - Component props satisfying TemplatePreviewPaneProps.
 * @returns JSX element representing the sandboxed preview pane.
 */
export const TemplatePreviewPane: React.FC<TemplatePreviewPaneProps> = ({
  templateId,
  htmlTemplate,
  cssStyles = "",
  markdownTemplate,
  textTemplate,
  format: controlledFormat,
  onFormatChange,
  initialRenderOutput,
  className,
  isDebouncing = false,
}) => {
  const [internalFormat, setInternalFormat] = React.useState<"html" | "markdown" | "text">("html");
  const activeFormat = controlledFormat ?? internalFormat;

  const [draftRenderedOutput, setDraftRenderedOutput] = React.useState<RenderOutput | null>(
    initialRenderOutput ?? null
  );
  const [serverError, setServerError] = React.useState<string | null>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  // Sync initialRenderOutput if provided or updated
  React.useEffect(() => {
    if (initialRenderOutput) {
      setDraftRenderedOutput(initialRenderOutput);
    }
  }, [initialRenderOutput]);

  const hasDraftInputs =
    htmlTemplate !== undefined ||
    markdownTemplate !== undefined ||
    textTemplate !== undefined;

  // Query for saved templates
  const {
    data: savedOutput,
    isLoading: isSavedLoading,
    error: savedError,
  } = useTemplatePreview(
    !hasDraftInputs && templateId ? templateId : undefined
  );

  React.useEffect(() => {
    if (savedError) {
      setServerError(savedError.message);
    } else if (savedOutput) {
      setServerError(null);
    }
  }, [savedError, savedOutput]);

  // Mutation for draft templates (split-screen editor)
  const { mutate: renderPreviewMutation, isPending: isRenderPending } = useRenderTemplatePreview();

  React.useEffect(() => {
    if (!hasDraftInputs || isDebouncing) {
      return;
    }

    // Trigger server-side Go template execution
    renderPreviewMutation(
      {
        template_id: templateId,
        html_template: htmlTemplate ?? "",
        css_styles: cssStyles,
        markdown_template: markdownTemplate ?? "",
        text_template: textTemplate ?? "",
      },
      {
        onSuccess: (data) => {
          setDraftRenderedOutput(data);
          setServerError(null);
        },
        onError: (err) => {
          setServerError(err.message);
        },
      }
    );
  }, [
    hasDraftInputs,
    isDebouncing,
    templateId,
    htmlTemplate,
    cssStyles,
    markdownTemplate,
    textTemplate,
    renderPreviewMutation,
  ]);

  // Synchronously derive rendered output so cached queries immediately display without intermediate empty flashes
  const renderedOutput = hasDraftInputs
    ? (draftRenderedOutput ?? initialRenderOutput ?? null)
    : (savedOutput ?? draftRenderedOutput ?? initialRenderOutput ?? null);

  const handleFormatClick = (fmt: "html" | "markdown" | "text") => {
    if (onFormatChange) {
      onFormatChange(fmt);
    } else {
      setInternalFormat(fmt);
    }
  };

  const previewDocument = React.useMemo(() => {
    const htmlBody = renderedOutput?.html ?? "";
    const customStyles = cssStyles ? `<style>${cssStyles}</style>` : "";

    if (activeFormat === "html") {
      if (!htmlBody) {
        return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><style>body { font-family: sans-serif; color: #64748b; padding: 24px; }</style></head>
<body><p>No HTML output available</p></body>
</html>`;
      }

      // Strip any <script> tags (e.g. JSON-LD structured data or inline scripts)
      // to guarantee safe rendering inside strictly sandboxed iframes without script blocks.
      const sanitizedBody = stripScriptTags(htmlBody);

      if (sanitizedBody.toLowerCase().includes("<html")) {
        if (customStyles && !sanitizedBody.includes(customStyles)) {
          return sanitizedBody.replace("</head>", `${customStyles}</head>`);
        }
        return sanitizedBody;
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
  ${sanitizedBody}
</body>
</html>`;
    }

    if (activeFormat === "markdown") {
      const renderedMd = renderedOutput?.markdown ?? "";
      return buildPreformattedPreviewDocument(
        "Markdown Preview",
        "Markdown Source Preview",
        renderedMd
      );
    }

    // Plain text format
    const renderedTxt = renderedOutput?.plain_text ?? "";
    return buildPreformattedPreviewDocument(
      "Plain Text Preview",
      "Plain Text (ATS) Preview",
      renderedTxt
    );
  }, [activeFormat, renderedOutput, cssStyles]);

  // Ensure iframe element property matches previewDocument when remounted or updated
  React.useEffect(() => {
    if (iframeRef.current && previewDocument) {
      iframeRef.current.srcdoc = previewDocument;
    }
  }, [previewDocument]);

  const isLoading = (hasDraftInputs ? isRenderPending : isSavedLoading) || isDebouncing;

  return (
    <div
      className={cn(
        "flex flex-col h-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-hidden shadow-sm",
        className
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5">
        <div className="flex items-center space-x-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
          <Eye className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <span>Live Rendered Preview</span>
          {(isDebouncing || isLoading) && (
            <div className="flex items-center space-x-1 text-xs font-normal text-slate-400 dark:text-slate-500 italic">
              <Loader2 className="h-3 w-3 animate-spin text-indigo-500" aria-hidden="true" />
              <span>Updating...</span>
            </div>
          )}
        </div>

        {/* Format Selector */}
        <div
          role="group"
          aria-label="Preview Output Format"
          className="inline-flex rounded-md bg-slate-100 dark:bg-slate-800 p-0.5"
        >
          {FORMAT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = activeFormat === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleFormatClick(opt.id)}
                aria-pressed={isSelected}
                className={cn(
                  "flex items-center space-x-1 rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                  isSelected
                    ? "bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                <Icon className="h-3 w-3" aria-hidden="true" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Server Syntax Error Banner */}
      {serverError && (
        <div
          role="alert"
          className="flex items-center space-x-2 border-b border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-4 py-2 text-xs text-red-700 dark:text-red-300"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
          <span className="font-medium">Template Syntax Error: {serverError}</span>
        </div>
      )}

      {/* Sandboxed iframe container - strictly sandbox="" (no allow-scripts), srcdoc only */}
      <div className="relative flex-1 bg-white dark:bg-slate-950 p-2">
        <iframe
          key={templateId || "draft"}
          ref={iframeRef}
          srcDoc={previewDocument}
          sandbox=""
          title="Template Preview"
          className="h-full w-full min-h-[380px] rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-inner"
        />
      </div>
    </div>
  );
};
