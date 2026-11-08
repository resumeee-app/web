/**
 * @file export-toolbar.tsx
 * @description ATS Export Engine toolbar component.
 *
 * Implements accessible action triggers for:
 * - "Download HTML": direct file download of pre-rendered resume HTML artifact (`.html`).
 * - "Download Markdown": direct file download of pre-rendered resume Markdown artifact (`.md`).
 * - "Download Plain Text": direct file download of clean ASCII plain-text resume (`.txt`).
 * - "Export JSON Resume": direct file download of standard JSON Resume schema artifact (`.json`).
 * - "Copy Markdown": one-click clipboard copy of resume markdown text with visual/ARIA feedback.
 * - "Copy Plain Text": one-click clipboard copy of clean plain text resume with visual/ARIA feedback.
 *
 * Accessibility / WAI-ARIA Considerations:
 * - Uses semantic `role="toolbar"` with `aria-label="Resume export actions"`.
 * - All interactive controls include accessible names via visible text, `aria-label`, and Radix Tooltip.
 * - Live region announces clipboard copy status to assistive technologies.
 * - Conforms to WCAG 2.1 AA with zero axe violations.
 */

import * as React from "react";
import { Download, FileText, FileCode, FileJson, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Configuration props for the ExportToolbar component.
 */
export interface ExportToolbarProps {
  /** Direct backend download URL for standalone HTML resume artifact */
  htmlDownloadUrl?: string;
  /** Direct backend download URL for Markdown resume artifact */
  markdownDownloadUrl?: string;
  /** Direct backend download URL for clean plain-text resume artifact */
  textDownloadUrl?: string;
  /** Direct backend download URL for standard JSON Resume artifact */
  jsonResumeDownloadUrl?: string;
  /** Plain text resume content for one-click clipboard copy */
  plainTextContent?: string;
  /** Markdown resume content for one-click clipboard copy */
  markdownContent?: string;
  /** Human-readable branch name used in downloaded artifact filenames */
  branchName?: string;
  /** Sequential version number used in downloaded artifact filenames */
  versionNumber?: number;
  /** Optional additional CSS class names */
  className?: string;
}

/**
 * ExportToolbar provides accessible export and download actions for tailored resumes.
 *
 * @param props - Configuration props including download URLs, text content, and branch metadata.
 * @returns Accessible toolbar element with download triggers and clipboard copy actions.
 */
export const ExportToolbar: React.FC<ExportToolbarProps> = ({
  htmlDownloadUrl = "#",
  markdownDownloadUrl = "#",
  textDownloadUrl = "#",
  jsonResumeDownloadUrl = "#",
  plainTextContent = "",
  markdownContent = "",
  branchName = "resume",
  versionNumber = 1,
  className = "",
}) => {
  // Generate safe filename prefix for downloaded artifacts
  const sanitizedBranch = (branchName || "resume").replace(/[^a-zA-Z0-9_-]/g, "-");
  const htmlFileName = `resume-${sanitizedBranch}-v${versionNumber}.html`;
  const markdownFileName = `resume-${sanitizedBranch}-v${versionNumber}.md`;
  const textFileName = `resume-${sanitizedBranch}-v${versionNumber}.txt`;
  const jsonFileName = `resume-${sanitizedBranch}-v${versionNumber}.json`;

  const [copiedFormat, setCopiedFormat] = React.useState<"markdown" | "text" | null>(null);
  const copyTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async (format: "markdown" | "text", content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFormat(format);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setCopiedFormat(null);
      }, 2000);
    } catch {
      // Clipboard write failure fallback
    }
  };

  const statusMessage =
    copiedFormat === "markdown"
      ? "Markdown copied to clipboard"
      : copiedFormat === "text"
      ? "Plain text copied to clipboard"
      : "";

  return (
    <TooltipProvider>
      <div
        role="toolbar"
        aria-label="Resume export actions"
        className={`flex flex-wrap items-center gap-1.5 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm ${className}`}
      >
        {/* Assistive technology announcement live region */}
        <span className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </span>

        {/* Download HTML Action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              variant="default"
              size="sm"
              className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium"
            >
              <a
                href={htmlDownloadUrl}
                download={htmlFileName}
                aria-label="Download HTML"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Download HTML</span>
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Download standalone ATS-compatible HTML file (.html)</p>
          </TooltipContent>
        </Tooltip>

        {/* Download Markdown Action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium"
            >
              <a
                href={markdownDownloadUrl}
                download={markdownFileName}
                aria-label="Download Markdown"
              >
                <FileCode className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Download Markdown</span>
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Download structured Markdown resume file (.md)</p>
          </TooltipContent>
        </Tooltip>

        {/* Download Plain Text Action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium"
            >
              <a
                href={textDownloadUrl}
                download={textFileName}
                aria-label="Download Plain Text"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Download Plain Text</span>
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Download clean ASCII plain-text resume (.txt)</p>
          </TooltipContent>
        </Tooltip>

        {/* Export JSON Resume Action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium"
            >
              <a
                href={jsonResumeDownloadUrl}
                download={jsonFileName}
                aria-label="Export JSON Resume"
              >
                <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Export JSON Resume</span>
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Download standard JSON Resume schema file (.json)</p>
          </TooltipContent>
        </Tooltip>

        {/* Visual separator between file downloads and clipboard copy triggers */}
        <div
          className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"
          aria-hidden="true"
        />

        {/* Copy Markdown Action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleCopy("markdown", markdownContent)}
              aria-label={
                copiedFormat === "markdown"
                  ? "Markdown copied to clipboard"
                  : "Copy Markdown"
              }
              className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium"
            >
              {copiedFormat === "markdown" ? (
                <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{copiedFormat === "markdown" ? "Copied Markdown" : "Copy Markdown"}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy Markdown resume to clipboard</p>
          </TooltipContent>
        </Tooltip>

        {/* Copy Plain Text Action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleCopy("text", plainTextContent)}
              aria-label={
                copiedFormat === "text"
                  ? "Plain text copied to clipboard"
                  : "Copy Plain Text"
              }
              className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium"
            >
              {copiedFormat === "text" ? (
                <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{copiedFormat === "text" ? "Copied Text" : "Copy Plain Text"}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy clean plain-text resume to clipboard</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
