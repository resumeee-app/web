import * as React from "react";
import { Link, useInRouterContext } from "react-router-dom";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  /** Flag indicating whether branch settings are currently updating. */
  isUpdating?: boolean;
  /** Flag indicating whether this branch has at least one completed version ready for preview. */
  hasCompletedVersions?: boolean;
  /** Active version number to target for Inspect Resume navigation. */
  activeVersionNumber?: number;
  /** Live visual confirmation message displayed after updating layout template. */
  templateFeedback?: string | null;
  /** Callback triggered to preview current layout in quick modal dialog. */
  onPreviewLayout?: () => void;
  /** Callback triggered when user updates the target preset. */
  onUpdatePreset?: (presetId: string) => void;
  /** Callback triggered when user updates the resume ATS template set. */
  onUpdateTemplate?: (templateSetId: string) => void;
  /** Callback triggered when the user clicks 'Tailor Resume' or 'Sync with Main'. */
  onTailorResume: () => void;
  /** Optional heading level for the primary branch heading. Defaults to "h1". */
  headingLevel?: "h1" | "h2" | "h3";
  /** When true, avoids Router <Link> navigation for standalone / locked previews. */
  disableNavigation?: boolean;
  /** When true, configures non-navigating preview mode with opt-in interactive Tailor Resume button. */
  previewOnly?: boolean;
  /** When true, highlights the preview Tailor Resume button with an interactive callout ring. */
  highlightTailorButton?: boolean;
  /** Disables the preview Tailor Resume button once completed in guided tour previews. */
  disableTailorButton?: boolean;
}

/**
 * TailorActionBar provides the primary action surface and metadata summary
 * for a resume branch.
 *
 * Architectural Role:
 * - Displays the branch target role, target company, preset, and template set.
 * - Highlights staleness against upstream main profile revisions.
 * - Enforces double-click and duplicate-trigger prevention by disabling the
 *   'Tailor Resume' / 'Sync with Main' mutation button during active generation runs.
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
  isUpdating = false,
  hasCompletedVersions = true,
  activeVersionNumber,
  templateFeedback,
  onPreviewLayout,
  onUpdatePreset,
  onUpdateTemplate,
  onTailorResume,
  headingLevel = "h1",
  disableNavigation = false,
  previewOnly = false,
  highlightTailorButton = false,
  disableTailorButton = false,
}) => {
  const inRouter = useInRouterContext();
  const canNavigate = inRouter && !disableNavigation && !previewOnly;
  const HeadingTag = headingLevel;
  const AlertHeadingTag: "h2" | "h3" = headingLevel === "h1" ? "h2" : headingLevel;
  const SubHeadingTag: "h2" | "h3" | "h4" =
    headingLevel === "h1" ? "h2" : headingLevel === "h2" ? "h3" : "h4";
  const currentPreset = presets.find((p) => p.id === branch.preset_id);
  const currentTemplate = templates.find((t) => t.id === branch.template_set_id);
  const isHighlightedPreviewAction =
    highlightTailorButton && !isTailoring && !disableTailorButton;

  return (
    <div className="space-y-4">
      {/* Prominent Stale Branch Sync Banner */}
      {branch.is_stale && (
        <div
          role="alert"
          aria-label="Upstream Main Profile Revisions Available"
          className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-amber-900 dark:text-amber-200 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <div>
              <AlertHeadingTag className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Upstream Main Profile Revisions Available
              </AlertHeadingTag>
              <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                The Main Profile has updated since this branch was last tailored. Use "Sync with Main" below to incorporate the latest experience, skills, and projects.
              </p>
            </div>
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
              <HeadingTag className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {branch.name}
              </HeadingTag>
              {branch.is_stale ? (
                <Badge variant="warning">Main Updates Available</Badge>
              ) : (
                <Badge variant="success">Main In Sync</Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700 dark:text-slate-300">
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
        </div>

        {/* RFC-005 Segregated Columns: Content & AI Strategy vs Document Appearance */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Column 1: Content & AI Strategy */}
            <div className="rounded-md border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  <SubHeadingTag className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Content & AI Strategy
                  </SubHeadingTag>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  Choose the tailoring strategy (AI prompt directives and density constraints) for this target opportunity.
                </p>

                {!branch.is_default && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <label
                      htmlFor="workbench-preset-select"
                      className="text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Tailoring Strategy:
                    </label>
                    <select
                      id="workbench-preset-select"
                      aria-label="Tailoring Strategy"
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
                          {currentPreset?.name || branch.preset_id || "Default Strategy"}
                        </option>
                      )}
                    </select>
                  </div>
                )}
              </div>

              <div
                className={
                  isHighlightedPreviewAction
                    ? "rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50/90 dark:bg-indigo-950/70 p-2 space-y-1.5 ring-2 ring-indigo-500/70 dark:ring-indigo-400/70 shadow-sm transition-all"
                    : "pt-2"
                }
              >
                {isHighlightedPreviewAction && (
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                    <span
                      className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse"
                      aria-hidden="true"
                    />
                    <span>Click below to tailor</span>
                  </p>
                )}
                <Button
                  type="button"
                  data-preview-interactive={
                    previewOnly || highlightTailorButton ? "true" : undefined
                  }
                  onClick={onTailorResume}
                  disabled={isTailoring || disableTailorButton}
                  aria-busy={isTailoring}
                  className={
                    previewOnly || highlightTailorButton
                      ? "pointer-events-auto w-full flex items-center justify-center gap-2"
                      : "w-full flex items-center justify-center gap-2"
                  }
                >
                  {branch.is_default || branch.is_stale ? (
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
                        : "Refresh from Main Profile"
                      : branch.is_stale
                      ? isTailoring
                        ? "Syncing..."
                        : "Sync with Main"
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
                  <SubHeadingTag className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Document Appearance
                  </SubHeadingTag>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  Choose the template set (visual Go template layout and ATS styling) without modifying resume content.
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

                {templateFeedback ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{templateFeedback}</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-slate-300">
                    Active layout:{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {currentTemplate?.name || branch.template_set_id || "Standard Template"}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                {hasCompletedVersions ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    {onPreviewLayout && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onPreviewLayout}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs"
                        aria-label="Preview layout in modal"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Quick Preview</span>
                      </Button>
                    )}
                    {canNavigate ? (
                      <Button asChild variant="secondary" size="sm" className="flex-1 flex items-center justify-center gap-1.5 text-xs">
                        <Link
                          to={
                            activeVersionNumber !== undefined
                              ? `/branches/${branch.id}/preview?version=${activeVersionNumber}`
                              : `/branches/${branch.id}/preview`
                          }
                          aria-label={`Inspect resume for ${branch.name}`}
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Inspect Resume</span>
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        aria-label={`Inspect resume for ${branch.name}`}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Inspect Resume</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-full block">
                          <Button
                            type="button"
                            variant="secondary"
                            disabled
                            aria-disabled="true"
                            className="w-full flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                            <span>Inspect Resume</span>
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Tailor resume first to preview</p>
                      </TooltipContent>
                    </Tooltip>
                    <p className="mt-1.5 text-center text-xs text-slate-500 dark:text-slate-300">
                      Tailor resume first to preview.
                    </p>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>
      </section>
    </div>
  );
};
