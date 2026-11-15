import * as React from "react";
import { FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tracks the active trigger element when a modal dialog opens and returns a
 * `DialogContent.onCloseAutoFocus` handler that deterministically restores focus
 * to that trigger element upon dismissal.
 *
 * @param open - Whether the dialog is currently open.
 * @returns Event handler to pass directly to Radix `DialogContent` `onCloseAutoFocus`.
 */
export function useDialogTriggerFocusRestore(
  open: boolean
): (event: Event) => void {
  const triggerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (open) {
      triggerRef.current = (document.activeElement as HTMLElement) || null;
    }
  }, [open]);

  return React.useCallback((event: Event) => {
    if (triggerRef.current) {
      event.preventDefault();
      const el = triggerRef.current;
      triggerRef.current = null;
      el.focus();
    }
  }, []);
}

/**
 * Props for the shared {@link ResumeFileDropzone} component.
 */
export interface ResumeFileDropzoneProps {
  /** DOM `id` linking `<label htmlFor={inputId}>` and the file `<input>`. */
  inputId: string;
  /** Visible form label rendered above the dropzone. */
  label: string;
  /** Accepted file extensions / MIME types passed to `<input accept>`. */
  accept: string;
  /** Accessible `aria-label` for the keyboard-focusable dropzone surface. */
  dropzoneAriaLabel: string;
  /** Primary prompt shown inside the dropzone when no file is selected. */
  emptyPrompt: string;
  /** Secondary hint describing accepted formats and size bounds. */
  formatHint: string;
  /** Currently validated selected file, or `null` when empty. */
  selectedFile: File | null;
  /** Pure validation predicate returning an error string or `null` if valid. */
  validateFile: (file: File) => string | null;
  /** Callback invoked with `(file, null)` on valid selection or `(null, error)` on failure / removal. */
  onFileValidated: (file: File | null, error: string | null) => void;
  /** Optional custom icon rendered centered inside the dropzone. */
  icon?: React.ComponentType<{
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>;
  /** Disables drag-and-drop, file browsing, and removal while async work is in-flight. */
  disabled?: boolean;
}

/**
 * Shared accessible drag-and-drop and click/keyboard file upload surface for resume imports.
 * Ensures the hidden `<input type="file">` is rendered as a sibling (not nested inside `role="button"`),
 * resets input value before re-selection so fixed files with identical paths can be re-picked,
 * and enforces WCAG 2.1 AA dual-theme contrast and focus-visible rings.
 *
 * @param props - Component configuration defined in {@link ResumeFileDropzoneProps}.
 * @returns Accessible label, keyboard dropzone, hidden file input, and selected-file chip.
 */
export const ResumeFileDropzone: React.FC<ResumeFileDropzoneProps> = ({
  inputId,
  label,
  accept,
  dropzoneAriaLabel,
  emptyPrompt,
  formatHint,
  selectedFile,
  validateFile,
  onFileValidated,
  icon: Icon = FileText,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!selectedFile) {
      setIsDragOver(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [selectedFile]);

  const openFilePicker = () => {
    if (disabled || !fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const handleCandidateFile = (file: File | undefined) => {
    if (!file || disabled) return;

    const errorMsg = validateFile(file);
    if (errorMsg) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onFileValidated(null, errorMsg);
      return;
    }

    onFileValidated(file, null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleCandidateFile(e.target.files?.[0]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    handleCandidateFile(e.dataTransfer.files?.[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (disabled) return;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onFileValidated(null, null);
  };

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
      </label>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFilePicker}
        className={cn(
          "flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
          disabled
            ? "opacity-60 cursor-not-allowed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
            : isDragOver
              ? "cursor-pointer border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30"
              : "cursor-pointer border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-400 dark:hover:border-slate-600"
        )}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label={dropzoneAriaLabel}
        aria-disabled={disabled || undefined}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openFilePicker();
          }
        }}
      >
        <Icon
          className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-2"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {selectedFile ? selectedFile.name : emptyPrompt}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {formatHint}
        </p>
      </div>

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        onClick={(e) => {
          e.currentTarget.value = "";
        }}
        onChange={handleFileChange}
        className="sr-only"
        tabIndex={-1}
      />

      {selectedFile && (
        <div className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 p-2.5 text-xs text-slate-700 dark:text-slate-300">
          <span className="font-mono truncate">
            {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
          </span>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="rounded p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50"
            aria-label="Remove selected file"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};
