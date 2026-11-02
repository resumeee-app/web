import React, { useState, useMemo } from "react";
import { Plus, LayoutGrid, List, Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BranchList } from "@/components/branches/branch-list";
import { CreateBranchModal } from "@/components/branches/create-branch-modal";
import { DeleteBranchDialog } from "@/components/branches/delete-branch-dialog";
import {
  useBranchesQuery,
  usePresetsQuery,
  useTemplatesQuery,
  useCreateBranchMutation,
  useDeleteBranchMutation,
  type Branch,
  type CreateBranchInput,
} from "@/api/branch-queries";

/**
 * View presentation mode for the branch catalog.
 */
export type CatalogViewMode = "grid" | "table";

/**
 * BranchesPage Component
 *
 * Primary dashboard view for managing tailored resume branches and the canonical default branch.
 *
 * Architectural Role:
 * - Serves as the route entry point for `/branches`.
 * - Composes TanStack Query asynchronous state for branches, presets, and templates.
 * - Handles optimistic creation updates and safe branch deletion guards.
 * - Coordinates view mode toggling (Card Grid vs Responsive Table) and live search filtering.
 *
 * Accessibility & WAI-ARIA Considerations:
 * - Semantic Level 1 heading (`<h1>`) for the page landmark.
 * - Accessible search control with explicitly associated `<label>` (using `sr-only`).
 * - View mode toggle buttons indicate active state via `aria-pressed`.
 * - Zero axe-core accessibility violations verified in Vitest automated audits.
 *
 * @returns {JSX.Element} The rendered Resume Branches dashboard page.
 */
export const BranchesPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<CatalogViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // TanStack Query asynchronous hooks
  const {
    data: branches = [],
    isLoading: isBranchesLoading,
    error: branchesError,
  } = useBranchesQuery();
  const { data: presets = [] } = usePresetsQuery();
  const { data: templates = [] } = useTemplatesQuery();

  const createMutation = useCreateBranchMutation();
  const deleteMutation = useDeleteBranchMutation();

  /**
   * Fast lookup dictionaries mapping template IDs to human-readable names.
   */
  const templatesMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of templates) {
      map[t.id] = t.name;
    }
    return map;
  }, [templates]);

  /**
   * Fast lookup dictionaries mapping preset IDs to human-readable names.
   */
  const presetsMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of presets) {
      map[p.id] = p.name;
    }
    return map;
  }, [presets]);

  /**
   * Filtered branch collection based on case-insensitive search criteria.
   */
  const filteredBranches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return branches;
    }
    return branches.filter((b) => {
      const nameMatch = b.name.toLowerCase().includes(query);
      const companyMatch = b.target_company?.toLowerCase().includes(query);
      const roleMatch = b.target_role?.toLowerCase().includes(query);
      return nameMatch || companyMatch || roleMatch;
    });
  }, [branches, searchQuery]);

  /**
   * Dispatches branch creation to the mutation hook.
   *
   * @param {CreateBranchInput} input Validated branch creation payload.
   */
  const handleCreateBranch = async (input: CreateBranchInput) => {
    await createMutation.mutateAsync(input);
  };

  /**
   * Opens the confirmation dialog for branch deletion.
   *
   * @param {Branch} branch The branch to delete.
   */
  const handleDeleteTrigger = (branch: Branch) => {
    setBranchToDelete(branch);
    setIsDeleteOpen(true);
  };

  /**
   * Executes the branch deletion via the mutation hook.
   *
   * @param {Branch} branch The target branch.
   */
  const handleConfirmDelete = async (branch: Branch) => {
    await deleteMutation.mutateAsync(branch);
    setBranchToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header Landmark */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Resume Branches
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage tailored resume variants, branching lines, and default master profile settings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Create New Branch</span>
          </Button>
        </div>
      </div>

      {/* Toolbar: Search & View Mode Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div className="relative max-w-sm flex-1">
          <label htmlFor="branch-search" className="sr-only">
            Search branches by name, company, or role
          </label>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
          <input
            id="branch-search"
            type="search"
            placeholder="Search branches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div
          role="group"
          aria-label="View presentation mode"
          className="flex items-center rounded-md border border-slate-200 bg-slate-50 p-1"
        >
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            aria-pressed={viewMode === "grid"}
            aria-label="Grid View"
            className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              viewMode === "grid"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Grid View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            aria-pressed={viewMode === "table"}
            aria-label="Table View"
            className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              viewMode === "table"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <List className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Table View</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {branchesError && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" aria-hidden="true" />
          <div>
            <strong className="font-semibold">Unable to load branches: </strong>
            <span>{branchesError.message}</span>
          </div>
        </div>
      )}

      {/* Catalog Listing */}
      <BranchList
        branches={filteredBranches}
        viewMode={viewMode}
        isLoading={isBranchesLoading}
        templatesMap={templatesMap}
        presetsMap={presetsMap}
        onDeleteBranch={handleDeleteTrigger}
        onCreateBranchClick={() => setIsCreateOpen(true)}
      />

      {/* Creation Modal */}
      <CreateBranchModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        existingBranches={branches}
        presets={presets}
        templates={templates}
        onSubmit={handleCreateBranch}
        isSubmitting={createMutation.isPending}
      />

      {/* Deletion Dialog */}
      <DeleteBranchDialog
        branch={branchToDelete}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
};

export default BranchesPage;
