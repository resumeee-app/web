import * as React from "react";
import {
  FileJson,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  FORM_DIALOG_CONTENT_CLASS,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useImportJSONResume,
  validateJSONResumeFile,
  readFileAsText,
  parseJSONResumeText,
  type JSONResume,
} from "@/api/profile-queries";
import { ResumeReviewSummary } from "./resume-review-summary";
import {
  ResumeFileDropzone,
  useDialogTriggerFocusRestore,
} from "./resume-file-dropzone";
import type { components } from "@/api/schema";

/**
 * Props for the {@link ImportJSONResumeDialog} component.
 */
export interface ImportJSONResumeDialogProps {
  /** Controls open/closed state of the dialog. */
  open: boolean;
  /** Callback fired when dialog open state changes. */
  onOpenChange: (open: boolean) => void;
  /** Optional callback fired after a JSON Resume is successfully imported into the Main Profile. */
  onSuccess?: (snapshot?: components["schemas"]["MainProfileSnapshot"]) => void;
  /** Optional callback for announcing accessibility status messages to screen readers. */
  onAnnouncement?: (message: string) => void;
  /** Optional trigger element to render before the dialog content. */
  trigger?: React.ReactNode;
  /** Indicates whether the parent profile page currently has unsaved contact drafts. */
  hasUnsavedChanges?: boolean;
}

/**
 * ImportJSONResumeDialog provides an accessible, two-stage modal workflow to:
 * 1. Upload a `.json` JSON Resume file (<= 10MB) or paste raw JSON Resume text with client-side validation.
 * 2. Review parsed career items, preserved extended sections, and an explicit replacement warning
 *    before committing to `POST /api/v1/profile/jsonresume/import`.
 *
 * Implements Radix UI `Dialog` and `Tabs` primitives, deterministic focus restoration,
 * mid-flight dismissal/race-condition guards, and WCAG 2.1 AA dual-theme contrast styling.
 *
 * @param props - Component configuration defined in {@link ImportJSONResumeDialogProps}.
 * @returns Accessible Radix UI modal dialog for JSON Resume import.
 */
