/**
 * @file workflow-guide.tsx
 * @description Dashboard orientation guide illustrating Resumeee's core workflow
 * and tracking live career graph readiness milestones.
 *
 * Architectural Role:
 * - Educates users on the three-phase resume tailoring lifecycle:
 *   1. Curate Canonical Main Career Graph
 *   2. Calibrate Targeting Presets & ATS Templates
 *   3. Branch, Tailor & Verify with Factual Provenance
 * - Evaluates real-time workspace readiness across four core criteria:
 *   - Profile identity basics (full name and headline)
 *   - Career graph depth (work experience and verified skills)
 *   - Tailoring strategies (presets and templates catalog)
 *   - Active job target branch creation
 * - Provides collapsible controls with localStorage persistence to keep
 *   experienced user dashboards clean and uncluttered.
 * - Complies with WAI-ARIA landmark navigation and WCAG 2.1 AA accessibility standards.
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Compass,
  User,
  Sliders,
  GitBranch,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isDefaultBranch,
  type Branch,
  type Preset,
  type TemplateSet,
} from "@/api/branch-queries";
import type { components } from "@/api/schema";

/**
 * Props accepted by the {@link WorkflowGuide} component.
 */
export interface WorkflowGuideProps {
  /** Current snapshot of the user's main career profile */
  profileSnapshot?: components["schemas"]["MainProfileSnapshot"];
  /** List of existing resume branches */
  branches?: ReadonlyArray<Branch>;
  /** Catalog of ATS template sets */
  templates?: ReadonlyArray<TemplateSet>;
  /** Catalog of AI targeting presets */
  presets?: ReadonlyArray<Preset>;
  /** Callback fired when user triggers branch creation from the guide */
  onCreateBranch: () => void;
  /** Optional custom CSS class name */
  className?: string;
}

const STORAGE_KEY = "resumeee_hide_workflow_guide";

/**
 * Evaluates whether a branch represents a role-specific tailored branch
 * rather than the untailored main default.
 */
function isRoleSpecificBranch(branch: Branch): boolean {
  return !isDefaultBranch(branch);
}

/**
 * WorkflowGuide Component
 *
 * Renders an orientation guide and real-time workspace readiness progress bar
 * directly on the main dashboard view.
 *
 * @param {WorkflowGuideProps} props Component properties.
 * @returns {JSX.Element} Rendered workflow guide section.
 */
