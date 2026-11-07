import * as React from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  RefreshCw,
  Layers,
  Sliders,
  Building2,
  Briefcase,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "./badge";
import type { Branch, Preset, TemplateSet } from "@/api/workbench-queries";

/**
 * Props for the TailorActionBar component.
 */
export interface TailorActionBarProps {
  /** The resume branch record being tailored. */
  branch: Branch;
  /** Catalog of available system and user presets. */
  presets?: Preset[];
  /** Catalog of available resume ATS templates. */
  templates?: TemplateSet[];
  /** Flag indicating whether resume generation is actively running or enqueued. */
  isTailoring: boolean;
  /** Flag indicating whether master sync is in progress. */
  isSyncing: boolean;
  /** Flag indicating whether branch settings are currently updating. */
  isUpdating?: boolean;
  /** Callback triggered when user updates the target preset. */
  onUpdatePreset?: (presetId: string) => void;
  /** Callback triggered when user updates the resume ATS template set. */
  onUpdateTemplate?: (templateSetId: string) => void;
  /** Callback triggered when the user clicks 'Tailor Resume'. */
  onTailorResume: () => void;
  /** Callback triggered when the user clicks 'Sync with Master'. */
  onSyncMaster: () => void;
}

/**
 * TailorActionBar provides the primary action surface and metadata summary
 * for a resume branch.
 *
 * Architectural Role:
 * - Displays the branch target role, target company, preset, and template set.
 * - Highlights staleness against upstream master profile revisions.
 * - Enforces double-click and duplicate-trigger prevention by disabling the
 *   'Tailor Resume' mutation button during active generation runs.
 *
 * Accessibility / WAI-ARIA Considerations:
 * - Semantic `<section>` landmark with `aria-label="Branch Actions and Overview"`.
 * - Top-level `<h1>` representing the unique page view context.
 * - Uses `aria-busy` on action buttons during ongoing asynchronous mutation calls.
 * - Focus-visible ring indicators on all interactive elements.
 */
export const TailorActionBar: React.FC<TailorActionBarProps> = ({
  branch,
  presets = [],
  templates = [],
  isTailoring,
  isSyncing,
  isUpdating = false,
  onUpdatePreset,
  onUpdateTemplate,
  onTailorResume,
  onSyncMaster,
}) => {
  const currentPreset = presets.find((p) => p.id === branch.preset_id);
  const currentTemplate = templates.find((t) => t.id === branch.template_set_id);

  return (
    <div className="space-y-4">
      {/* Prominent Stale Branch Sync Banner */}
      {branch.is_stale && (
        <div
          role="alert"
          aria-label="Upstream Master Profile Revisions Available"
          className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-amber-900 dark:text-amber-200 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Upstream Master Profile Revisions Available
                </h2>
                <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                  The Master Profile has updated since this branch was last tailored. Sync now to incorporate the latest experience, skills, and projects.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onSyncMaster}
              disabled={isSyncing || isTailoring}
              aria-busy={isSyncing}
              className="shrink-0 border-amber-400 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-950/60 flex items-center gap-1.5"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>{isSyncing ? "Syncing..." : "Sync with Master Profile"}</span>
            </Button>
          </div>
        </div>
      )}

      <section
        aria-label="Branch Actions and Overview"
        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6"
      >
        {/* Top: Metadata & Context */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {branch.name}
              </h1>
              {branch.is_stale ? (
                <Badge variant="warning">Master Updates Available</Badge>
              ) : (
                <Badge variant="success">Master In Sync</Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
              {branch.target_role && (
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  <span>{branch.target_role}</span>
                </div>
              )}
              {branch.target_company && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  <span>{branch.target_company}</span>
                </div>
              )}
            </div>
          </div>

          {!branch.is_default && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSyncMaster}
              disabled={isSyncing || isTailoring}
              aria-busy={isSyncing}
              className="flex items-center gap-2 self-start sm:self-auto shrink-0"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>{isSyncing ? "Syncing..." : "Sync with Master"}</span>
            </Button>
          )}
        </div>

        {/* RFC-005 Segregated Columns: Content & AI Strategy vs Document Appearance */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Column 1: Content & AI Strategy */}
          <div className="rounded-md border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Content & AI Strategy
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose the tailoring strategy and LLM density directives for this target opportunity.
              </p>

              {!branch.is_default && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <label
                    htmlFor="workbench-preset-select"
                    className="text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Preset:
                  </label>
                  <select
                    id="workbench-preset-select"
                    aria-label="Target Preset"
                    value={branch.preset_id || ""}
                    onChange={(e) => onUpdatePreset?.(e.target.value)}
                    disabled={isUpdating || isTailoring}
                    className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {presets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                    {presets.length === 0 && (
                      <option value={branch.preset_id || ""}>
                        {currentPreset?.name || branch.preset_id || "Default Preset"}
                      </option>
                    )}
                  </select>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button
                onClick={onTailorResume}
                disabled={isTailoring}
                aria-busy={isTailoring}
                className="w-full flex items-center justify-center gap-2"
              >
                {branch.is_default ? (
                  <RefreshCw
                    className={`h-4 w-4 ${isTailoring ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                ) : (
                  <Sparkles
                    className={`h-4 w-4 ${isTailoring ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                )}
                <span>
                  {branch.is_default
                    ? isTailoring
                      ? "Refreshing..."
                      : "Refresh from Master Profile"
                    : isTailoring
                    ? "Tailoring..."
                    : "Tailor Resume"}
                </span>
              </Button>
            </div>
          </div>

          {/* Column 2: Document Appearance */}
          <div className="rounded-md border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Document Appearance
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose the visual layout and ATS formatting without triggering LLM re-tailoring.
              </p>

              <div className="flex flex-col gap-1.5 pt-1">
                <label
                  htmlFor="workbench-template-select"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Template:
                </label>
                <select
                  id="workbench-template-select"
                  aria-label="Resume Template"
                  value={branch.template_set_id || ""}
                  onChange={(e) => onUpdateTemplate?.(e.target.value)}
                  disabled={isUpdating || isTailoring}
                  className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                  {templates.length === 0 && (
                    <option value={branch.template_set_id || ""}>
                      {currentTemplate?.name || branch.template_set_id || "Standard Template"}
                    </option>
                  )}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <Button asChild variant="secondary" className="w-full flex items-center justify-center gap-2">
                <Link
                  to={`/branches/${branch.id}/preview`}
                  aria-label={`Inspect resume for ${branch.name}`}
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  <span>Inspect Resume</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
