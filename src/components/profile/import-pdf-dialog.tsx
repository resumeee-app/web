import * as React from "react";
import {
  FileUp,
  AlertTriangle,
  Loader2,
  FileText,
  CheckCircle2,
  Briefcase,
  Wrench,
  GraduationCap,
  FolderGit2,
  X,
} from "lucide-react";
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
  const [isDragOver, setIsDragOver] = React.useState(false);

  const parseMutation = useParsePDFResume();
  const commitMutation = useCommitPDFResume();

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const isOpenRef = React.useRef(open);
  const prevOpenRef = React.useRef(open);
  const parseGenRef = React.useRef(0);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (open) {
      triggerRef.current = (document.activeElement as HTMLElement) || null;
    }
  }, [open]);

  // Synchronize open state ref
  isOpenRef.current = open;

  /**
   * Resets all internal dialog staging state, increments request generation counter to discard
   * in-flight parse operations, cancels active network polling via AbortController,
   * and clears the native DOM file input value.
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
    setIsDragOver(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

  const validateAndSetFile = (file: File) => {
    const errorMsg = validatePDFFile(file);
    if (errorMsg) {
      setValidationError(errorMsg);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setValidationError(null);
    setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

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

  // Metric card summary configuration for the review step
  const summaryMetrics = [
    {
      key: "work",
      label:
        (candidateResume?.work?.length || 0) === 1
          ? "1 Work Experience"
          : `${candidateResume?.work?.length || 0} Work Experiences`,
      count: candidateResume?.work?.length || 0,
      icon: Briefcase,
    },
    {
      key: "skills",
      label:
        (candidateResume?.skills?.length || 0) === 1
          ? "1 Skill"
          : `${candidateResume?.skills?.length || 0} Skills`,
      count: candidateResume?.skills?.length || 0,
      icon: Wrench,
    },
    {
      key: "education",
      label:
        (candidateResume?.education?.length || 0) === 1
          ? "1 Education"
          : `${candidateResume?.education?.length || 0} Education`,
      count: candidateResume?.education?.length || 0,
      icon: GraduationCap,
    },
    {
      key: "projects",
      label:
        (candidateResume?.projects?.length || 0) === 1
          ? "1 Project"
          : `${candidateResume?.projects?.length || 0} Projects`,
      count: candidateResume?.projects?.length || 0,
      icon: FolderGit2,
    },
  ];

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
        onCloseAutoFocus={(e) => {
          if (triggerRef.current) {
            e.preventDefault();
            const el = triggerRef.current;
            triggerRef.current = null;
            el.focus();
          }
        }}
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
              <label
                htmlFor="pdf-upload-input"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Select PDF Resume File (max 10MB)
              </label>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDragOver
                    ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30"
                    : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-400 dark:hover:border-slate-600"
                }`}
                tabIndex={0}
                role="button"
                aria-label="Upload PDF file dropzone"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <FileText className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-2" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {selectedFile ? selectedFile.name : "Click to select or drag and drop your PDF resume"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  PDF format only, up to 10MB
                </p>

                <input
                  ref={fileInputRef}
                  id="pdf-upload-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="sr-only"
                  tabIndex={-1}
                />
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 p-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-mono truncate">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setValidationError(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    aria-label="Remove selected file"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}

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
              {/* Basics Card with Defensive Optional Chaining */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Personal Details
                </h4>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {candidateResume?.basics?.name || "Unnamed Candidate"}
                </div>
                {candidateResume?.basics?.label && (
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    {candidateResume.basics.label}
                  </div>
                )}
                <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  {candidateResume?.basics?.email && (
                    <span>📧 {candidateResume.basics.email}</span>
                  )}
                  {candidateResume?.basics?.phone && (
                    <span>📞 {candidateResume.basics.phone}</span>
                  )}
                  {candidateResume?.basics?.location?.city && (
                    <span>
                      📍 {candidateResume.basics.location.city}
                      {candidateResume.basics.location.region ? `, ${candidateResume.basics.location.region}` : ""}
                    </span>
                  )}
                </div>
                {candidateResume?.basics?.summary && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-3">
                    {candidateResume.basics.summary}
                  </p>
                )}
              </div>

              {/* DRY Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {summaryMetrics.map(({ key, label, count, icon: Icon }) => (
                  <div
                    key={key}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-center"
                  >
                    <Icon className="h-4 w-4 mx-auto text-slate-400 dark:text-slate-500 mb-1" aria-hidden="true" />
                    <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {count}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {label}
                    </div>
                  </div>
                ))}
              </div>

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
