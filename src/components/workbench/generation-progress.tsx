import * as React from "react";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BranchVersion } from "@/api/generation-queries";

/**
 * Props for the GenerationProgress component.
 */
export interface GenerationProgressProps {
  /** Active or completed branch version record containing status, warnings, and errors. */
  version?: BranchVersion | null;
  /** Optional callback to retry generation if the worker job failed. */
  onRetry?: () => void;
  /** Optional additional CSS class names. */
  className?: string;
}

const STATUS_CONTAINER_STYLES: Record<string, string> = {
  completed: "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30",
  completed_with_warnings: "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30",
  failed: "border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30",
  cancelled: "border-border bg-muted/50",
  pending: "border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30",
  processing: "border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30",
};

/**
 * GenerationProgress displays the real-time asynchronous state of an LLM
 * tailoring job as polled from the backend worker queue.
 *
 * Architectural Role:
 * - Live UI feedback for pending, processing, completed, completed_with_warnings,
 *   and failed version generation states.
 * - Displays validation warnings (e.g. truncated experience, hallucinations)
 *   and technical failure diagnostics with retry capabilities.
 *
 * Accessibility / WAI-ARIA Considerations:
 * - Uses `role="status"` with `aria-live="polite"` so state transitions
 *   (e.g., job moving from pending -> processing -> completed) are announced
 *   by screen readers without disrupting focus.
 * - Spinner icons are marked `aria-hidden="true"` with accompanying descriptive text.
 * - Interactive retry button is keyboard-focusable with prominent focus indicators.
 */
export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  version,
  onRetry,
  className = "",
}) => {
  if (!version) return null;

  const { status, validation_warnings, error_message, version_number } =
    version;

  const containerStyle =
    (status && STATUS_CONTAINER_STYLES[status]) ||
    STATUS_CONTAINER_STYLES.pending;

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label="Generation Progress"
      className={`rounded-lg border p-4 transition-all ${containerStyle} ${className}`}
    >
      <div className="flex flex-col gap-3">
        {/* Header / Status Banner */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(status === "pending" || status === "processing") && (
              <Loader2
                className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400"
                aria-hidden="true"
              />
            )}
            {status === "completed" && (
              <CheckCircle2
                className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
            )}
            {status === "completed_with_warnings" && (
              <AlertTriangle
                className="h-5 w-5 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
            )}
            {status === "failed" && (
              <AlertCircle
                className="h-5 w-5 text-rose-600 dark:text-rose-400"
                aria-hidden="true"
              />
            )}
            {status === "cancelled" && (
              <XCircle
                className="h-5 w-5 text-slate-600 dark:text-slate-400"
                aria-hidden="true"
              />
            )}

            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {status === "pending" && "Queued for AI Generation"}
                {status === "processing" && "Tailoring in Progress..."}
                {status === "completed" && "Generation Completed Successfully"}
                {status === "completed_with_warnings" &&
                  "Completed with Validation Warnings"}
                {status === "failed" && "Generation Failed"}
                {status === "cancelled" && "Generation Cancelled"}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {status === "pending" &&
                  "Job accepted and queued for worker pool allocation."}
                {status === "processing" &&
                  `Generating version v${version_number} tailored resume and ATS gap analysis...`}
                {status === "completed" &&
                  `Version v${version_number} is ready and available in the timeline.`}
                {status === "completed_with_warnings" &&
                  `Version v${version_number} generated with potential quality caveats.`}
                {status === "failed" &&
                  (error_message ||
                    "An unexpected error occurred during generation.")}
                {status === "cancelled" &&
                  (error_message ||
                    "This generation job was cancelled before completion.")}
              </p>
            </div>
          </div>

          {(status === "failed" || status === "cancelled") && onRetry && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onRetry}
              className="flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Retry Generation</span>
            </Button>
          )}
        </div>

        {/* Validation Warnings Callout */}
        {status === "completed_with_warnings" &&
          validation_warnings &&
          validation_warnings.length > 0 && (
            <div className="mt-2 rounded-md border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 p-3 text-xs text-amber-900 dark:text-amber-200 shadow-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                Validation Warnings:
              </p>
              <ul className="mt-1 list-inside list-disc space-y-1">
                {validation_warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
      </div>
    </section>
  );
};
