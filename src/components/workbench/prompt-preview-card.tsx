import * as React from "react";
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "./badge";
import { isUserAdmin } from "@/api/client";
import {
  usePromptPreview,
  type PromptPreviewRequest,
  type Branch,
} from "@/api/workbench-queries";

/**
 * Props for the PromptPreviewCard component.
 */
export interface PromptPreviewCardProps {
  /** The resume branch object providing id and baseline context. */
  branch: Branch;
  /** Optional transient draft overrides; when omitted or null, uses the branch's saved state via GET. */
  draftOverrides?: PromptPreviewRequest | null;
  /** Whether the card starts expanded by default. Defaults to false. */
  defaultExpanded?: boolean;
  /** Optional explicit override for admin status; defaults to isUserAdmin(). */
  isAdmin?: boolean;
}

/**
 * PromptPreviewCard renders an accessible, collapsible inspector for viewing
 * the assembled LLM prompt compiled for resume tailoring.
 *
 * Accessibility / WAI-ARIA Considerations:
 * - Semantic `<section>` landmark with programmatic `aria-labelledby`.
 * - Disclosure button utilizes `aria-expanded` and `aria-controls`.
 * - Preformatted prompt block has accessible label and keyboard focusability (`tabIndex={0}`).
 * - Copy button provides dynamic screen reader feedback and visual confirmation.
 */
export const PromptPreviewCard: React.FC<PromptPreviewCardProps> = ({
  branch,
  draftOverrides,
  defaultExpanded = false,
  isAdmin: propIsAdmin,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const [isCopied, setIsCopied] = React.useState(false);

  const panelId = React.useId();
  const headingId = React.useId();
  const copyTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Clear clipboard feedback timer on unmount
  React.useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Debounce overrides to avoid rapid re-fetches while typing
  const [debouncedOverrides, setDebouncedOverrides] = React.useState<
    PromptPreviewRequest | undefined
  >(draftOverrides ?? undefined);

  React.useEffect(() => {
    if (!draftOverrides) {
      setDebouncedOverrides(undefined);
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedOverrides(draftOverrides);
    }, 200);

    return () => clearTimeout(timer);
  }, [draftOverrides]);

  const isAdmin = propIsAdmin ?? isUserAdmin();

  const {
    data: promptPreview,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = usePromptPreview(branch.id, debouncedOverrides, {
    enabled: isAdmin && isExpanded && Boolean(branch?.id),
  });

  const combinedPrompt = React.useMemo(() => {
    if (!promptPreview) return "";
    return [promptPreview.system_prompt, promptPreview.user_prompt]
      .filter(Boolean)
      .join("\n\n");
  }, [promptPreview]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch {
      // Clipboard write failure fallback
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal
            className="h-5 w-5 text-indigo-600 dark:text-indigo-400"
            aria-hidden="true"
          />
          <div>
            <h2
              id={headingId}
              className="text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              LLM Prompt Preview
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Inspect the assembled prompt drafts compiled for resume tailoring.
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-controls={panelId}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
        >
          <span>{isExpanded ? "Hide LLM Prompt" : "Inspect LLM Prompt"}</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      {isExpanded && (
        <div
          id={panelId}
          className="mt-6 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4"
        >
          {/* Controls Header: Status and Copy */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Compiled Prompt
              </span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                Full LLM Context
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {isFetching && !isLoading && (
                <span className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  <span>Updating draft...</span>
                </span>
              )}
              {promptPreview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(combinedPrompt)}
                  className="h-7 text-xs flex items-center gap-1 px-2.5"
                  aria-label={
                    isCopied
                      ? "Prompt copied to clipboard"
                      : "Copy prompt to clipboard"
                  }
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                      <span className="text-emerald-600 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                      <span>Copy Prompt</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div
              role="status"
              className="flex min-h-[160px] flex-col items-center justify-center space-y-2 rounded-md border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-6"
            >
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Compiling prompt draft from templates and profile data...
              </p>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div
              role="alert"
              className="rounded-md border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                    Failed to Compile Prompt Draft
                  </h3>
                  <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
                    {error instanceof Error ? error.message : "An unexpected error occurred while compiling prompts."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void refetch()}
                    className="mt-3 h-7 text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Retry Compilation</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Prompt Content */}
          {promptPreview && !isLoading && (
            <div className="space-y-2">
              {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
              <pre tabIndex={0}
                aria-label="Compiled prompt preview"
                className="max-h-[32rem] overflow-auto rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-all"
              >
                <code>{combinedPrompt}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
