import * as React from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
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
import { TailorActionBar } from "@/components/workbench/tailor-action-bar";
import { GenerationProgress } from "@/components/workbench/generation-progress";
import { VersionTimeline } from "@/components/workbench/version-timeline";
import { GapAnalysisCard } from "@/components/workbench/gap-analysis-card";
import { BranchContextEditor } from "@/components/workbench/branch-context-editor";

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

  const handleSaveContext = async (data: {
    target_requirements: string;
    branch_instructions: string;
  }) => {
    try {
      await updateMutation.mutateAsync(data);
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

  const handleCompareVersion = (ver: BranchVersion) => {
    setToast({
      open: true,
      title: "Compare Versions",
      description: `Comparing version v${ver.version_number} against master profile.`,
      variant: "default",
    });
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
          className="h-8 w-8 animate-spin text-indigo-600"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-slate-600">
          Loading branch workbench...
        </p>
      </div>
    );
  }

  if (branchError || !branch) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center"
      >
        <AlertCircle className="mx-auto h-8 w-8 text-rose-600" aria-hidden="true" />
        <h2 className="mt-2 text-base font-semibold text-rose-900">
          Branch Not Found
        </h2>
        <p className="mt-1 text-sm text-rose-700">
          The requested resume branch could not be loaded or may have been deleted.
        </p>
        <div className="mt-4">
          <Button variant="outline" asChild>
            <Link to="/">Back to Resumes</Link>
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
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Resumes</span>
          </Link>
        </nav>

        {/* Workbench Header & Action Bar */}
        <TailorActionBar
          branch={branch}
          presets={presets}
          templates={templates}
          isTailoring={isTailoring}
          isSyncing={syncMutation.isPending}
          isUpdating={updateMutation.isPending}
          onUpdatePreset={handleUpdatePreset}
          onUpdateTemplate={handleUpdateTemplate}
          onTailorResume={handleTailorResume}
          onSyncMaster={handleSyncMaster}
        />

        {/* Job Description & Custom Context Editor */}
        <BranchContextEditor
          targetRequirements={branch.target_requirements}
          branchInstructions={branch.branch_instructions}
          isSaving={updateMutation.isPending}
          onSave={handleSaveContext}
        />

        {/* Active Generation Progress Indicator */}
        {(isTailoring || polledVersion) && (
          <GenerationProgress
            version={polledVersion}
            onRetry={handleTailorResume}
          />
        )}

        {/* Gap Analysis Card for Currently Inspected Version */}
        <GapAnalysisCard
          gapReport={activeVersion?.gap_report}
          versionNumber={activeVersion?.version_number}
          defaultExpanded={true}
        />

        {/* Version Timeline & History Exploration */}
        <VersionTimeline
          versions={versions}
          activeVersionId={branch.active_version_id}
          selectedVersionId={activeVersion?.id}
          onSelectVersion={(ver) => setSelectedVersion(ver)}
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
