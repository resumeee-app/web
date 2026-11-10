import * as React from "react";
import { ScanSearch, Loader2, CheckCircle2, FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "./badge";
import type { ATSScore } from "@/api/workbench-queries";

/**
 * Props for the ATSScoreCard component.
 */
export interface ATSScoreCardProps {
  /** Persisted ATS evaluation score for the currently inspected tailored version. */
  atsScore?: ATSScore | null;
  /** Sequential version number of the currently inspected version. */
  versionNumber?: number;
  /** Whether the current branch is the protected Default Main Branch. */
  isDefaultBranch?: boolean;
  /** Whether the branch has a non-empty Job Description (target_requirements). */
  hasJobDescription?: boolean;
  /** Whether the inspected version is a completed tailored version. */
  hasCompletedVersion?: boolean;
  /** Whether an ATS simulation request is currently in flight. */
  isSimulating?: boolean;
  /** Callback invoked when the user clicks the on-demand ATS simulation trigger button. */
  onSimulate?: () => Promise<void> | void;
}

function clampPercent(value?: number | null): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  const clamped = Math.max(0, Math.min(100, value));
  return Math.round(clamped * 10) / 10;
}

/**
 * ATSScoreCard renders the two-signal ATS perception evaluation for a tailored resume version:
 * 1. "Extraction Confidence Score" (0 to 100%)
 * 2. "Job Matching Score" (0 to 100%, computed strictly from extracted content)
 *
 * Triggered on-demand and once per completed tailored version.
 * Disabled on the Default Main Branch and when no Job Description is provided.
 */
export const ATSScoreCard: React.FC<ATSScoreCardProps> = ({
  atsScore,
  versionNumber,
  isDefaultBranch = false,
  hasJobDescription = false,
  hasCompletedVersion = false,
  isSimulating = false,
  onSimulate,
}) => {
  const headingId = React.useId();

  const extractionScore = clampPercent(atsScore?.extraction_confidence_score);
  const matchingScore = clampPercent(atsScore?.job_matching_score);
  const hasEvaluatedScore =
    atsScore !== null &&
    atsScore !== undefined &&
    extractionScore !== null &&
    matchingScore !== null;

  const isDisabled =
    isDefaultBranch ||
    !hasJobDescription ||
    !hasCompletedVersion ||
    hasEvaluatedScore ||
    isSimulating;

  let statusNote: string | null = null;
  if (isDefaultBranch) {
    statusNote = "ATS scoring is disabled for the Default Main Branch.";
  } else if (!hasJobDescription) {
    statusNote =
      "Provide a Job Description in branch context to enable ATS scoring.";
  } else if (!hasCompletedVersion) {
    statusNote = "Tailor a resume version first to run ATS scoring.";
  }

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5"
    >
      {/* Header and On-Demand Trigger Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <ScanSearch className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id={headingId}
                className="text-lg font-bold text-slate-900 dark:text-slate-100"
              >
                ATS Perception & Matching Score
                {versionNumber ? ` (v${versionNumber})` : ""}
              </h2>
              {hasEvaluatedScore && (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  <span>Evaluated</span>
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Two-stage simulation decomposing text extraction completeness and
              downstream job matching.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-1.5">
          <Button
            type="button"
            variant={hasEvaluatedScore ? "outline" : "default"}
            size="sm"
            disabled={isDisabled}
            aria-disabled={isDisabled}
            onClick={() => {
              if (!isDisabled && onSimulate) {
                void onSimulate();
              }
            }}
            className="flex items-center gap-1.5"
          >
            {isSimulating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Calculating ATS Score...</span>
              </>
            ) : hasEvaluatedScore ? (
              <>
                <FileCheck2 className="h-4 w-4" aria-hidden="true" />
                <span>ATS Score Calculated</span>
              </>
            ) : (
              <>
                <ScanSearch className="h-4 w-4" aria-hidden="true" />
                <span>Calculate ATS Score</span>
              </>
            )}
          </Button>
          {statusNote && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {statusNote}
            </p>
          )}
        </div>
      </div>

      {/* Two-Signal ATS Breakdown */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Signal 1: Extraction Confidence Score */}
        <div className="rounded-md border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Extraction Confidence Score
            </span>
            {extractionScore !== null ? (
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                {extractionScore.toFixed(1)}%
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Not evaluated
              </span>
            )}
          </div>

          {extractionScore !== null && (
            <div
              role="meter"
              aria-label="Extraction Confidence Score"
              aria-valuenow={extractionScore}
              aria-valuemin={0}
              aria-valuemax={100}
              className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
            >
              <div
                className={`h-full transition-all duration-500 ${
                  extractionScore >= 80
                    ? "bg-emerald-500"
                    : extractionScore >= 60
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
                style={{ width: `${extractionScore}%` }}
              />
            </div>
          )}

          <p className="text-xs text-slate-600 dark:text-slate-400">
            {atsScore?.extraction_summary ||
              "Measures how completely an ATS parser extracts and categorizes your rendered resume content."}
          </p>
        </div>

        {/* Signal 2: Job Matching Score */}
        <div className="rounded-md border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Job Matching Score
            </span>
            {matchingScore !== null ? (
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                {matchingScore.toFixed(1)}%
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Not evaluated
              </span>
            )}
          </div>

          {matchingScore !== null && (
            <div
              role="meter"
              aria-label="Job Matching Score"
              aria-valuenow={matchingScore}
              aria-valuemin={0}
              aria-valuemax={100}
              className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
            >
              <div
                className={`h-full transition-all duration-500 ${
                  matchingScore >= 80
                    ? "bg-emerald-500"
                    : matchingScore >= 60
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
                style={{ width: `${matchingScore}%` }}
              />
            </div>
          )}

          <p className="text-xs text-slate-600 dark:text-slate-400">
            {atsScore?.matching_summary ||
              "Computes perceived alignment against the target job description using only the extracted ATS data."}
          </p>
        </div>
      </div>
    </section>
  );
};
