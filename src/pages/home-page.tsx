/**
 * @file home-page.tsx
 * @description Primary application Dashboard and Home view for Resumeee.
 *
 * Architectural Role:
 * - Serves as the root index route (`/`) defined in {@link router}.
 * - Aggregates and surfaces live metrics across core domains:
 *   - Master Profile career graph (work experiences, skills, education, projects, certs)
 *   - Tailored Resume Branches (active branches, default branch, recent variants)
 *   - Built-in & Custom ATS Templates catalog
 *   - AI Tailoring Presets catalog
 * - Eliminates dead links and outdated placeholders by connecting all actions to real routes:
 *   - `/profile` (Master Profile editor)
 *   - `/branches` (Branches catalog)
 *   - `/branches/:id` (Branch Workbench)
 *   - `/branches/:id/preview` (Resume Preview & Export)
 *   - `/templates` (Templates catalog)
 *   - `/presets` (Presets catalog)
 * - Embeds accessible {@link CreateBranchModal} for on-demand branch initialization.
 * - Complies with WAI-ARIA landmark structure and WCAG 2.1 AA accessibility guidelines.
 */

import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  GitBranch,
  User,
  Layers,
  Sliders,
  AlertCircle,
  Clock,
  Eye,
  ArrowRight,
  BookOpen,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import {
  DefaultBranchBadge,
  BranchStatusBadge,
  formatBranchDate,
  BranchTargetDisplay,
} from "@/components/branches/branch-shared-elements";
import { CreateBranchModal } from "@/components/branches/create-branch-modal";
import { WorkflowGuide } from "@/components/dashboard/workflow-guide";
import {
  useBranchesQuery,
  usePresetsQuery,
  useTemplatesQuery,
  useCreateBranchMutation,
  isDefaultBranch,
  getBranchStatus,
  formatBranchVersionStatus,
  type CreateBranchInput,
} from "@/api/branch-queries";
import { useFullProfile } from "@/api/profile-queries";

/**
 * Constructs a fast-lookup dictionary mapping entity identifiers to human-readable names.
 *
 * @template T An object type containing optional `id` and `name` string attributes.
 * @param {ReadonlyArray<T>} [items] Collection of entities to index.
 * @returns {Record<string, string>} Dictionary mapping ID to display name.
 */
export function buildIdNameMap<T extends { id?: string; name?: string }>(
  items?: ReadonlyArray<T>
): Record<string, string> {
  if (!items || items.length === 0) {
    return {};
  }
  const map: Record<string, string> = {};
  for (const item of items) {
    if (item.id && item.name) {
      map[item.id] = item.name;
    }
  }
  return map;
}

/**
 * Props for the {@link DashboardStatCard} component.
 */
export interface DashboardStatCardProps {
  /** Title label displayed in the card header */
  title: string;
  /** Lucide icon component rendered in header */
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  /** CSS class applied to icon for styling */
  iconColorClass?: string;
  /** Primary metric count */
  count: number;
  /** Subtitle or explanatory text beneath the count */
  subtext: string;
  /** Destination route path for footer navigation link */
  linkTo: string;
  /** Accessible label text for footer link */
  linkLabel: string;
  /** QA testid attribute for count container */
  testId: string;
  /** Indicates whether the underlying query is currently loading */
  isLoading: boolean;
  /** Accessible label for the loading status skeleton */
  loadingAriaLabel: string;
}

/**
 * Reusable stat card subcomponent displaying an individual domain metric,
 * loading skeleton, and footer navigation seam.
 *
 * @param {DashboardStatCardProps} props Component properties.
 * @returns {JSX.Element} The rendered stat card element.
 */