export const WorkflowGuide: React.FC<WorkflowGuideProps> = ({
  profileSnapshot,
  branches = [],
  templates = [],
  presets = [],
  onCreateBranch,
  className = "",
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Fallback gracefully if localStorage is restricted
    }
  };

  const profile = profileSnapshot?.profile;
  const experiencesCount = profileSnapshot?.experiences?.length ?? 0;
  const skillsCount = profileSnapshot?.skills?.length ?? 0;

  // Milestone readiness evaluations
  const hasProfileBasics = Boolean(
    profile?.full_name?.trim() && profile?.headline?.trim()
  );
  const hasCareerGraph = experiencesCount >= 1 && skillsCount >= 3;
  const hasTemplatesAndPresets = templates.length > 0 && presets.length > 0;
  const hasTailoredBranch = branches.some(isRoleSpecificBranch);

  const milestones = [
    {
      id: "milestone-profile-basics",
      title: "Profile Basics",
      description: "Full name & headline defined",
      isComplete: hasProfileBasics,
      actionText: "Complete Profile",
      actionHref: "/profile",
    },
    {
      id: "milestone-career-graph",
      title: "Career Graph",
      description: "At least 1 experience & 3 skills",
      isComplete: hasCareerGraph,
      actionText: "Add Experiences & Skills",
      actionHref: "/profile",
    },
    {
      id: "milestone-presets-templates",
      title: "Tailoring Strategies",
      description: "Presets & ATS templates ready",
      isComplete: hasTemplatesAndPresets,
      actionText: "Configure Presets",
      actionHref: "/presets",
    },
    {
      id: "milestone-role-branch",
      title: "First Role Branch",
      description: "Active tailored branch created",
      isComplete: hasTailoredBranch,
      actionText: "Start Branch",
      onActionClick: onCreateBranch,
      actionHref: undefined,
    },
  ];

  const completedCount = milestones.filter((m) => m.isComplete).length;
  const totalCount = milestones.length;
  const readinessPercentage = Math.round((completedCount / totalCount) * 100);

  return (
    <section
      aria-labelledby="workflow-guide-heading"
      className={`rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all ${className}`}
    >
      {/* Header and Toggle Controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 p-1.5 text-indigo-600 dark:text-indigo-400">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="workflow-guide-heading"
              className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100"
            >
              How Resumeee Works
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Architecture & setup progress guide
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isCollapsed && (
            <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-900 dark:text-slate-100">
                Readiness: {completedCount}/{totalCount}
              </span>
              <span>({readinessPercentage}%)</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            aria-expanded={!isCollapsed}
            aria-controls="workflow-guide-content"
            className="flex items-center space-x-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
                <span>Show Guide</span>
              </>
            ) : (
              <>
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
                <span>Hide Guide</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Expandable Body */}
      {!isCollapsed && (
        <div id="workflow-guide-content" className="mt-5 space-y-6">
          {/* Three Core Architectural Pillars */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Pillar 1: Main Career Graph */}
            <div className="rounded-md border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center rounded bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                    Step 1
                  </span>
                  <User className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Main Career Graph
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Consolidate your full work history, verified skills, and achievements in one single source of truth.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800">
                <Link
                  to="/profile"
                  className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  <span>Manage Profile</span>
                  <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Pillar 2: Presets & Templates */}
            <div className="rounded-md border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center rounded bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Step 2
                  </span>
                  <Sliders className="h-4 w-4 text-amber-500" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Targeting Presets & Templates
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Calibrate AI instructions, tone, and length constraints paired with ATS-tested layouts for each target position.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                <Link
                  to="/presets"
                  className="inline-flex items-center text-xs font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  <span>Presets</span>
                  <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
                </Link>
                <Link
                  to="/templates"
                  className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <span>Templates</span>
                  <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Pillar 3: Branch, Tailor & Verify */}
            <div className="rounded-md border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center rounded bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Step 3
                  </span>
                  <GitBranch className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Branch, Tailor & Verify
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Create role variants, run AI gap analysis with guaranteed provenance citations, and export verified ATS resumes.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onCreateBranch}
                  className="inline-flex items-center text-xs font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  <span>Start New Branch</span>
                  <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Workspace Readiness Milestone Tracker */}
          <div className="rounded-md border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 p-4 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Workspace Readiness
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {completedCount} of {totalCount} milestones completed ({readinessPercentage}%)
                </p>
              </div>

              {completedCount === totalCount ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-600/20">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>100% Ready for Tailoring</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <span>{readinessPercentage}% Complete</span>
                </span>
              )}
            </div>

            {/* Visual Progress Bar */}
            <div
              role="progressbar"
              aria-label="Workspace readiness progress"
              aria-valuenow={readinessPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
            >
              <div
                className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300 ease-out"
                style={{ width: `${readinessPercentage}%` }}
              />
            </div>

            {/* Milestone Cards Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {milestones.map((item) => (
                <div
                  key={item.id}
                  className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 flex flex-col justify-between space-y-2 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                        {item.title}
                      </span>
                      {item.isComplete ? (
                        <CheckCircle2
                          className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0"
                          aria-label={`${item.title} completed`}
                        />
                      ) : (
                        <Circle
                          className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0"
                          aria-label={`${item.title} pending`}
                        />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {item.description}
                    </p>
                  </div>

                  {!item.isComplete && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      {item.actionHref ? (
                        <Link
                          to={item.actionHref}
                          className="inline-flex items-center text-[11px] font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          <span>{item.actionText}</span>
                          <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
                        </Link>
                      ) : item.onActionClick ? (
                        <button
                          type="button"
                          onClick={item.onActionClick}
                          className="inline-flex items-center text-[11px] font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
                          <span>{item.actionText}</span>
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