export const ImportJSONResumeDialog: React.FC<ImportJSONResumeDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  onAnnouncement,
  trigger,
  hasUnsavedChanges = false,
}) => {
  const [step, setStep] = React.useState<"upload" | "review">("upload");
  const [inputMode, setInputMode] = React.useState<"file" | "paste">("file");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [pastedJson, setPastedJson] = React.useState("");
  const [candidateResume, setCandidateResume] =
    React.useState<JSONResume | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(
    null
  );
  const [isReadingFile, setIsReadingFile] = React.useState(false);

  const importMutation = useImportJSONResume();

  const isOpenRef = React.useRef(open);
  const prevOpenRef = React.useRef(open);
  const readGenRef = React.useRef(0);
  const importGenRef = React.useRef(0);
  const handleCloseAutoFocus = useDialogTriggerFocusRestore(open);

  isOpenRef.current = open;

  const isImporting = importMutation.isPending;
  const isBusy = isImporting || isReadingFile;

  const resetState = React.useCallback(() => {
    readGenRef.current += 1;
    importGenRef.current += 1;
    setStep("upload");
    setInputMode("file");
    setSelectedFile(null);
    setPastedJson("");
    setCandidateResume(null);
    setValidationError(null);
    setIsReadingFile(false);
  }, []);

  React.useEffect(() => {
    if (prevOpenRef.current && !open) {
      resetState();
    }
    prevOpenRef.current = open;
  }, [open, resetState]);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isBusy) {
      return;
    }
    onOpenChange(nextOpen);
  };

  const handleModeSwitch = (mode: "file" | "paste") => {
    if (isReadingFile) {
      return;
    }
    readGenRef.current += 1;
    setInputMode(mode);
    setValidationError(null);
  };

  const handleReview = async () => {
    const requestGen = ++readGenRef.current;
    let rawText = pastedJson;

    if (inputMode === "file") {
      if (!selectedFile) return;
      setIsReadingFile(true);
      try {
        rawText = await readFileAsText(selectedFile);
      } catch (err) {
        if (!isOpenRef.current || requestGen !== readGenRef.current) {
          return;
        }
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to read selected JSON file.";
        setValidationError(msg);
        onAnnouncement?.(msg);
        return;
      } finally {
        if (requestGen === readGenRef.current) {
          setIsReadingFile(false);
        }
      }
    }

    if (!isOpenRef.current || requestGen !== readGenRef.current) {
      return;
    }

    const { data, error } = parseJSONResumeText(rawText);
    if (error || !data) {
      const msg = error || "Invalid JSON Resume content.";
      setValidationError(msg);
      onAnnouncement?.(msg);
      return;
    }

    setValidationError(null);
    setCandidateResume(data);
    setStep("review");
    const candidateName =
      typeof data.basics?.name === "string" ? data.basics.name.trim() : "";
    onAnnouncement?.(
      `JSON Resume validated for ${
        candidateName || "candidate"
      }. Review changes before replacing Main Profile.`
    );
  };

  const handleBackToInput = () => {
    setValidationError(null);
    setCandidateResume(null);
    setStep("upload");
  };

  const handleConfirmImport = async () => {
    if (!candidateResume || isImporting) return;

    const requestGen = ++importGenRef.current;

    try {
      const snapshot = await importMutation.mutateAsync(candidateResume);
      if (!isOpenRef.current || requestGen !== importGenRef.current) {
        return;
      }
      onAnnouncement?.("JSON Resume successfully imported into Main Profile.");
      onSuccess?.(snapshot);
      onOpenChange(false);
    } catch (err) {
      if (!isOpenRef.current || requestGen !== importGenRef.current) {
        return;
      }
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to import JSON Resume into Main Profile.";
      setValidationError(msg);
      onAnnouncement?.(`Import failed: ${msg}`);
    }
  };

  const canProceedReview =
    inputMode === "file"
      ? Boolean(selectedFile) && !validationError && !isReadingFile
      : Boolean(pastedJson.trim()) && !validationError;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent
        onEscapeKeyDown={(e) => {
          if (isBusy) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isBusy) e.preventDefault();
        }}
        onCloseAutoFocus={handleCloseAutoFocus}
        className={cn(FORM_DIALOG_CONTENT_CLASS, "p-6 sm:p-8")}
      >
        {step === "upload" ? (
          <>
            <DialogHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <FileJson
                  className="h-5 w-5 text-indigo-600 dark:text-indigo-400"
                  aria-hidden="true"
                />
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Import JSON Resume
                </DialogTitle>
                <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-600/20">
                  JSON Resume v1.0.0
                </span>
              </div>
              <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
                Upload a standard JSON Resume (.json) file or paste raw JSON to
                populate your Main Profile career graph. You will inspect all
                parsed sections before committing.
              </DialogDescription>
            </DialogHeader>

            {/* Replace Semantics Caution Banner */}
            <div
              className="mt-2 flex items-start gap-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-amber-800 dark:text-amber-200 text-sm"
              role="note"
            >
              <AlertTriangle
                className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <strong className="font-semibold">Caution:</strong>{" "}
                {hasUnsavedChanges
                  ? "You have unsaved contact edits on your profile. Importing a JSON Resume replaces your existing Main Profile career records and overwrites current contact drafts, while preserving Global Writing Rules."
                  : "Importing a JSON Resume replaces your existing Main Profile career records (experiences, skills, education, projects, certifications) and marks tailored branches out of sync, while preserving Global Writing Rules and extended sections."}
              </div>
            </div>

            {/* Radix Tabs Mode Selector */}
            <Tabs
              value={inputMode}
              onValueChange={(value) => {
                if (value === "file" || value === "paste") {
                  handleModeSwitch(value);
                }
              }}
              className="mt-3"
            >
              <TabsList aria-label="JSON Resume input mode">
                <TabsTrigger value="file" disabled={isReadingFile}>
                  Upload .json File
                </TabsTrigger>
                <TabsTrigger value="paste" disabled={isReadingFile}>
                  Paste Raw JSON
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="mt-3">
                <ResumeFileDropzone
                  inputId="jsonresume-upload-input"
                  label="Select JSON Resume File (max 10MB)"
                  accept=".json,application/json"
                  dropzoneAriaLabel="Upload JSON Resume file dropzone"
                  emptyPrompt="Click to select or drag and drop your .json resume"
                  formatHint="JSON Resume format (.json), up to 10MB"
                  selectedFile={selectedFile}
                  validateFile={validateJSONResumeFile}
                  disabled={isReadingFile}
                  onFileValidated={(file, err) => {
                    setSelectedFile(file);
                    setValidationError(err);
                    if (err) {
                      onAnnouncement?.(err);
                    }
                  }}
                />
              </TabsContent>

              <TabsContent value="paste" className="mt-3 space-y-2">
                <label
                  htmlFor="jsonresume-paste-input"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Paste JSON Resume Content
                </label>
                <textarea
                  id="jsonresume-paste-input"
                  rows={8}
                  value={pastedJson}
                  onChange={(e) => {
                    setPastedJson(e.target.value);
                    if (validationError) {
                      setValidationError(null);
                    }
                  }}
                  placeholder='{"basics": {"name": "Jane Doe", "email": "jane@example.com"}, "work": []}'
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                />
              </TabsContent>
            </Tabs>

            {/* Inline Validation Error Alert */}
            {validationError && (
              <div
                className="mt-3 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300"
                role="alert"
              >
                {validationError}
              </div>
            )}

            <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDialogOpenChange(false)}
                disabled={isReadingFile}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleReview}
                disabled={!canProceedReview}
                className="gap-2"
              >
                {isReadingFile ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    <span>Reading JSON...</span>
                  </>
                ) : (
                  <>
                    <FileJson className="h-4 w-4" aria-hidden="true" />
                    <span>Review JSON Resume</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* Step 2: Review & Confirm Replace */
          <>
            <DialogHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2
                  className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Review JSON Resume Import
                </DialogTitle>
                <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-600/20">
                  Validated JSON
                </span>
              </div>
              <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
                Verify the parsed JSON Resume sections below before replacing your
                Main Profile career graph.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-3 space-y-4">
              {/* Explicit Replacement Confirmation Banner */}
              <div
                className="flex items-start gap-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3.5 text-amber-800 dark:text-amber-200 text-xs"
                role="note"
              >
                <AlertTriangle
                  className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  Confirming replaces existing Main Profile career items
                  (experiences, skills, education, projects, certifications) and
                  increments your profile revision, marking existing tailored
                  branches stale. Global Writing Rules remain preserved.
                </div>
              </div>

              {candidateResume && (
                <ResumeReviewSummary
                  resume={candidateResume}
                  showMissingNameNotice={true}
                />
              )}

              {/* API Error Alert */}
              {validationError && (
                <div
                  className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300"
                  role="alert"
                >
                  {validationError}
                </div>
              )}
            </div>

            <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToInput}
                disabled={isImporting}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Back</span>
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    <span>Importing JSON Resume...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>Replace Main Profile</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
