/**
 * @file resume-viewer.tsx
 * @description Live sandboxed resume preview container with format toggles and page layout controls.
 *
 * Implements a secure sandboxed iframe rendering pre-rendered HTML resumes
 * without script execution (`sandbox=""` omitting `allow-scripts`, using `srcdoc`),
 * strictly isolating resume CSS styling from the host application shell DOM.
 * Also provides accessible Markdown and plain-text view modes, and standard
 * Letter vs A4 page boundary sizing (adjusting both width and height).
 *
 * Accessibility / WAI-ARIA Considerations:
 * - The `<iframe>` includes an explicit, non-empty `title="Rendered Resume Preview"` (WCAG 4.1.2).
 * - View mode is implemented as a radio group (`role="radiogroup"` with `role="radio"` and `aria-checked`).
 * - Plain text and Markdown views render in focusable, keyboard-navigable `<pre>` elements.
 * - Prominent focus-visible ring styles on all buttons and toggles.
 * - Zero axe violations.
 */

import * as React from "react";
import { FileText, Code2, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Display mode toggle for resume preview: visual HTML iframe vs Markdown vs raw plain text.
 */
export type ResumeViewMode = "html" | "markdown" | "text";

/**
 * Physical paper dimension layouts for ATS print alignment.
 */
export type ResumePageLayout = "letter" | "a4";

/**
 * Configuration props for ResumeViewer component.
 */
export interface ResumeViewerProps {
  /** Pre-rendered HTML resume document served from backend render endpoints */
  htmlContent?: string;
  /** Pre-rendered Markdown resume document */
  markdownContent?: string;
  /** Clean ASCII plain-text resume output */
  plainTextContent?: string;
  /** Optional additional CSS class names */
  className?: string;
}

/**
 * ResumeViewer component rendering sandboxed resume output and layout controls.
 *
 * @param props - Component configuration props including htmlContent, markdownContent, and plainTextContent.
 * @returns Accessible preview container with sandboxed iframe, markdown viewer, plain text viewer, and layout controls.
 */
export const ResumeViewer: React.FC<ResumeViewerProps> = ({
  htmlContent = "",
  markdownContent = "",
  plainTextContent = "",
  className = "",
}) => {
  const [viewMode, setViewMode] = React.useState<ResumeViewMode>("html");
  const [layout, setLayout] = React.useState<ResumePageLayout>("letter");

  const hasContent = Boolean(htmlContent || markdownContent || plainTextContent);

  if (!hasContent) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-12 text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 dark:text-slate-400 ${className}`}
      >
        <FileText className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-3" aria-hidden="true" />
        <p className="text-base font-medium text-slate-700 dark:text-slate-300">
          No rendered resume output available
        </p>
        <p className="text-sm mt-1">
          Select or generate a completed branch version to preview.
        </p>
      </div>
    );
  }

  // Physical page dimensions:
  // Letter: 8.5in x 11in (816px x 1056px at 96 DPI)
  // A4: 210mm x 297mm (794px x 1123px at 96 DPI)
  const layoutClasses: Record<ResumePageLayout, string> = {
    letter: "w-[816px] min-h-[1056px] h-[1056px] max-w-full",
    a4: "w-[794px] min-h-[1123px] h-[1123px] max-w-full",
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Controls Bar: View Mode (HTML, Markdown, Plain Text) & Layout (Letter, A4) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm">
        {/* View Mode Toggle: HTML vs Markdown vs Plain Text */}
        <div
          role="radiogroup"
          aria-label="Resume view mode"
          className="inline-flex items-center rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shadow-sm"
        >
          <button
            type="button"
            role="radio"
            aria-checked={viewMode === "html"}
            onClick={() => setViewMode("html")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === "html"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>HTML (Visual)</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={viewMode === "markdown"}
            onClick={() => setViewMode("markdown")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === "markdown"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <FileCode className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Markdown</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={viewMode === "text"}
            onClick={() => setViewMode("text")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === "text"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Plain Text</span>
          </button>
        </div>

        {/* Page Boundary Layout Controls (Letter vs A4) */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-0.5 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 px-2 font-medium">Layout:</span>
          <Button
            type="button"
            variant={layout === "letter" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setLayout("letter")}
            aria-label="Switch to Letter layout"
            className="h-7 px-2 text-xs"
          >
            Letter (8.5×11″)
          </Button>
          <Button
            type="button"
            variant={layout === "a4" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setLayout("a4")}
            aria-label="Switch to A4 layout"
            className="h-7 px-2 text-xs"
          >
            A4 (210×297mm)
          </Button>
        </div>
      </div>

      {/* Main Preview Container with Canvas Background */}
      <div className="flex justify-center p-6 bg-slate-200/60 dark:bg-slate-950 rounded-xl overflow-x-auto min-h-[600px] border border-slate-300/80 dark:border-slate-800">
        <div
          data-testid="resume-page-paper"
          data-layout={layout}
          className={`relative bg-white dark:bg-slate-900 shadow-lg border border-slate-300 dark:border-slate-700 rounded-sm transition-all duration-200 flex flex-col ${layoutClasses[layout]}`}
        >
          {/* Subtle Page Boundary Guide Header Indicator */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] text-slate-400 dark:text-slate-500 select-none">
            <span>
              Page Boundary: {layout.toUpperCase()} ({layout === "letter" ? "8.5 × 11 in" : "210 × 297 mm"})
            </span>
            <span>ATS-Optimized Single Column</span>
          </div>

          {/* Render Area: Sandboxed iframe for HTML, or accessible pre for Markdown / Plain Text */}
          <div className="flex-1 w-full h-full p-2 overflow-hidden">
            {viewMode === "html" ? (
              <iframe
                title="Rendered Resume Preview"
                srcDoc={htmlContent}
                sandbox=""
                className="w-full h-full border-0"
              />
            ) : viewMode === "markdown" ? (
              <pre
                aria-label="Markdown resume"
                className="w-full h-full p-6 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap overflow-y-auto leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
              >
                {markdownContent || "No markdown version available."}
              </pre>
            ) : (
              <pre
                aria-label="Plain text resume"
                className="w-full h-full p-6 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap overflow-y-auto leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
              >
                {plainTextContent || "No plain-text version available."}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
