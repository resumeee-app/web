import * as React from "react";
import {
  User,
  GitBranch,
  Sparkles,
  FileCheck2,
  Play,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExperienceList } from "@/components/profile/experience-list";
import { BranchCard } from "@/components/branches/branch-card";
import { CreateBranchModal } from "@/components/branches/create-branch-modal";
import { TailorActionBar } from "@/components/workbench/tailor-action-bar";
import { GenerationProgress } from "@/components/workbench/generation-progress";
import { GapAnalysisCard } from "@/components/workbench/gap-analysis-card";
import { DiffViewer } from "@/components/preview/diff-viewer";
import { ResumeViewer } from "@/components/preview/resume-viewer";
import { cn } from "@/lib/utils";
import { LockedPreviewFrame } from "./locked-preview-frame";
import {
  TOUR_ADDED_FACT,
  TOUR_INITIAL_EXPERIENCES,
  TOUR_MAIN_BRANCH,
  TOUR_MAIN_SNAPSHOT,
  TOUR_PATAGONIA_BRANCH,
  TOUR_PRESETS,
  TOUR_RENDERED_HTML,
  TOUR_RENDERED_MARKDOWN,
  TOUR_RENDERED_PLAIN_TEXT,
  TOUR_SKILLS,
  TOUR_SPOTIFY_BRANCH,
  TOUR_SPOTIFY_INITIAL_VALUES,
  TOUR_TAILORED_ATS_SCORE,
  TOUR_TAILORED_GAP_REPORT,
  TOUR_TAILORED_VERSION,
  TOUR_TEMPLATES,
} from "./tour-mock-data";
import type { BranchVersion } from "@/api/generation-queries";

export type TourStepId = 1 | 2 | 3 | 4;

/**
 * Optional animation timing overrides used by tests for deterministic fast assertions.
 */
export interface TourTimingConfig {
  modalStepMs?: number;
  generationStepMs?: number;
}

/**
 * Props accepted by {@link LandingGuidedTour}.
 */
export interface LandingGuidedTourProps {
  /** Optional animation timing configuration overrides. */
  tourTimingMs?: TourTimingConfig;
}

interface TourStepMeta {
  id: TourStepId;
  title: string;
  description: string;
  tryLabel: string;
  completedLabel: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}

const TOUR_STEPS: readonly TourStepMeta[] = [
  {
    id: 1,
    title: "Curate Main Profile",
    description:
      "Record work history and quantified bullet facts with deterministic ShortID hashes in one canonical Career Graph.",
    tryLabel: "Try it: Add Verified Fact",
    completedLabel: "Verified Fact Added (Rev #15)",
    icon: User,
  },
  {
    id: 2,
    title: "Branch for a Role",
    description:
      "Branch off your Main Career Profile for each target opportunity with its own job description, AI strategy, and ATS template.",
    tryLabel: "Try it: Create Role Branch",
    completedLabel: "Spotify Branch Created",
    icon: GitBranch,
  },
  {
    id: 3,
    title: "Tailor & Analyze",
    description:
      "Run AI tailoring anchored strictly to your proven Main Profile facts, then inspect generated Match & ATS scores.",
    tryLabel: "Try it: Tailor Resume",
    completedLabel: "Tailored v1 Ready",
    icon: Sparkles,
  },
  {
    id: 4,
    title: "Diff, Preview & Export",
    description:
      "Review every tailored rewrite against your Main Profile, inspect the rendered ATS layout, and export clean artifacts.",
    tryLabel: "Try it: Render ATS Resume & Export",
    completedLabel: "Showing Rendered ATS Resume",
    icon: FileCheck2,
  },
];

const noop = () => {};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Interactive 4-step guided product tour for the public landing page.
 *
 * Uses real Resumeee application components inside a strictly read-only preview frame
 * backed by mocked generalist career data, with one scripted "Try it" simulation per step.
 */
