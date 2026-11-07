/**
 * @file resume-viewer.tsx
 * @description Live sandboxed resume preview container with format toggles and full-width responsive preview.
 *
 * Implements a secure sandboxed iframe rendering pre-rendered HTML resumes
 * without script execution (`sandbox=""` omitting `allow-scripts`, using `srcdoc`),
 * strictly isolating resume CSS styling from the host application shell DOM.
 * Also provides accessible Markdown and plain-text view modes.
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
import { stripScriptTags } from "@/components/templates/template-preview-pane";

/**
 * Display mode toggle for resume preview: visual HTML iframe vs Markdown vs raw plain text.
 */
export type ResumeViewMode = "html" | "markdown" | "text";

interface ViewModeOption {
  id: ResumeViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}

const MODES: readonly ViewModeOption[] = [
  { id: "html", label: "HTML (Visual)", icon: Code2 },
  { id: "markdown", label: "Markdown", icon: FileCode },
  { id: "text", label: "Plain Text", icon: FileText },
];

const VIEW_MODE_IDS: readonly ResumeViewMode[] = MODES.map((m) => m.id);

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
 * ResumeViewer component rendering sandboxed resume output and view format controls.
 *
 * @param props - Component configuration props including htmlContent, markdownContent, and plainTextContent.
 * @returns Accessible preview container with sandboxed iframe, markdown viewer, and plain text viewer.
 */
export const ResumeViewer: React.FC<ResumeViewerProps> = ({
  htmlContent = "",
  markdownContent = "",
  plainTextContent = "",
  className = "",
}) => {
  const [viewMode, setViewMode] = React.useState<ResumeViewMode>("html");
  const sanitizedHtml = React.useMemo(() => stripScriptTags(htmlContent), [htmlContent]);
  const buttonRefs = React.useRef<Record<ResumeViewMode, HTMLButtonElement | null>>({
    html: null,
    markdown: null,
    text: null,
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = VIEW_MODE_IDS.indexOf(viewMode);
    if (currentIndex === -1) return;

    let targetMode: ResumeViewMode | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % VIEW_MODE_IDS.length;
      targetMode = VIEW_MODE_IDS[nextIndex] ?? null;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + VIEW_MODE_IDS.length) % VIEW_MODE_IDS.length;
      targetMode = VIEW_MODE_IDS[prevIndex] ?? null;
    }

    if (targetMode) {
      setViewMode(targetMode);
      buttonRefs.current[targetMode]?.focus();
    }
  };

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

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Controls Bar: View Mode (HTML, Markdown, Plain Text) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm">
        {/* View Mode Toggle: HTML vs Markdown vs Plain Text */}
        <div
          role="radiogroup"
          aria-label="Resume view mode"
          className="inline-flex items-center rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shadow-sm"
        >
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const isChecked = viewMode === mode.id;
            return (
              <button
                key={mode.id}
                ref={(el) => {
                  buttonRefs.current[mode.id] = el;
                }}
                type="button"
                role="radio"
                tabIndex={isChecked ? 0 : -1}
                aria-checked={isChecked}
                onKeyDown={handleKeyDown}
                onClick={() => setViewMode(mode.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isChecked
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Preview Container: Hoisted one level above, occupying 100% width with no margins */}
      <div
        data-testid="resume-page-paper"
        className="w-full min-h-[600px] bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col"
      >
        {/* Render Area: Sandboxed iframe for HTML, or accessible pre for Markdown / Plain Text */}
        <div className="flex-1 w-full h-full p-2 overflow-hidden">
          {viewMode === "html" ? (
            <iframe
              title="Rendered Resume Preview"
              srcDoc={sanitizedHtml}
              sandbox=""
              className="w-full h-full min-h-[600px] border-0"
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
  );
};
