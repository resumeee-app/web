import * as React from "react";
import {
  FileUp,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { ResumeReviewSummary } from "./resume-review-summary";
import {
  ResumeFileDropzone,
  useDialogTriggerFocusRestore,
} from "./resume-file-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useParsePDFResume,
  useCommitPDFResume,
  validatePDFFile,
  type JSONResume,
} from "@/api/profile-queries";
import type { components } from "@/api/schema";

/**
 * Props for the ImportPDFDialog component.
 */
export interface ImportPDFDialogProps {
  /** Controls open/closed state of the dialog */
  open: boolean;
  /** Callback fired when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Optional callback fired after resume is successfully parsed and committed */
  onSuccess?: (snapshot?: components["schemas"]["MainProfileSnapshot"]) => void;
  /** Optional callback for announcing accessibility messages to screen readers */
  onAnnouncement?: (message: string) => void;
  /** Optional trigger element to render before the dialog content */
  trigger?: React.ReactNode;
  /** Indicates whether the parent profile page currently has unsaved contact drafts */
  hasUnsavedChanges?: boolean;
}

/**
 * ImportPDFDialog provides an accessible, two-stage modal workflow to:
 * 1. Upload a binary PDF resume (<= 10MB) and parse structured fields via LLM.
 * 2. Review and verify candidate career graph fields before committing them to the Main Profile.
 *
 * Implements strict WCAG 2.1 AA dual-theme contrast styling, in-flight race cancellation guards,
 * and full WAI-ARIA live region status announcements.
 */
