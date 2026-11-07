import * as React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, AlertCircle, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ToastProvider,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastViewport,
} from "@/components/workbench/workbench-toast";
import {
  useBranch,
  useBranchVersions,
  usePresets,
  useTemplates,
  useSetActiveVersion,
  useUpdateBranch,
  useSyncBranch,
} from "@/api/workbench-queries";
import {
  useGenerateVersion,
  useVersionPoll,
  isTerminalStatus,
  type BranchVersion,
} from "@/api/generation-queries";
import { useCreateFact, useFullProfile } from "@/api/profile-queries";
import { TailorActionBar } from "@/components/workbench/tailor-action-bar";
import { GenerationProgress } from "@/components/workbench/generation-progress";
import { VersionTimeline } from "@/components/workbench/version-timeline";
import { GapAnalysisCard, type GapItem } from "@/components/workbench/gap-analysis-card";
import { BranchContextEditor } from "@/components/workbench/branch-context-editor";
import { PromptPreviewCard } from "@/components/workbench/prompt-preview-card";

/**
 * Toast state tracking notifications triggered by asynchronous operations.
 */
interface ToastState {
  open: boolean;
  title: string;
  description: string;
  variant: "default" | "destructive" | "success";
}

/**
 * Props for BranchWorkbenchPage component.
 */
export interface BranchWorkbenchPageProps {
  /** Optional polling interval override in ms (useful for fast automated tests). */
  pollIntervalMs?: number;
}

/**
 * BranchWorkbenchPage is the primary interactive workbench view for a resume branch.
 *
 * It provides:
 * 1. Branch metadata, staleness indicator, and preset/template configuration.
 * 2. Primary "Tailor Resume" action triggering asynchronous LLM generation (`POST /branches/{id}/generate`).
 * 3. Live polling state machine (`GET /branches/{id}/versions/{v}`) powered by TanStack Query refetchInterval.
 * 4. Double-click prevention by locking the tailoring button during active generation mutations and polling.
 * 5. Upstream master profile sync trigger (`POST /branches/sync`).
 * 6. Historical version timeline with active version pointer promotion (`PUT /branches/{id}`).
 * 7. LLM gap analysis inspection with ATS match score and recommendations.
 *
 * Accessibility / WAI-ARIA Considerations:
 * - Landmark `<main>` region with logical heading hierarchy (`h1` for branch name, `h2` for sections).
 * - Live status announcements (`aria-live="polite"`) during asynchronous generation polling.
 * - Keyboard operable version selection and active version toggles.
 * - WCAG 2.1 AA compliant colors and contrast for badges and interactive controls.
 */
