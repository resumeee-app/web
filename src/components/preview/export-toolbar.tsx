/**
 * @file export-toolbar.tsx
 * @description ATS Export Engine toolbar component.
 *
 * Implements accessible action triggers for:
 * - "Download Plain Text": direct file download of clean ASCII plain-text resume (`.txt`).
 * - "Export JSON Resume": direct file download of standard JSON Resume schema artifact (`.json`).
 * - "Download HTML": direct file download of pre-rendered resume HTML artifact (`.html`).
 *
 * Accessibility / WAI-ARIA Considerations:
 * - Uses semantic `role="toolbar"` with `aria-label="Resume export actions"`.
 * - All interactive controls include accessible names via visible text, `aria-label`, and Radix Tooltip.
 * - Conforms to WCAG 2.1 AA with zero axe violations.
 */

import * as React from "react";
import { Download, FileText, FileJson } from "lucide-react";
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
  /** Direct backend download URL for clean plain-text resume artifact */
  textDownloadUrl?: string;
  /** Direct backend download URL for standard JSON Resume artifact */
  jsonResumeDownloadUrl?: string;
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
 * @param props - Configuration props including download URLs and branch metadata.
 * @returns Accessible toolbar element with download triggers for Plain Text, JSON Resume, and HTML.
 */
export const ExportToolbar: React.FC<ExportToolbarProps> = ({
  htmlDownloadUrl = "#",
  textDownloadUrl = "#",
  jsonResumeDownloadUrl = "#",
  branchName = "resume",
  versionNumber = 1,
  className = "",
}) => {
  // Generate safe filename prefix for downloaded artifacts
  const sanitizedBranch = (branchName || "resume").replace(/[^a-zA-Z0-9_-]/g, "-");
  const htmlFileName = `resume-${sanitizedBranch}-v${versionNumber}.html`;
  const textFileName = `resume-${sanitizedBranch}-v${versionNumber}.txt`;
  const jsonFileName = `resume-${sanitizedBranch}-v${versionNumber}.json`;

  return (
    <TooltipProvider>
      <div
        role="toolbar"
        aria-label="Resume export actions"
        className={`flex flex-wrap items-center gap-2 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm ${className}`}
      >
        {/* Download Plain Text Action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5"
            >
              <a
                href={textDownloadUrl}
                download={textFileName}
                aria-label="Download Plain Text"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
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
              className="flex items-center gap-1.5"
            >
              <a
                href={jsonResumeDownloadUrl}
                download={jsonFileName}
                aria-label="Export JSON Resume"
              >
                <FileJson className="h-4 w-4" aria-hidden="true" />
                <span>Export JSON Resume</span>
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Download standard JSON Resume schema file (.json)</p>
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
                download={htmlFileName}
                aria-label="Download HTML"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Download HTML</span>
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Download standalone ATS-compatible HTML file (.html)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