export const LandingGuidedTour: React.FC<LandingGuidedTourProps> = ({
  tourTimingMs,
}) => {
  const [activeStep, setActiveStep] = React.useState<TourStepId>(1);

  // Per-step simulation states (each step works independently on direct jump)
  const [step1FactAdded, setStep1FactAdded] = React.useState(false);

  const [step2Created, setStep2Created] = React.useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [modalStep, setModalStep] = React.useState<1 | 2 | 3>(1);
  const step2TryButtonRef = React.useRef<HTMLButtonElement | null>(null);

  const [step3Phase, setStep3Phase] = React.useState<
    "idle" | "pending" | "processing" | "completed"
  >("idle");

  const [step4ShowPreview, setStep4ShowPreview] = React.useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = React.useState("");

  const timersRef = React.useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const clearAllTimers = React.useCallback(() => {
    timersRef.current.forEach((timerId) => clearTimeout(timerId));
    timersRef.current = [];
  }, []);

  React.useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const modalDelay =
    tourTimingMs?.modalStepMs ?? (prefersReducedMotion() ? 1250 : 2500);

  const generationDelay = prefersReducedMotion()
    ? Math.min(tourTimingMs?.generationStepMs ?? 100, 40)
    : (tourTimingMs?.generationStepMs ?? 550);

  // Auto-advance CreateBranchModal through Steps 1 -> 2 -> 3 -> Submit
  React.useEffect(() => {
    if (!isCreateModalOpen) {
      return;
    }

    const t1 = setTimeout(() => setModalStep(2), modalDelay);
    const t2 = setTimeout(() => setModalStep(3), modalDelay * 2);
    const t3 = setTimeout(() => {
      setStep2Created(true);
      setIsCreateModalOpen(false);
      setLiveAnnouncement("Created tailored Spotify role branch.");
    }, modalDelay * 3);

    timersRef.current.push(t1, t2, t3);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isCreateModalOpen, modalDelay]);

  const handleSelectStep = (step: TourStepId) => {
    clearAllTimers();
    setIsCreateModalOpen(false);
    if (step3Phase === "pending" || step3Phase === "processing") {
      setStep3Phase("idle");
    }
    setActiveStep(step);
  };

  const handleStep1Try = () => {
    setStep1FactAdded(true);
    setLiveAnnouncement("Added verified pricing fact FAC-9E3A to Main Career Profile, revision 15.");
  };

  const handleStep2Try = () => {
    clearAllTimers();
    setModalStep(1);
    setIsCreateModalOpen(true);
  };

  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
      clearAllTimers();
    }
    setIsCreateModalOpen(open);
  };

  const handleModalSubmit = () => {
    clearAllTimers();
    setStep2Created(true);
    setIsCreateModalOpen(false);
  };

  const handleStep3Try = () => {
    clearAllTimers();
    setStep3Phase("pending");
    const t1 = setTimeout(() => setStep3Phase("processing"), generationDelay);
    const t2 = setTimeout(() => {
      setStep3Phase("completed");
      setLiveAnnouncement("Tailored version v1 completed with 97% target match score.");
    }, generationDelay * 2);
    timersRef.current.push(t1, t2);
  };

  const handleStep4Try = () => {
    setStep4ShowPreview(true);
    setLiveAnnouncement("Rendered ATS resume preview and simulated JSON Resume export.");
  };

  const handleResetActiveStep = () => {
    clearAllTimers();
    if (activeStep === 1) {
      setStep1FactAdded(false);
    } else if (activeStep === 2) {
      setIsCreateModalOpen(false);
      setStep2Created(false);
    } else if (activeStep === 3) {
      setStep3Phase("idle");
    } else {
      setStep4ShowPreview(false);
    }
    setLiveAnnouncement(`Reset Step ${activeStep} demo.`);
  };

  const step1Experiences = React.useMemo(() => {
    if (!step1FactAdded) {
      return TOUR_INITIAL_EXPERIENCES;
    }
    return TOUR_INITIAL_EXPERIENCES.map((exp, idx) =>
      idx === 0
        ? { ...exp, facts: [...(exp.facts ?? []), TOUR_ADDED_FACT] }
        : exp
    );
  }, [step1FactAdded]);

  const step3Branch = React.useMemo(
    () => ({
      ...TOUR_SPOTIFY_BRANCH,
      is_stale: false,
      active_version_id: step3Phase === "completed" ? "v1" : undefined,
    }),
    [step3Phase]
  );

  const step3GenerationVersion: BranchVersion | null = React.useMemo(() => {
    if (step3Phase === "idle") return null;
    return {
      id: "ver-spotify-v1",
      branch_id: TOUR_SPOTIFY_BRANCH.id,
      version_number: 1,
      status: step3Phase,
    };
  }, [step3Phase]);

  const currentMeta = TOUR_STEPS.find((s) => s.id === activeStep) ?? TOUR_STEPS[0]!;

  const isStepCompleted =
    (activeStep === 1 && step1FactAdded) ||
    (activeStep === 2 && step2Created) ||
    (activeStep === 3 && step3Phase === "completed") ||
    (activeStep === 4 && step4ShowPreview);

  const isStepRunning =
    (activeStep === 2 && isCreateModalOpen) ||
    (activeStep === 3 && (step3Phase === "pending" || step3Phase === "processing"));

  const handleTryActiveStep = () => {
    if (activeStep === 1) handleStep1Try();
    else if (activeStep === 2) handleStep2Try();
    else if (activeStep === 3) handleStep3Try();
    else handleStep4Try();
  };

  const handleRestartTour = () => {
    clearAllTimers();
    setStep1FactAdded(false);
    setStep2Created(false);
    setIsCreateModalOpen(false);
    setModalStep(1);
    setStep3Phase("idle");
    setStep4ShowPreview(false);
    setActiveStep(1);
    setLiveAnnouncement("Restarted guided tour at Step 1.");
  };

  const handlePrimaryAction = () => {
    if (isStepCompleted) {
      if (activeStep < 4) {
        handleSelectStep((activeStep + 1) as TourStepId);
      } else {
        handleRestartTour();
      }
      return;
    }
    handleTryActiveStep();
  };

  const renderPrimaryActionContent = () => {
    if (isStepCompleted && activeStep === 4) {
      return (
        <>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Restart Tour</span>
        </>
      );
    }
    if (isStepCompleted) {
      return (
        <>
          <span>Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </>
      );
    }
    if (isStepRunning) {
      return (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          <span>{activeStep === 2 ? "Creating Branch..." : "Tailoring..."}</span>
        </>
      );
    }
    return (
      <>
        <Play className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{currentMeta.tryLabel}</span>
      </>
    );
  };

  return (
    <section
      aria-labelledby="guided-tour-heading"
      className="w-full max-w-5xl mx-auto mt-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 sm:p-5 shadow-md text-left space-y-4"
    >
      <span className="sr-only" role="status" aria-live="polite">
        {liveAnnouncement}
      </span>
      {/* Top Bar: Title + Step Indicator */}
      <div className="flex flex-col gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              id="guided-tour-heading"
              className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
            >
              Guided Tour: How Resumeee Works
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Walk through Jane Doe&apos;s mocked career profile using real Resumeee components.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-700/15 dark:ring-indigo-500/30">
            Mocked Interactive Preview
          </span>
        </div>

        {/* 4-Step Wizard Navigation */}
        <nav aria-label="Guided Tour Steps">
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {TOUR_STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = step.id === activeStep;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectStep(step.id)}
                    aria-current={isActive ? "step" : undefined}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                      isActive
                        ? "border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-slate-100"
                        : "border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        isActive
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      )}
                    >
                      {step.id}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-xs font-semibold truncate">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                        <span className="truncate">{step.title}</span>
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* Active Step Goal Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-indigo-200/80 dark:border-indigo-900/60 bg-white dark:bg-slate-900 px-4 py-3 shadow-xs">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            Step {currentMeta.id}: {currentMeta.title}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {currentMeta.description}
          </p>
        </div>

        {isStepCompleted && (
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start sm:self-center rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-600/20 dark:ring-emerald-500/30">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{currentMeta.completedLabel}</span>
          </span>
        )}
      </div>

      {/* Strictly Locked Preview Viewport (contains inline Step 2 modal inside demo frame) */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-3 sm:p-4">
        {activeStep === 2 && isCreateModalOpen && (
          <div
            role="progressbar"
            aria-label={`Modal step ${modalStep} of 3 auto-advance timer`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((modalStep / 3) * 100)}
            style={
              { "--tour-timer-duration": `${modalDelay}ms` } as React.CSSProperties
            }
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1 bg-slate-200/80 dark:bg-slate-800/80"
          >
            <div
              key={`step2-timer-${modalStep}`}
              style={{
                animation:
                  "tour-timer-fill var(--tour-timer-duration) linear forwards",
              }}
              className="h-full w-full origin-left bg-indigo-600 dark:bg-indigo-400"
            />
          </div>
        )}

        <LockedPreviewFrame
          label={`Step ${activeStep} preview: ${currentMeta.title}`}
          syncKey={`${activeStep}-${step1FactAdded}-${step2Created}-${step3Phase}-${step4ShowPreview}-${isCreateModalOpen}`}
          ariaHidden={activeStep === 2 && isCreateModalOpen}
          className={
            activeStep === 2 && isCreateModalOpen
              ? "pointer-events-none absolute inset-3 sm:inset-4 overflow-hidden opacity-35"
              : undefined
          }
        >
        {activeStep === 1 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Jane Doe — Senior Growth Product Manager
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-0.5 font-medium ring-1 ring-inset transition-colors",
                  step1FactAdded
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-emerald-600/20 dark:ring-emerald-500/30"
                    : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-indigo-700/15 dark:ring-indigo-500/30"
                )}
              >
                {step1FactAdded ? "Rev #15 (+1 verified fact)" : "Rev #14"}
              </span>
            </div>

            <ExperienceList
              experiences={step1Experiences}
              availableSkills={TOUR_SKILLS}
              previewOnly
              highlightedFactIds={step1FactAdded ? [TOUR_ADDED_FACT.id] : undefined}
              onReorder={noop}
              onAddExperience={noop}
              onUpdateExperience={noop}
              onDeleteExperience={noop}
              onAddFact={noop}
              onDeleteFact={noop}
            />
          </div>
        )}

        {activeStep === 2 && (
          <div className="space-y-4">
            <BranchCard
              branch={TOUR_MAIN_BRANCH}
              templateName="Standard Clean"
              headingLevel="h3"
              previewOnly
            />

            <div className="flex items-center gap-2 pl-4 py-1">
              <div className="h-4 w-0.5 bg-indigo-300 dark:bg-indigo-700" />
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tailored Resumes</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-0 sm:pl-4 border-l-2 border-indigo-200 dark:border-indigo-900/60 ml-2">
              <BranchCard
                branch={TOUR_PATAGONIA_BRANCH}
                templateName="Executive Brief"
                presetName="Impact & Outcomes"
                headingLevel="h3"
                previewOnly
              />
              {step2Created && (
                <BranchCard
                  branch={TOUR_SPOTIFY_BRANCH}
                  templateName="Modern Editorial"
                  presetName="Executive Storytelling"
                  headingLevel="h3"
                  previewOnly
                />
              )}
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div className="space-y-4">
            <TailorActionBar
              branch={step3Branch}
              presets={TOUR_PRESETS}
              templates={TOUR_TEMPLATES}
              isTailoring={step3Phase === "pending" || step3Phase === "processing"}
              hasCompletedVersions={step3Phase === "completed"}
              activeVersionNumber={step3Phase === "completed" ? 1 : undefined}
              headingLevel="h3"
              previewOnly
              highlightTailorButton={step3Phase === "idle"}
              disableTailorButton={step3Phase === "completed"}
              onTailorResume={handleStep3Try}
            />

            {step3GenerationVersion && (
              <GenerationProgress version={step3GenerationVersion} />
            )}

            <GapAnalysisCard
              gapReport={
                step3Phase === "completed" ? TOUR_TAILORED_GAP_REPORT : null
              }
              atsScore={
                step3Phase === "completed" ? TOUR_TAILORED_ATS_SCORE : null
              }
              versionNumber={step3Phase === "completed" ? 1 : undefined}
              defaultExpanded={false}
              hasJobDescription={true}
              hasCompletedVersion={step3Phase === "completed"}
              previewOnly
            />
          </div>
        )}

        {activeStep === 4 && (
          <div className="space-y-4">
            {!step4ShowPreview ? (
              <DiffViewer
                currentVersion={TOUR_TAILORED_VERSION}
                mainProfile={TOUR_MAIN_SNAPSHOT}
                previewOnly
              />
            ) : (
              <div className="space-y-3">
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-200"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>
                    Simulated export ready: resume-spotify-lead-strategist-v1.json (JSON Resume) &amp; print-ready ATS HTML.
                  </span>
                </div>
                <ResumeViewer
                  htmlContent={TOUR_RENDERED_HTML}
                  markdownContent={TOUR_RENDERED_MARKDOWN}
                  plainTextContent={TOUR_RENDERED_PLAIN_TEXT}
                  previewOnly
                />
              </div>
            )}
          </div>
        )}
        </LockedPreviewFrame>

        {/* Step 2 Interactive CreateBranchModal Auto-Walkthrough (shown inside demo frame) */}
        {activeStep === 2 && (
          <CreateBranchModal
            open={isCreateModalOpen}
            onOpenChange={handleModalOpenChange}
            existingBranches={[TOUR_MAIN_BRANCH, TOUR_PATAGONIA_BRANCH]}
            presets={TOUR_PRESETS}
            templates={TOUR_TEMPLATES}
            initialValues={TOUR_SPOTIFY_INITIAL_VALUES}
            controlledStep={modalStep}
            onStepChange={setModalStep}
            readOnlyDemo
            inline
            onSubmit={handleModalSubmit}
            triggerRef={step2TryButtonRef}
          />
        )}
      </div>

      {/* Footer Wizard Navigation & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200/80 dark:border-slate-800 pt-4">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSelectStep((activeStep - 1) as TourStepId)}
            disabled={activeStep === 1}
            aria-label="Previous step"
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span>Previous</span>
          </Button>

          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Step {activeStep} of {TOUR_STEPS.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {isStepCompleted && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetActiveStep}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset Demo</span>
            </Button>
          )}

          <Button
            ref={activeStep === 2 ? step2TryButtonRef : undefined}
            type="button"
            size="sm"
            onClick={handlePrimaryAction}
            disabled={isStepRunning}
            className="gap-1.5"
          >
            {renderPrimaryActionContent()}
          </Button>
        </div>
      </div>
    </section>
  );
};
