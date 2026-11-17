/**
 * @file template-reference-drawer.tsx
 * @description Slide-out reference drawer for inspecting and copying resume application domain
 * fields and collections available in the Go template execution context.
 *
 * User & Design Invariant:
 * Exposes strictly application domain fields (Profile, Experiences, Projects, Skills,
 * Education, Certifications). Links to official Go template documentation for generic
 * control flow (if/range), pipelines, and built-in functions.
 *
 * Accessibility & WAI-ARIA Considerations:
 * - Built on `@radix-ui/react-dialog` primitives with focus trapping, backdrop dismiss, and Esc support.
 * - Accessible `<DialogPrimitive.Title>` and `<DialogPrimitive.Description>`.
 * - Category filter buttons use standard button semantics with `aria-pressed`.
 * - Accessible `aria-live="polite"` region announcing result counts and copy confirmation to screen readers.
 * - Dynamic copy button `aria-label` updates from "Copy ..." to "Copied ... to clipboard".
 * - External documentation link features explicit accessible label and security attributes (`rel="noopener noreferrer"`).
 */

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  X,
  Search,
  Copy,
  Check,
  BookOpen,
  Code2,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TEMPLATE_PLACEHOLDERS,
  CATEGORY_TABS,
  GO_TEMPLATE_DOCS_URL,
  type PlaceholderCategory,
  type PlaceholderItem,
} from "./template-placeholders-data";

export interface TemplateReferenceDrawerProps {
  /** Controls whether the reference drawer dialog is open. */
  open: boolean;
  /** Callback fired when drawer open state toggles or is dismissed. */
  onOpenChange: (open: boolean) => void;
  /** Optional custom CSS classes for the drawer content panel. */
  className?: string;
}

/**
 * Slide-out reference drawer component for inspecting and copying resume domain fields.
 */
export const TemplateReferenceDrawer: React.FC<TemplateReferenceDrawerProps> = ({
  open,
  onOpenChange,
  className,
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<PlaceholderCategory>("all");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState<string>("");

  // Reset copied state after timeout
  React.useEffect(() => {
    if (!copiedId) return;
    const timer = setTimeout(() => {
      setCopiedId(null);
    }, 1600);
    return () => clearTimeout(timer);
  }, [copiedId]);

  // Handle copy to clipboard
  const handleCopy = async (item: PlaceholderItem) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(item.snippet);
      }
      setCopiedId(item.id);
      setAnnouncement(`Copied ${item.snippet} to clipboard`);
    } catch {
      // Fallback for environments where clipboard write might fail
      setCopiedId(item.id);
      setAnnouncement(`Copied ${item.snippet} to clipboard`);
    }
  };

  // Filter items based on active category and search text
  const filteredItems = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return TEMPLATE_PLACEHOLDERS.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;

      if (!matchesCategory) return false;
      if (!query) return true;

      return (
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.snippet.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query) ||
        (item.example && item.example.toLowerCase().includes(query))
      );
    });
  }, [searchQuery, selectedCategory]);

  // Update screen-reader announcement on filter/search updates
  React.useEffect(() => {
    if (!open) {
      setAnnouncement("");
      return;
    }
    if (searchQuery.trim()) {
      setAnnouncement(`${filteredItems.length} matching domain fields found for "${searchQuery.trim()}".`);
    } else {
      setAnnouncement(`${filteredItems.length} domain fields available in ${selectedCategory} category.`);
    }
  }, [open, filteredItems.length, searchQuery, selectedCategory]);

  // Category counts for badges
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: TEMPLATE_PLACEHOLDERS.length };
    for (const item of TEMPLATE_PLACEHOLDERS) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, []);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop Overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-150",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />

        {/* Slide-out Drawer Panel */}
        <DialogPrimitive.Content
          id="template-reference-drawer"
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 transition-transform duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            className
          )}
        >
          {/* Accessible Screen Reader Live Region for Announcements */}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {announcement}
          </div>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Go Template Placeholder Reference
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-slate-500 dark:text-slate-300">
                  Available application domain fields, collections, and properties for resume templates.
                </DialogPrimitive.Description>
              </div>
            </div>

            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close reference drawer"
                className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Close reference drawer</span>
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* External Go Template Syntax Documentation Banner */}
          <div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50/70 px-6 py-2.5 text-xs text-indigo-900 dark:border-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-200">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
              <span>For Go template syntax, conditional blocks, and loops:</span>
            </div>
            <a
              href={GO_TEMPLATE_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View official Go template syntax documentation (opens in a new tab)"
              className="inline-flex items-center font-medium text-indigo-700 underline hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-100 whitespace-nowrap ml-2"
            >
              <span>Go Template Docs</span>
              <ExternalLink className="h-3 w-3 ml-1" aria-hidden="true" />
            </a>
          </div>

          {/* Search Box */}
          <div className="border-b border-slate-200 px-6 py-3.5 dark:border-slate-800">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search domain fields, properties, or types..."
                className="w-full rounded-md border border-slate-300 bg-slate-50 pl-9 pr-9 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-950"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label="Clear search query"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Category Filter Buttons */}
            <div
              role="group"
              aria-label="Filter placeholders by category"
              className="mt-3 flex flex-wrap gap-1.5"
            >
              {CATEGORY_TABS.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const count = categoryCounts[cat.id] ?? 0;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "flex items-center space-x-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                      isSelected
                        ? "bg-indigo-600 text-white shadow-xs dark:bg-indigo-500"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    )}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px]",
                        isSelected
                          ? "bg-indigo-700/60 text-white dark:bg-indigo-600/70"
                          : "bg-slate-200/70 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 dark:text-slate-300">
                <Code2 className="h-10 w-10 text-slate-400 dark:text-slate-600 mb-2" aria-hidden="true" />
                <p className="text-sm font-medium">No matching placeholders found</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Try adjusting your search query or selecting a different category.
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isCopied = copiedId === item.id;

                return (
                  <div
                    key={item.id}
                    className="group rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs transition-colors hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-indigo-700/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                          {item.name}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {item.type}
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(item)}
                        aria-label={isCopied ? `Copied ${item.snippet} to clipboard` : `Copy ${item.snippet}`}
                        className={cn(
                          "h-7 px-2 text-xs font-medium transition-colors",
                          isCopied
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                        )}
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                            <span>Copy</span>
                          </>
                        )}
                      </Button>
                    </div>

                    <p className="mt-1.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {item.description}
                    </p>

                    {item.example && (
                      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                        <span className="font-semibold text-slate-500 dark:text-slate-300">Example: </span>
                        <span>{item.example}</span>
                      </p>
                    )}

                    {/* Snippet box */}
                    <div className="mt-2 relative">
                      <pre className="rounded bg-slate-900 p-2 font-mono text-[11px] text-emerald-400 dark:bg-slate-950 overflow-x-auto">
                        <code>{item.snippet}</code>
                      </pre>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="border-t border-slate-200 px-6 py-3 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 text-[11px] text-slate-500 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center">
              <Sparkles className="h-3.5 w-3.5 mr-1 text-indigo-500" aria-hidden="true" />
              Resumeee Application Domain Model
            </span>
            <span>{filteredItems.length} fields</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
