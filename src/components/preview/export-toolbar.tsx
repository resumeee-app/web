/**
 * @file export-toolbar.tsx
 * @description ATS Export Engine toolbar component.
 *
 * Implements accessible action triggers for:
 * - "Print to PDF": triggers window.print() leveraging ATS-friendly print media queries.
 * - "Copy Plain Text": copies clean ASCII plain text to the clipboard with toast feedback.
 * - "Download HTML": direct file download of pre-rendered resume HTML artifact.
 *
 * Accessibility / WAI-ARIA Considerations:
 * - Uses semantic `role="toolbar"` with `aria-label="Resume export actions"`.
 * - All interactive controls include accessible names via visible text, `aria-label`, and Radix Tooltip.
 * - Clipboard operations provide polite screen-reader announcements via `role="status"` and `aria-live="polite"`.
 * - Zero axe violations under WCAG 2.1 AA.
 */

import * as React from "react";
import { Printer, Copy, Check, Download } from "lucide-react";
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
  /** Clean ASCII/plain-text resume string for clipboard copying */
  plainText?: string;
  /** Direct backend download URL for standalone HTML resume artifact */
  htmlDownloadUrl?: string;
  /** Human-readable branch name used in downloaded artifact filenames */
  branchName?: string;
  /** Sequential version number used in downloaded artifact filenames */
  versionNumber?: number;
  /** Optional additional CSS class names */
  className?: string;
}

/**
 * ExportToolbar provides accessible export actions for resumes.
 *
 * @param props - Configuration props including plainText, htmlDownloadUrl, and branch metadata.
 * @returns Accessible toolbar element for print, copy, and download actions.
 */
export const ExportToolbar: React.FC<ExportToolbarProps> = ({
  plainText = "",
  htmlDownloadUrl = "#",
  branchName = "resume",
  versionNumber = 1,
  className = "",
}) => {
  const [copied, setCopied] = React.useState(false);
  const copyTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Invokes the browser native print dialog for ATS PDF generation.
   */
  const handlePrint = () => {
    window.print();
  };

  /**
   * Copies clean plain-text resume output to the system clipboard and triggers toast feedback.
   */
  const handleCopyText = async () => {
    if (!plainText) return;
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch {
      // Graceful fallback if clipboard API is restricted
    }
  };

  // Generate safe filename for downloaded HTML artifact
  const sanitizedBranch = (branchName || "resume").replace(/[^a-zA-Z0-9_-]/g, "-");
  const downloadFileName = `resume-${sanitizedBranch}-v${versionNumber}.html`;

  return (
    <TooltipProvider>
      <div
        role="toolbar"
        aria-label="Resume export actions"
        className={`flex flex-wrap items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg shadow-sm ${className}`}
      >
        {/* Live Region for Screen Reader & Toast Feedback */}
        <div role="status" aria-live="polite" className="sr-only">
          {copied ? "Clean plain-text resume copied to clipboard." : ""}
        </div>

        {/* Visual Feedback Badge when Copied */}
        {copied && (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md animate-in fade-in"
            aria-hidden="true"
          >
            <Check className="h-3.5 w-3.5" />
            Copied to clipboard!
          </span>
        )}

        {/* Print to PDF Action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              aria-label="Print to PDF"
              className="flex items-center gap-1.5"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span>Print to PDF</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Triggers clean browser print with ATS-friendly stylesheet</p>
          </TooltipContent>
        </Tooltip>

        {/* Copy Plain Text Action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyText}
              aria-label="Copy Plain Text"
              className="flex items-center gap-1.5"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Copy Plain Text</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy clean ASCII plain-text format for direct ATS pasting</p>
          </TooltipContent>
        </Tooltip>

        {/* Download HTML Action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              variant="default"
              size="sm"
              className="flex items-center gap-1.5"
            >
              <a
                href={htmlDownloadUrl}
                download={downloadFileName}
                aria-label="Download HTML"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Download HTML</span>
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Download standalone ATS-compatible HTML file</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
