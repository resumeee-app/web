import * as React from "react";
import {
  History,
  CheckCircle,
  Cpu,
  Clock,
  Eye,
  Star,
  AlertTriangle,
  GitCompare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "./badge";
import type { BranchVersion } from "@/api/generation-queries";

/**
 * Props for the VersionTimeline component.
 */
export interface VersionTimelineProps {
  /** Array of historical versions generated for this branch. */
  versions: BranchVersion[];
  /** Identifier of the currently active/promoted version on the branch. */
  activeVersionId?: string | null;
  /** Identifier of the version currently selected for inspection in the gap analysis card. */
  selectedVersionId?: string | null;
  /** Callback triggered when user clicks 'Inspect' on a version. */
  onSelectVersion: (version: BranchVersion) => void;
  /** Callback triggered when user clicks 'Set as Active' on a completed version. */
  onSetActiveVersion: (versionId: string) => void;
  /** Callback triggered when user clicks 'Compare' on a completed version. */
  onCompareVersion?: (version: BranchVersion) => void;
  /** Whether the active version promotion mutation is currently in flight. */
  isSettingActive?: boolean;
}

/**
 * VersionTimeline displays the chronological evolution of a resume branch
 * across discrete, immutable AI tailoring iterations (`v1`..`vN`).
 *
 * Architectural Role:
 * - Lists historical versions sorted descending (latest first).
 * - Surfaces model provenance (`model_used`) and creation timestamps.
 * - Displays active version indicators and allows promoting completed versions
 *   via `PUT /branches/{id}` (`active_version_id`).
 * - Allows switching the inspected version for the ATS gap analysis report.
 *
 * Accessibility / WAI-ARIA Considerations:
 * - Uses semantic `<section>` landmark with `aria-label="Version Timeline"`.
 * - Uses semantic `<ul>` list with accessible `aria-label="Version list"`.
 * - Action buttons include unambiguous accessible names via `aria-label` (e.g., "Inspect v2", "Set v2 as Active").
 * - Status badges and active badges feature high-contrast color tokens and textual labels.
 */
export const VersionTimeline: React.FC<VersionTimelineProps> = ({
  versions,
  activeVersionId,
  selectedVersionId,
  onSelectVersion,
  onSetActiveVersion,
  onCompareVersion,
  isSettingActive = false,
}) => {
  if (versions.length === 0) {
    return (
      <section
        aria-label="Version Timeline"
        className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center"
      >
        <History className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        <h2 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
          No versions generated yet
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Trigger "Tailor Resume" to generate your first AI resume iteration.
        </p>
      </section>
    );
  }

  // Sort versions descending by version_number (latest first)
  const sortedVersions = [...versions].sort(
    (a, b) => b.version_number - a.version_number
  );

  return (
    <section
      aria-label="Version Timeline"
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
    >
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Version History</h2>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-300">
          {versions.length} {versions.length === 1 ? "version" : "versions"}{" "}
          recorded
        </span>
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-800" aria-label="Version list">
        {sortedVersions.map((v) => {
          const isActive = v.id === activeVersionId;
          const isSelected = v.id === selectedVersionId;
          const isCompleted =
            v.status === "completed" || v.status === "completed_with_warnings";

          return (
            <li
              key={v.id}
              className={`flex flex-col gap-3 py-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                isSelected ? "rounded-md bg-indigo-50/40 dark:bg-indigo-950/40 px-3" : ""
              }`}
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    Version v{v.version_number}
                  </span>

                  {isActive && (
                    <Badge variant="info" className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                      <span>Active Version</span>
                    </Badge>
                  )}

                  {v.status === "completed" && (
                    <Badge variant="success">Completed</Badge>
                  )}
                  {v.status === "completed_with_warnings" && (
                    <Badge variant="warning" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                      <span>Completed with Warnings</span>
                    </Badge>
                  )}
                  {v.status === "failed" && (
                    <Badge variant="destructive">Failed</Badge>
                  )}
                  {v.status === "cancelled" && (
                    <Badge variant="default">Cancelled</Badge>
                  )}
                  {(v.status === "pending" || v.status === "processing") && (
                    <Badge variant="default">{v.status}</Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-300">
                  {v.model_used && (
                    <div className="flex items-center gap-1">
                      <Cpu className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                      <span>{v.model_used}</span>
                    </div>
                  )}
                  {v.created_at && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                      <time dateTime={v.created_at}>
                        {new Date(v.created_at).toLocaleString()}
                      </time>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectVersion(v)}
                  className="flex items-center gap-1.5"
                  aria-label={`Inspect v${v.version_number}`}
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Inspect</span>
                </Button>

                {isCompleted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCompareVersion?.(v)}
                    className="flex items-center gap-1.5"
                    aria-label={`Compare v${v.version_number}`}
                  >
                    <GitCompare className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Compare</span>
                  </Button>
                )}

                {!isActive && isCompleted && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onSetActiveVersion(v.id)}
                    disabled={isSettingActive}
                    className="flex items-center gap-1.5"
                    aria-label={`Set v${v.version_number} as Active`}
                  >
                    <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Set as Active</span>
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
