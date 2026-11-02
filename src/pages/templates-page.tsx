/**
 * @file templates-page.tsx
 * @description Catalog gallery view for browsing, filtering, previewing, and managing Template Sets.
 * Displays system built-in templates (immutable) and user-authored custom templates.
 *
 * Immutability & Safety Invariant:
 * Deletion is disabled and hidden for system built-in templates. Attempting to delete a custom
 * template presents an accessible Radix `AlertDialog` confirmation with permanent destruction warnings.
 *
 * Accessibility & WAI-ARIA Considerations:
 * - Semantic landmark `<main id="main-content">` containing hierarchical `<h1>` and `<h2>` elements.
 * - Search input includes explicit `aria-label` and `type="search"`.
 * - Category filter buttons use `aria-pressed` for active state indication.
 * - Delete confirmation employs `@radix-ui/react-alert-dialog` for focus trapping and escape dismissal.
 * - Quick Preview dialog uses `@radix-ui/react-dialog` with sandboxed iframe (`sandbox=""`, no `allow-scripts`).
 */

import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Layers,
  ShieldCheck,
  User,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  useTemplates,
  useDeleteTemplate,
  isBuiltInTemplate,
  type TemplateSet,
} from "@/api/template-queries";
import { TemplateCard } from "@/components/templates/template-card";
import { TemplatePreviewPane } from "@/components/templates/template-preview-pane";

/**
 * Primary page component for the Template Sets Catalog (`/templates`).
 *
 * Architectural Role:
 * Provides a responsive grid catalog of all available resume templates, category filters,
 * real-time search, quick previews in sandboxed iframes, and deletion workflows.
 *
 * @returns JSX element representing the templates catalog page.
 */
export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: templates = [], isLoading, error } = useTemplates();
  const deleteMutation = useDeleteTemplate();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterType, setFilterType] = React.useState<"all" | "builtin" | "custom">("all");

  // State for delete confirmation modal
  const [templateToDelete, setTemplateToDelete] = React.useState<TemplateSet | null>(null);

  // State for quick preview modal
  const [previewTemplate, setPreviewTemplate] = React.useState<TemplateSet | null>(null);

  // Filter templates
  const filteredTemplates = React.useMemo(() => {
    return templates.filter((tmpl) => {
      const isBuiltIn = isBuiltInTemplate(tmpl);

      if (filterType === "builtin" && !isBuiltIn) return false;
      if (filterType === "custom" && isBuiltIn) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        tmpl.name.toLowerCase().includes(q) ||
        (tmpl.description && tmpl.description.toLowerCase().includes(q))
      );
    });
  }, [templates, searchQuery, filterType]);

  const builtInCount = React.useMemo(
    () => templates.filter((t) => isBuiltInTemplate(t)).length,
    [templates]
  );
  const customCount = React.useMemo(
    () => templates.filter((t) => !isBuiltInTemplate(t)).length,
    [templates]
  );

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;
    try {
      await deleteMutation.mutateAsync(templateToDelete.id);
      setTemplateToDelete(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDuplicate = (tmpl: TemplateSet) => {
    navigate(`/templates/new?duplicate=${tmpl.id}`);
  };

  return (
    <main id="main-content" className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="sm:flex sm:items-center sm:justify-between border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Template Sets
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Browse standard built-in ATS templates or construct custom Go templates for multi-format resumes.
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button asChild className="shadow-sm">
              <Link to="/templates/new" className="flex items-center space-x-2">
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Create Template</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Filter and Search Controls */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Box */}
          <div className="relative max-w-md flex-1">
            <label htmlFor="template-search" className="sr-only">
              Search templates by name or description
            </label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </div>
            <input
              id="template-search"
              type="search"
              aria-label="Search templates by name or description"
              placeholder="Search templates by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Type Filter Buttons */}
          <div
            role="group"
            aria-label="Filter templates by category"
            className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
          >
            <button
              type="button"
              onClick={() => setFilterType("all")}
              aria-pressed={filterType === "all"}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                filterType === "all"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({templates.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("builtin")}
              aria-pressed={filterType === "builtin"}
              className={`flex items-center rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                filterType === "builtin"
                  ? "bg-amber-600 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="h-3 w-3 mr-1" aria-hidden="true" />
              Built-in ({builtInCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("custom")}
              aria-pressed={filterType === "custom"}
              className={`flex items-center rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                filterType === "custom"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="h-3 w-3 mr-1" aria-hidden="true" />
              Custom ({customCount})
            </button>
          </div>
        </div>

        {/* Loading and Error States */}
        {isLoading && (
          <div className="mt-16 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" aria-hidden="true" />
            <p className="mt-3 text-sm">Loading template sets catalog...</p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
              <span className="font-semibold">Failed to load templates</span>
            </div>
            <p className="mt-1 text-xs text-red-700">
              {(error as Error)?.message || "An unexpected error occurred while communicating with the server."}
            </p>
          </div>
        )}

        {/* Templates Grid */}
        {!isLoading && !error && filteredTemplates.length > 0 && (
          <section aria-labelledby="templates-grid-heading" className="mt-8">
            <h2 id="templates-grid-heading" className="sr-only">
              Available Template Sets
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((tmpl) => (
                <TemplateCard
                  key={tmpl.id}
                  template={tmpl}
                  onPreview={(t) => setPreviewTemplate(t)}
                  onDelete={(t) => setTemplateToDelete(t)}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredTemplates.length === 0 && (
          <div className="mt-16 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Layers className="mx-auto h-12 w-12 text-slate-400" aria-hidden="true" />
            <h3 className="mt-2 text-base font-semibold text-slate-900">
              No template sets found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {searchQuery
                ? `No templates match your query "${searchQuery}". Try a different keyword.`
                : "No template sets available in this category."}
            </p>
            {searchQuery && (
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Radix AlertDialog */}
      <AlertDialog
        open={Boolean(templateToDelete)}
        onOpenChange={(open) => !open && setTemplateToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template Set</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone and will permanently remove the custom template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Preview Radix Dialog with Sandboxed Iframe */}
      <Dialog
        open={Boolean(previewTemplate)}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
      >
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-6">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{previewTemplate?.name}</DialogTitle>
                <DialogDescription>
                  {previewTemplate?.description || "Previewing resume formatting with sample data."}
                </DialogDescription>
              </div>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" aria-label="Close Preview">
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="flex-1 mt-4 overflow-hidden">
            {previewTemplate && (
              <TemplatePreviewPane
                htmlTemplate={previewTemplate.html_template}
                cssStyles={previewTemplate.css_styles}
                markdownTemplate={previewTemplate.markdown_template}
                textTemplate={previewTemplate.text_template}
                className="h-full"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};