export const DashboardStatCard: React.FC<DashboardStatCardProps> = ({
  title,
  icon: Icon,
  iconColorClass = "text-indigo-600 dark:text-indigo-400",
  count,
  subtext,
  linkTo,
  linkLabel,
  testId,
  isLoading,
  loadingAriaLabel,
}) => {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center space-x-2">
          <Icon className={`h-4 w-4 ${iconColorClass}`} aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </span>
        </div>

        {isLoading ? (
          <div role="status" aria-label={loadingAriaLabel} className="mt-4 space-y-2 animate-pulse">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
            <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-2/3"></div>
          </div>
        ) : (
          <div className="mt-3">
            <div
              data-testid={testId}
              className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
            >
              {count}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {subtext}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
        <Link
          to={linkTo}
          className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          <span>{linkLabel}</span>
          <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
};


/**
 * HomePage Component
 *
 * Renders the primary executive dashboard displaying live metrics,
 * quick access to recent resume branches, and direct navigation seams.
 *
 * @returns {JSX.Element} The rendered Dashboard view.
 */
export const HomePage: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // TanStack Query asynchronous domain hooks
  const {
    data: branches = [],
    isLoading: isBranchesLoading,
    error: branchesError,
  } = useBranchesQuery();

  const {
    data: profileSnapshot,
    isLoading: isProfileLoading,
    error: profileError,
  } = useFullProfile();

  const {
    data: presets = [],
    isLoading: isPresetsLoading,
    error: presetsError,
  } = usePresetsQuery();

  const {
    data: templates = [],
    isLoading: isTemplatesLoading,
    error: templatesError,
  } = useTemplatesQuery();

  const navigate = useNavigate();
  const createMutation = useCreateBranchMutation();

  /**
   * Fast lookup dictionaries mapping entity IDs to human-readable names.
   */
  const templatesMap = useMemo(() => buildIdNameMap(templates), [templates]);
  const presetsMap = useMemo(() => buildIdNameMap(presets), [presets]);

  /**
   * Recent branches sorted by updated_at descending, capped to top 4 for dashboard display.
   */
  const recentBranches = useMemo(() => {
    const sorted = [...branches].sort((a, b) => {
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateB - dateA;
    });
    return sorted.slice(0, 4);
  }, [branches]);

  /**
   * Aggregates active query error messages to prevent masking failures.
   */
  const activeErrors = useMemo(() => {
    const list: string[] = [];
    if (branchesError?.message) list.push(`Branches: ${branchesError.message}`);
    if (profileError?.message) list.push(`Master Profile: ${profileError.message}`);
    if (templatesError?.message) list.push(`Templates: ${templatesError.message}`);
    if (presetsError?.message) list.push(`Presets: ${presetsError.message}`);
    return list;
  }, [branchesError, profileError, templatesError, presetsError]);

  /**
   * Dispatches branch creation to the mutation hook, closes modal, and routes to workbench.
   *
   * @param {CreateBranchInput} input Validated branch payload.
   */
  const handleCreateBranch = async (input: CreateBranchInput) => {
    const newBranch = await createMutation.mutateAsync(input);
    setIsCreateModalOpen(false);
    if (newBranch?.id) {
      navigate(`/branches/${newBranch.id}`);
    }
  };

  const profile = profileSnapshot?.profile;
  const experiencesCount = profileSnapshot?.experiences?.length ?? 0;
  const skillsCount = profileSnapshot?.skills?.length ?? 0;
  const projectsCount = profileSnapshot?.projects?.length ?? 0;
  const educationCount = profileSnapshot?.education?.length ?? 0;
  const certificationsCount = profileSnapshot?.certifications?.length ?? 0;
  const masterRevision = profileSnapshot?.master_revision ?? 1;

  const profileFullName = profile?.full_name?.trim() || "";

  return (
    <div className="space-y-8">
      {/* Page Header Landmark */}
      <PageHeader
        title="Resume Management Dashboard"
        description="Create, branch, and tailor ATS-optimized resumes with AI LLM models."
        icon={LayoutDashboard}
        actions={
          <>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Create Branch</span>
            </Button>

            <Button variant="outline" asChild>
              <Link to="/profile" className="flex items-center space-x-2">
                <User className="h-4 w-4" aria-hidden="true" />
                <span>Master Profile</span>
              </Link>
            </Button>
          </>
        }
      />

      {/* Global Query Error Banner */}
      {activeErrors.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-800 dark:text-red-300 flex items-start gap-3"
        >
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-medium">Error loading dashboard data</p>
            <ul className="list-disc pl-4 text-xs space-y-0.5">
              {activeErrors.map((errMsg, index) => (
                <li key={index}>{errMsg}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Overview Metrics Grid */}
      <section aria-labelledby="metrics-overview-heading" className="space-y-4">
        <h2 id="metrics-overview-heading" className="sr-only">
          Workspace Metrics Overview
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Master Profile Health */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Master Profile
                  </span>
                </div>
                <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-700/10 dark:ring-indigo-700/30">
                  Rev #{masterRevision}
                </span>
              </div>

              {isProfileLoading ? (
                <div role="status" aria-label="Loading master profile details" className="mt-4 space-y-2 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-1/2"></div>
                </div>
              ) : (
                <div className="mt-3">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {profileFullName || "Core Master Profile"}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                    {profile?.headline || "Primary career graph & resume foundation"}
                  </p>

                  <div className="mt-3 grid grid-cols-5 gap-1 border-t border-slate-100 dark:border-slate-800 pt-2.5 text-center">
                    <div>
                      <div data-testid="metric-experiences" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {experiencesCount}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                        Exp
                      </div>
                    </div>
                    <div>
                      <div data-testid="metric-skills" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {skillsCount}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                        Skills
                      </div>
                    </div>
                    <div>
                      <div data-testid="metric-projects" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {projectsCount}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                        Proj
                      </div>
                    </div>
                    <div>
                      <div data-testid="metric-education" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {educationCount}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                        Edu
                      </div>
                    </div>
                    <div>
                      <div data-testid="metric-certifications" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {certificationsCount}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">
                        Certs
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
              <Link
                to="/profile"
                className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                <span>Edit Profile</span>
                <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Card 2: Resume Branches */}
          <DashboardStatCard
            title="Resume Branches"
            icon={GitBranch}
            iconColorClass="text-emerald-600 dark:text-emerald-400"
            count={branches.length}
            subtext="Tailored job variants & active master line"
            linkTo="/branches"
            linkLabel="View All Branches"
            testId="metric-total-branches"
            isLoading={isBranchesLoading}
            loadingAriaLabel="Loading branch counts"
          />

          {/* Card 3: ATS Templates */}
          <DashboardStatCard
            title="ATS Templates"
            icon={Layers}
            iconColorClass="text-blue-600 dark:text-blue-400"
            count={templates.length}
            subtext="Built-in & custom multi-format templates"
            linkTo="/templates"
            linkLabel="Browse Templates"
            testId="metric-total-templates"
            isLoading={isTemplatesLoading}
            loadingAriaLabel="Loading template counts"
          />

          {/* Card 4: Targeting Presets */}
          <DashboardStatCard
            title="Targeting Presets"
            icon={Sliders}
            iconColorClass="text-amber-600 dark:text-amber-400"
            count={presets.length}
            subtext="Reusable prompting and length constraints"
            linkTo="/presets"
            linkLabel="Manage Presets"
            testId="metric-total-presets"
            isLoading={isPresetsLoading}
            loadingAriaLabel="Loading preset counts"
          />
        </div>
      </section>

      {/* Workflow Architecture & Readiness Guide */}
      <WorkflowGuide
        profileSnapshot={profileSnapshot}
        branches={branches}
        templates={templates}
        presets={presets}
        onCreateBranch={() => setIsCreateModalOpen(true)}
      />

      {/* Recent Resume Branches Section */}
      <section aria-labelledby="recent-branches-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="recent-branches-heading"
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            Recent Resume Branches
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/branches" className="text-xs flex items-center space-x-1">
              <span>View All Branches</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {isBranchesLoading ? (
          <div
            role="status"
            aria-label="Loading resume branches"
            className="grid gap-4 sm:grid-cols-2"
          >
            {[1, 2].map((idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 animate-pulse space-y-4"
              >
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded w-3/4"></div>
                <div className="h-8 bg-slate-100 dark:bg-slate-800/40 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : branches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-8 text-center space-y-3">
            <BookOpen className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              No resume branches yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Create your first branch to start tailoring your resume for target job postings with automated AI models.
            </p>
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2"
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              <span>Create your first branch</span>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2" data-testid="recent-branches-list">
            {recentBranches.map((branch) => {
              const isDefault = isDefaultBranch(branch);
              const status = getBranchStatus(branch);
              const versionStatus = formatBranchVersionStatus(branch);
              const formattedDate = formatBranchDate(branch.updated_at);
              const templateName = templatesMap[branch.template_set_id] || branch.template_set_id;
              const presetName = branch.preset_id ? presetsMap[branch.preset_id] : undefined;

              return (
                <article
                  key={branch.id}
                  aria-labelledby={`branch-heading-${branch.id}`}
                  className="flex flex-col justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            id={`branch-heading-${branch.id}`}
                            className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100"
                          >
                            <Link
                              to={`/branches/${branch.id}`}
                              className="hover:text-indigo-600 dark:hover:text-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-sm"
                            >
                              {branch.name}
                            </Link>
                          </h3>
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
                              emptyFallback="Untargeted role"
                              companyClassName="font-medium text-slate-700 dark:text-slate-200"
                            />
                          </p>
                        )}
                      </div>

                      <div>
                        <BranchStatusBadge status={status} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 truncate">
                        <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          Template: <strong className="font-medium text-slate-700 dark:text-slate-300">{templateName}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 truncate">
                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          Updated: <span className="text-slate-700 dark:text-slate-300">{formattedDate}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 truncate">
                        <GitBranch className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          Version: <strong className="font-medium text-slate-700 dark:text-slate-300">{versionStatus}</strong>
                        </span>
                      </div>

                      {presetName && (
                        <div className="flex items-center gap-1.5 truncate text-slate-500 dark:text-slate-400">
                          <Sliders className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                          <span className="truncate">
                            Strategy: <strong className="font-medium text-slate-700 dark:text-slate-300">{presetName}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to={`/branches/${branch.id}`}
                        aria-label={`Open workbench for ${branch.name}`}
                        className="flex items-center gap-1.5"
                      >
                        <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Workbench</span>
                      </Link>
                    </Button>

                    <Button asChild variant="secondary" size="sm">
                      <Link
                        to={`/branches/${branch.id}/preview`}
                        aria-label={`Preview resume for ${branch.name}`}
                        className="flex items-center gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Preview</span>
                      </Link>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Accessible Create Branch Modal */}
      <CreateBranchModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        existingBranches={branches}
        presets={presets}
        templates={templates}
        onSubmit={handleCreateBranch}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
};