export const BranchWorkbenchPage: React.FC<BranchWorkbenchPageProps> = ({
  pollIntervalMs,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const branchId = id || "";

  // Core Queries
  const {
    data: branch,
    isLoading: isBranchLoading,
    error: branchError,
  } = useBranch(branchId);

  const { data: versions = [], refetch: refetchVersions } =
    useBranchVersions(branchId);

  const { data: presets = [] } = usePresets();
  const { data: templates = [] } = useTemplates();

  // Determine whether branch has any completed versions ready for preview
  const hasCompletedVersions = React.useMemo(() => {
    return versions.some(
      (v) => v.status === "completed" || v.status === "completed_with_warnings"
    );
  }, [versions]);

  // Active generation polling version UUID
  const [pollingVersionId, setPollingVersionId] = React.useState<string | null>(
    null
  );

  // Selected version for inspection (defaults to active version, latest version, or currently polling version)
  const [selectedVersion, setSelectedVersion] =
    React.useState<BranchVersion | null>(null);

  // Reset polling and selection state when navigating between branches
  React.useEffect(() => {
    setPollingVersionId(null);
    setSelectedVersion(null);
  }, [branchId]);

  // Accessible Toast Notification State
  const [toast, setToast] = React.useState<ToastState>({
    open: false,
    title: "",
    description: "",
    variant: "default",
  });

  // Polling query hook
  const { data: polledVersion } = useVersionPoll(branchId, pollingVersionId, {
    enabled: Boolean(pollingVersionId),
    refetchIntervalMs: pollIntervalMs,
  });

  // Mutations
  const generateMutation = useGenerateVersion(branchId);
  const setActiveMutation = useSetActiveVersion(branchId);
  const syncMutation = useSyncBranch(branchId);
  const updateMutation = useUpdateBranch(branchId);
  const createFactMutation = useCreateFact();
  const { data: fullProfile } = useFullProfile();

  // Synchronize polled version transitions
  React.useEffect(() => {
    if (!polledVersion) return;

    if (isTerminalStatus(polledVersion.status)) {
      setPollingVersionId(null);
      void refetchVersions();

      if (polledVersion.status === "completed") {
        setToast({
          open: true,
          title: "Tailoring Completed",
          description: `Resume version v${polledVersion.version_number} was successfully generated.`,
          variant: "success",
        });
        setSelectedVersion(polledVersion);
      } else if (polledVersion.status === "completed_with_warnings") {
        setToast({
          open: true,
          title: "Generation Completed with Warnings",
          description: `Version v${polledVersion.version_number} generated with validation warnings. Review the report below.`,
          variant: "default",
        });
        setSelectedVersion(polledVersion);
      } else if (polledVersion.status === "failed") {
        setToast({
          open: true,
          title: "Generation Failed",
          description:
            polledVersion.error_message ||
            "The AI tailoring worker encountered an unrecoverable failure.",
          variant: "destructive",
        });
      }
    }
  }, [polledVersion, refetchVersions]);

  // Determine current active version to display in Gap Analysis
  const activeVersion = React.useMemo(() => {
    if (selectedVersion) return selectedVersion;
    if (branch?.active_version_id && versions.length > 0) {
      const match = versions.find((v) => v.id === branch.active_version_id);
      if (match) return match;
    }
    return versions.length > 0 ? versions[0] : null;
  }, [selectedVersion, branch?.active_version_id, versions]);

  // Handlers
  const handleTailorResume = async () => {
    try {
      const enqueued = await generateMutation.mutateAsync();
      setPollingVersionId(enqueued.version_id);
      setToast({
        open: true,
        title: "Tailoring Job Enqueued",
        description: enqueued.message || "Generation job accepted by worker queue.",
        variant: "default",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to enqueue tailoring job";
      setToast({
        open: true,
        title: "Tailoring Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleSyncMaster = async () => {
    try {
      const result = await syncMutation.mutateAsync();
      setToast({
        open: true,
        title: "Master Profile Synced",
        description: `Enqueued ${result.enqueued_count} branch sync jobs.`,
        variant: "success",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to sync branch with master";
      setToast({
        open: true,
        title: "Sync Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleSetActiveVersion = async (versionId: string) => {
    try {
      await setActiveMutation.mutateAsync(versionId);
      setToast({
        open: true,
        title: "Active Version Updated",
        description: "Promoted version as the branch primary active version.",
        variant: "success",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to set active version";
      setToast({
        open: true,
        title: "Error Setting Active Version",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleUpdatePreset = async (presetId: string) => {
    try {
      await updateMutation.mutateAsync({ preset_id: presetId });
      setToast({
        open: true,
        title: "Preset Updated",
        description: "Target preset updated for this branch.",
        variant: "success",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update target preset";
      setToast({
        open: true,
        title: "Preset Update Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateTemplate = async (templateId: string) => {
    try {
      await updateMutation.mutateAsync({ template_set_id: templateId });
      setToast({
        open: true,
        title: "Template Updated",
        description: "Resume template set updated for this branch.",
        variant: "success",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update template set";
      setToast({
        open: true,
        title: "Template Update Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  // Live draft context from context editor for reactive prompt previews
  const [draftContext, setDraftContext] = React.useState<{
    target_role?: string;
    target_company?: string;
    target_requirements?: string;
    branch_instructions?: string;
  } | null>(null);

  const handleSaveContext = async (data: {
    target_role?: string;
    target_company?: string;
    target_requirements: string;
    branch_instructions: string;
  }) => {
    try {
      await updateMutation.mutateAsync(data);
      setDraftContext(null);
      setToast({
        open: true,
        title: "Context Saved",
        description: "Target requirements and instructions updated successfully.",
        variant: "success",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update branch context";
      setToast({
        open: true,
        title: "Error Saving Context",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleSelectVersion = (ver: BranchVersion) => {
    setSelectedVersion(ver);
    navigate(`/branches/${branchId}/preview?version=${ver.version_number}`);
  };

  const handleCompareVersion = (ver: BranchVersion) => {
    navigate(`/branches/${branchId}/preview?tab=diff&version=${ver.version_number}`);
  };

  const handleQuickAddFact = async (_gap: GapItem, factText: string) => {
    try {
      let ownerId = "";
      let ownerType: "work_experience" | "project" | "education" = "work_experience";

      if (fullProfile?.experiences && fullProfile.experiences.length > 0 && fullProfile.experiences[0]?.id) {
        ownerId = fullProfile.experiences[0].id;
        ownerType = "work_experience";
      } else if (fullProfile?.projects && fullProfile.projects.length > 0 && fullProfile.projects[0]?.id) {
        ownerId = fullProfile.projects[0].id;
        ownerType = "project";
      } else if (fullProfile?.education && fullProfile.education.length > 0 && fullProfile.education[0]?.id) {
        ownerId = fullProfile.education[0].id;
        ownerType = "education";
      }

      if (!ownerId) {
        setToast({
          open: true,
          title: "No Career Profile Entity",
          description: "Please add a work experience or project to your master profile before adding facts.",
          variant: "destructive",
        });
        return;
      }

      await createFactMutation.mutateAsync({
        owner_id: ownerId,
        owner_type: ownerType,
        statement: factText,
      });

      setToast({
        open: true,
        title: "Experience Recorded",
        description: `Recorded "${factText.slice(0, 40)}..." to master profile. Re-tailor to reflect in resume.`,
        variant: "success",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to record fact to master profile";
      setToast({
        open: true,
        title: "Failed to Record Experience",
        description: message,
        variant: "destructive",
      });
    }
  };

  // Double-click prevention: button is disabled while mutation is pending or polling in progress
  const isTailoring =
    generateMutation.isPending ||
    Boolean(
      pollingVersionId &&
        polledVersion &&
        !isTerminalStatus(polledVersion.status)
    );

  if (isBranchLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-[400px] flex-col items-center justify-center space-y-4"
      >
        <Loader2
          className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Loading branch workbench...
        </p>
      </div>
    );
  }

  if (branchError || !branch) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-6 text-center"
      >
        <AlertCircle className="mx-auto h-8 w-8 text-rose-600 dark:text-rose-400" aria-hidden="true" />
        <h2 className="mt-2 text-base font-semibold text-rose-900 dark:text-rose-200">
          Branch Not Found
        </h2>
        <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
          The requested resume branch could not be loaded or may have been deleted.
        </p>
        <div className="mt-4">
          <Button variant="outline" asChild>
            <Link to="/branches">Back to Branches</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="space-y-6">
        {/* Navigation Breadcrumb / Back Link */}
        <nav aria-label="Breadcrumb">
          <Link
            to="/branches"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Branches</span>
          </Link>
        </nav>

        {/* Workbench Header & Action Bar */}
        <TailorActionBar
          branch={branch}
          presets={presets}
          templates={templates}
          hasCompletedVersions={hasCompletedVersions}
          isTailoring={isTailoring}
          isSyncing={syncMutation.isPending}
          isUpdating={updateMutation.isPending}
          onUpdatePreset={handleUpdatePreset}
          onUpdateTemplate={handleUpdateTemplate}
          onTailorResume={handleTailorResume}
          onSyncMaster={handleSyncMaster}
        />

        {/* Job Description & Custom Context Editor */}
        {branch.is_default ? (
          <section
            aria-label="Master Profile Direct Projection"
            className="rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 p-6 shadow-sm text-sm text-indigo-950 dark:text-indigo-200"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
                  Master Profile Direct Projection
                </h2>
                <p className="text-xs text-indigo-800 dark:text-indigo-300">
                  This default branch mirrors your authoritative master career profile with 100% fidelity and zero LLM modifications. Changing the template set re-renders the canonical resume immediately.
                </p>
              </div>
              {hasCompletedVersions ? (
                <Button asChild size="sm" className="shrink-0 flex items-center gap-1.5">
                  <Link
                    to={`/branches/${branch.id}/preview`}
                    aria-label="Inspect Master Resume"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    <span>Inspect Master Resume</span>
                  </Link>
                </Button>
              ) : (
                <Button
                  disabled
                  aria-disabled="true"
                  size="sm"
                  className="shrink-0 flex items-center gap-1.5 cursor-not-allowed opacity-60"
                  aria-label="Inspect Master Resume (Refresh to generate master version)"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  <span>Inspect Master Resume</span>
                </Button>
              )}
            </div>
          </section>
        ) : (
          <>
            <BranchContextEditor
              targetRole={branch.target_role}
              targetCompany={branch.target_company}
              targetRequirements={branch.target_requirements}
              branchInstructions={branch.branch_instructions}
              isSaving={updateMutation.isPending}
              onSave={handleSaveContext}
              onDraftChange={setDraftContext}
            />
            <PromptPreviewCard
              branch={branch}
              draftOverrides={draftContext}
            />
          </>
        )}

        {/* Active Generation Progress Indicator */}
        {(isTailoring || polledVersion) && (
          <GenerationProgress
            version={polledVersion}
            onRetry={handleTailorResume}
          />
        )}

        {/* Gap Analysis Card for Currently Inspected Version */}
        {!branch.is_default && (
          <GapAnalysisCard
            gapReport={activeVersion?.gap_report ?? branch.gap_report}
            versionNumber={activeVersion?.version_number}
            defaultExpanded={true}
            onQuickAddFact={handleQuickAddFact}
          />
        )}

        {/* Version Timeline & History Exploration */}
        <VersionTimeline
          versions={versions}
          activeVersionId={branch.active_version_id}
          selectedVersionId={activeVersion?.id}
          onSelectVersion={handleSelectVersion}
          onSetActiveVersion={handleSetActiveVersion}
          onCompareVersion={handleCompareVersion}
          isSettingActive={setActiveMutation.isPending}
        />
      </div>

      {/* Accessible Radix Toast Viewport and Root */}
      <Toast
        open={toast.open}
        onOpenChange={(open) => setToast((prev) => ({ ...prev, open }))}
        variant={toast.variant}
      >
        <div className="grid gap-1">
          <ToastTitle>{toast.title}</ToastTitle>
          <ToastDescription>{toast.description}</ToastDescription>
        </div>
        <ToastClose aria-label="Close notification" />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
};
