import React from "react";
import { Link } from "react-router-dom";
import { Plus, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BranchCard } from "./branch-card";
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
 * Properties for the BranchList catalog component.
 */
export interface BranchListProps {
  /**
   * Collection of branches to display.
   */
  branches: Branch[];
  /**
   * Layout presentation mode: card grid or tabular listing.
   */
  viewMode: "grid" | "table";
  /**
   * True when branches data is being loaded from the API.
   */
  isLoading?: boolean;
  /**
   * Map of templateSet IDs to human-readable template set names.
   */
  templatesMap?: Record<string, string>;
  /**
   * Map of preset IDs to human-readable preset names.
   */
  presetsMap?: Record<string, string>;
  /**
   * Optional callback invoked when a user clicks to inspect a branch resume.
   * If omitted, links directly to `/branches/:id/preview`.
   */
  onInspectBranch?: (branch: Branch) => void;
  /**
   * Callback invoked when a user clicks to delete a non-default branch.
   */
  onDeleteBranch: (branch: Branch) => void;
  /**
   * Callback invoked when clicking the button to create a new branch.
   */
  onCreateBranchClick: () => void;
}

/**
 * BranchList Component
 *
 * Renders the collection of resume branches in either a responsive card grid or a detailed table view.
 *
 * Architectural Role:
 * - Provides switching between card-based and tabular visualization modes.
 * - Handles the empty catalog state with an inviting call-to-action.
 * - Enforces Default Branch protections across both view presentations.
 * - Displays status indicators (`active`, `tailoring`, `error`), template names, and version info.
 *
 * Accessibility & WAI-ARIA Considerations:
 * - Table mode renders semantic `<table>`, `<caption>` (accessible via `sr-only`), `<thead>`, and `<th scope="col">`.
 * - Action buttons include accessible labels (`aria-label`) that reference the specific branch name.
 * - Loading indicator uses `role="status"` and `aria-label="Loading resume branches"`.
 * - Default branch badge clearly announces protection status to assistive technologies.
 *
 * @param {BranchListProps} props Component properties.
 * @returns {JSX.Element} The rendered branch list component.
 */
export const BranchList: React.FC<BranchListProps> = ({
  branches,
  viewMode,
  isLoading = false,
  templatesMap = {},
  presetsMap = {},
  onInspectBranch,
  onDeleteBranch,
  onCreateBranchClick,
}) => {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading resume branches"
        className="flex min-h-[300px] items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading branches...</p>
        </div>
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
          <FileText className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          No branches created yet
        </h2>
        <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
          Create role-targeted resume branches to tailor your career history for
          specific positions, companies, or criteria.
        </p>
        <div className="mt-6">
          <Button onClick={onCreateBranchClick} className="flex items-center gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Create Your First Branch</span>
          </Button>
        </div>
      </div>
    );
  }

  if (viewMode === "grid") {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map((branch) => (
          <BranchCard
            key={branch.id}
            branch={branch}
            templateName={templatesMap[branch.template_set_id]}
            presetName={branch.preset_id ? presetsMap[branch.preset_id] : undefined}
            onInspect={onInspectBranch}
            onDelete={onDeleteBranch}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-sm">
        <caption className="sr-only">Resume Branches Catalog</caption>
        <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <tr>
            <th scope="col" className="px-6 py-3.5">
              Branch
            </th>
            <th scope="col" className="px-6 py-3.5">
              Target
            </th>
            <th scope="col" className="px-6 py-3.5">
              Status
            </th>
            <th scope="col" className="px-6 py-3.5">
              Template
            </th>
            <th scope="col" className="px-6 py-3.5">
              Version
            </th>
            <th scope="col" className="px-6 py-3.5">
              Last Modified
            </th>
            <th scope="col" className="px-6 py-3.5 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
          {branches.map((branch) => {
            const isDefault = isDefaultBranch(branch);
            const status = getBranchStatus(branch);
            const formattedDate = formatBranchDate(branch.updated_at);

            return (
              <tr key={branch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/branches/${branch.id}`}
                      className="font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-sm"
                      aria-label={`Open workbench for ${branch.name}`}
                    >
                      {branch.name}
                    </Link>
                    {isDefault && <DefaultBranchBadge iconSize="sm" />}
                  </div>
                  {isDefault && (
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Direct Master Profile (Untailored)
                    </p>
                  )}
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-slate-600 dark:text-slate-300">
                  {isDefault ? (
                    <span className="italic text-slate-400 dark:text-slate-500">Master Data</span>
                  ) : (
                    <BranchTargetDisplay
                      targetCompany={branch.target_company}
                      targetRole={branch.target_role}
                      emptyFallback="—"
                      companyClassName="text-slate-800 dark:text-slate-200"
                    />
                  )}
                </td>

                <td className="whitespace-nowrap px-6 py-4">
                  <BranchStatusBadge status={status} />
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-slate-600 dark:text-slate-300">
                  {templatesMap[branch.template_set_id] || branch.template_set_id}
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-slate-600 dark:text-slate-300">
                  {branch.active_version_id || "v1"}
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-slate-500 dark:text-slate-400">
                  {formattedDate}
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to={`/branches/${branch.id}`}
                        aria-label={`Open workbench for ${branch.name}`}
                      >
                        Workbench
                      </Link>
                    </Button>
                    {onInspectBranch ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onInspectBranch(branch)}
                        aria-label={`Inspect resume for ${branch.name}`}
                      >
                        Inspect
                      </Button>
                    ) : (
                      <Button asChild variant="secondary" size="sm">
                        <Link
                          to={`/branches/${branch.id}/preview`}
                          aria-label={`Inspect resume for ${branch.name}`}
                        >
                          Inspect
                        </Link>
                      </Button>
                    )}
                    {!isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteBranch(branch)}
                        className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300 focus-visible:ring-red-500"
                        aria-label={`Delete branch ${branch.name}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