export const ImportPDFDialog: React.FC<ImportPDFDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  onAnnouncement,
  trigger,
  hasUnsavedChanges = false,
}) => {
  const [step, setStep] = React.useState<"upload" | "review">("upload");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [candidateResume, setCandidateResume] = React.useState<JSONResume | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const parseMutation = useParsePDFResume();
  const commitMutation = useCommitPDFResume();

  const isOpenRef = React.useRef(open);
  const prevOpenRef = React.useRef(open);
  const parseGenRef = React.useRef(0);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const handleCloseAutoFocus = useDialogTriggerFocusRestore(open);

  // Synchronize open state ref
  isOpenRef.current = open;

  /**
   * Resets all internal dialog staging state, increments request generation counter to discard
   * in-flight parse operations, and cancels active network polling via AbortController.
   */
  const resetState = React.useCallback(() => {
    parseGenRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStep("upload");
    setSelectedFile(null);
    setCandidateResume(null);
    setValidationError(null);
  }, []);

  // Cancel any active parse request when unmounting
  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Reset internal state when dialog transitions from open to closed
  React.useEffect(() => {
    if (prevOpenRef.current && !open) {
      resetState();
    }
    prevOpenRef.current = open;
  }, [open, resetState]);

  const handleParse = async () => {
    if (!selectedFile) return;

    const requestGen = ++parseGenRef.current;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const parsed = await parseMutation.mutateAsync({
        file: selectedFile,
        signal: controller.signal,
      });

      // Guard against in-flight race if dialog was closed or cancelled while parsing
      if (!isOpenRef.current || requestGen !== parseGenRef.current) {
        return;
      }

      setCandidateResume(parsed);
      setStep("review");
      onAnnouncement?.(
        `PDF resume parsed successfully. Candidate draft extracted for ${
          parsed.basics?.name || "candidate"
        }. Review fields before committing.`
      );
    } catch (err) {
      // Ignore errors if request was superseded or dialog was closed or aborted
      if (
        !isOpenRef.current ||
        requestGen !== parseGenRef.current ||
        (err instanceof DOMException && err.name === "AbortError")
      ) {
        return;
      }

      const msg =
        err instanceof Error ? err.message : "Failed to parse PDF resume with LLM.";
      setValidationError(msg);
      onAnnouncement?.(`PDF parse failed: ${msg}`);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleDiscardDraft = () => {
    resetState();
    onAnnouncement?.("Candidate resume draft discarded.");
  };

  const handleCommit = async () => {
    if (!candidateResume) return;

    try {
      const snapshot = await commitMutation.mutateAsync(candidateResume);
      onAnnouncement?.("PDF resume successfully imported into Main Profile.");
      onSuccess?.(snapshot);
      onOpenChange(false);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to commit candidate resume into Main Profile.";
      setValidationError(msg);
      onAnnouncement?.(`Commit failed: ${msg}`);
    }
  };

  const isParsing = parseMutation.isPending;
  const isCommitting = commitMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent
        onEscapeKeyDown={(e) => {
          if (isParsing) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isParsing) e.preventDefault();
        }}
        onCloseAutoFocus={handleCloseAutoFocus}
        className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-6 sm:p-8"
      >
        {step === "upload" ? (
          <>
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <FileUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Import PDF Resume
                </DialogTitle>
                <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-600/20">
                  LLM Powered
                </span>
              </div>
              <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
                Upload an existing PDF resume to automatically parse and extract your career history
                using an LLM. You can review and approve the details before loading them into your
                Main Profile.
              </DialogDescription>
            </DialogHeader>

            {/* Caution Alert with Unsaved Changes Warning */}
            <div
              className="mt-4 flex items-start gap-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-amber-800 dark:text-amber-200 text-sm"
              role="alert"
            >
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden="true" />
              <div>
                <strong className="font-semibold">Caution:</strong>{" "}
                {hasUnsavedChanges
                  ? "You have unsaved contact edits on your profile. Importing a PDF resume will override and replace current drafts with imported records."
                  : "Importing a PDF resume will update and merge into your current Main Profile career records."}
              </div>
            </div>

            {/* File Drag & Drop / Selector */}
            <div className="mt-4 space-y-3">
              <ResumeFileDropzone
                inputId="pdf-upload-input"
                label="Select PDF Resume File (max 10MB)"
                accept=".pdf,application/pdf"
                dropzoneAriaLabel="Upload PDF file dropzone"
                emptyPrompt="Click to select or drag and drop your PDF resume"
                formatHint="PDF format only, up to 10MB"
                selectedFile={selectedFile}
                validateFile={validatePDFFile}
                disabled={isParsing}
                onFileValidated={(file, err) => {
                  setSelectedFile(file);
                  setValidationError(err);
                }}
              />

              {/* Validation / API Error Feedback */}
              {validationError && (
                <div
                  className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300"
                  role="alert"
                >
                  {validationError}
                </div>
              )}

              {/* Active Parsing Status */}
              {isParsing && (
                <div
                  className="flex items-center gap-3 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/40 p-4 text-xs text-indigo-700 dark:text-indigo-300"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="h-5 w-5 animate-spin flex-shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  <span>
                    <strong>Extracting text and parsing structured resume via LLM...</strong> This step
                    may take up to a few minutes. Please keep this dialog open.
                  </span>
                </div>
              )}
            </div>

            <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isParsing}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleParse}
                disabled={!selectedFile || Boolean(validationError) || isParsing}
                className="gap-2"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Parsing with LLM...</span>
                  </>
                ) : (
                  <>
                    <FileUp className="h-4 w-4" aria-hidden="true" />
                    <span>Parse &amp; Stage with LLM</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* Step 2: Review Candidate Draft */
          <>
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Review Extracted Resume Draft
                </DialogTitle>
                <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-600/20">
                  LLM Parsed
                </span>
              </div>
              <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
                Verify the extracted career graph fields below before committing them into your
                Main Profile.
              </DialogDescription>
            </DialogHeader>

            {/* Extracted Details Preview Cards */}
            <div className="mt-4 space-y-4">
              {candidateResume && (
                <ResumeReviewSummary resume={candidateResume} />
              )}

              {/* Error Alert if commit fails */}
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
                onClick={handleDiscardDraft}
                disabled={isCommitting}
              >
                Discard Draft
              </Button>
              <Button
                size="sm"
                onClick={handleCommit}
                disabled={isCommitting}
                className="gap-2"
              >
                {isCommitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Committing to Main Profile...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>Commit to Main Profile</span>
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
