import React from "react";
import { Link } from "react-router-dom";
import { Clock, Eye, Layers, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isDefaultBranch,
  getBranchStatus,
  type Branch,
} from "@/api/branch-queries";
import {
  DefaultBranchBadge,
  BranchStatusBadge,
  formatBranchDate,
  BranchTargetDisplay,
} from "./branch-shared-elements";

/**
 * Props for the BranchCard component.
 */
export interface BranchCardProps {
  /**
   * The branch domain entity.
   */
  branch: Branch;
  /**
   * Human-readable display name of the bound template set, if resolved.
   */
  templateName?: string;
  /**
   * Human-readable display name of the bound preset, if resolved.
   */
  presetName?: string;
  /**
   * Callback invoked when the user requests to inspect this branch resume.
   * If omitted, falls back to direct navigation to `/branches/:id/preview`.
   */
  onInspect?: (branch: Branch) => void;
  /**
   * Callback invoked when the user requests to delete this branch.
   * Omitted or suppressed for default branch.
   */
  onDelete?: (branch: Branch) => void;
}

/**
 * BranchCard Component
 *
 * Renders an individual resume branch as an accessible card item in grid catalog views.
 *
 * Architectural Role:
 * - Highlights the branch title, target role/company, active template, version, and timestamps.
 * - Enforces the Default Branch Invariant: renders a prominent "Default Branch" badge,
 *   displays clarifying text explaining its un-tailored master nature, and suppresses deletion actions.
 * - Communicates tailoring lifecycle state through colored status indicators.
 * - Provides navigation seam to `/branches/:id` (the branch workbench, defined in Issue #98).
 *
 * Accessibility & WAI-ARIA Considerations:
 * - Uses semantic `<article>` landmark with `aria-labelledby` referencing the branch title heading.
 * - Branch title rendered as semantic Level 2 heading (`<h2>`) linking to the workbench.
 * - Workbench link and Delete button feature unique, descriptive `aria-label` attributes.
 * - Icons are flagged with `aria-hidden="true"`.
 *
 * @param {BranchCardProps} props Component properties.
 * @returns {JSX.Element} The rendered branch card element.
 */
export const BranchCard: React.FC<BranchCardProps> = ({
  branch,
  templateName,
  presetName,
  onInspect,
  onDelete,
}) => {
  const isDefault = isDefaultBranch(branch);
  const status = getBranchStatus(branch);
  const formattedDate = formatBranchDate(branch.updated_at);

  return (
    <article
      className="flex flex-col justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700"
      aria-labelledby={`branch-title-${branch.id}`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id={`branch-title-${branch.id}`}
                className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
              >
                <Link
                  to={`/branches/${branch.id}`}
                  className="rounded-sm hover:text-indigo-600 dark:hover:text-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {branch.name}
                </Link>
              </h2>
              {isDefault && <DefaultBranchBadge iconSize="md" />}
            </div>

            {isDefault ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct Master Profile (Untailored) — mirrors canonical master data with zero LLM tailoring.
              </p>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <BranchTargetDisplay
                  targetCompany={branch.target_company}
                  targetRole={branch.target_role}
                  emptyFallback="Untargeted line"
                  companyClassName="font-medium text-slate-700 dark:text-slate-200"
                />
              </p>
            )}
          </div>

          <div>
            <BranchStatusBadge status={status} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            <span className="truncate">
              Template: <strong className="font-medium text-slate-700 dark:text-slate-300">{templateName || branch.template_set_id}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            <span className="truncate">
              Modified: <span className="text-slate-700 dark:text-slate-300">{formattedDate}</span>
            </span>
          </div>

          <div className="col-span-2 flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>
              Active Version:{" "}
              <strong className="font-medium text-slate-700 dark:text-slate-300">
                {branch.active_version_id || "v1"}
              </strong>
            </span>
            {!isDefault && presetName && (
              <span className="truncate text-slate-500 dark:text-slate-400">
                Strategy: <strong className="font-medium text-slate-700 dark:text-slate-300">{presetName}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link
              to={`/branches/${branch.id}`}
              aria-label={`Open workbench for ${branch.name}`}
            >
              Open Workbench
            </Link>
          </Button>

          {onInspect ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onInspect(branch)}
              aria-label={`Inspect resume for ${branch.name}`}
              className="flex items-center gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Inspect</span>
            </Button>
          ) : (
            <Button asChild variant="secondary" size="sm">
              <Link
                to={`/branches/${branch.id}/preview`}
                aria-label={`Inspect resume for ${branch.name}`}
                className="flex items-center gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Inspect</span>
              </Link>
            </Button>
          )}
        </div>

        {!isDefault && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(branch)}
            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300 focus-visible:ring-red-500"
            aria-label={`Delete branch ${branch.name}`}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Delete
          </Button>
        )}
      </div>
    </article>
  );
};
