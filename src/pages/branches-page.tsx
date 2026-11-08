import React, { useState, useMemo } from "react";
import { Plus, Search, AlertCircle, FileText, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { BranchCard } from "@/components/branches/branch-card";
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
 * BranchesPage Component
 *
 * Primary dashboard view for managing tailored resume branches and the canonical default branch.
 *
 * Architectural Role:
 * - Serves as the route entry point for `/branches`.
 * - Composes TanStack Query asynchronous state for branches, presets, and templates.
 * - Handles optimistic creation updates and safe branch deletion guards.
 * - Displays branches in a responsive Card Grid with live search filtering.
 *
 * Accessibility & WAI-ARIA Considerations:
 * - Semantic Level 1 heading (`<h1>`) for the page landmark.
 * - Accessible search control with explicitly associated `<label>` (using `sr-only`).
 * - Loading indicator uses `role="status"` and accessible label.
 * - Zero axe-core accessibility violations verified in Vitest automated audits.
 *
 * @returns {JSX.Element} The rendered Resume Branches dashboard page.
 */
export const BranchesPage: React.FC = () => {
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
      <PageHeader
        title="Resume Branches"
        description="Manage tailored resume variants, branching lines, and default main profile settings."
        icon={GitBranch}
        actions={
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Create New Branch</span>
          </Button>
        }
      />

      {/* Toolbar: Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="relative max-w-sm flex-1">
          <label htmlFor="branch-search" className="sr-only">
            Search branches by name, company, or role
          </label>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          </div>
          <input
            id="branch-search"
            type="search"
            placeholder="Search branches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Error Banner */}
      {branchesError && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-200"
        >
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />
          <div>
            <strong className="font-semibold">Unable to load branches: </strong>
            <span>{branchesError.message}</span>
          </div>
        </div>
      )}

      {/* Catalog Listing */}
      {isBranchesLoading ? (
        <div
          role="status"
          aria-label="Loading resume branches"
          className="flex min-h-[300px] items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading branches...</p>
          </div>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="flex min-h-[350px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <FileText className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            No branches created yet
          </h2>
          <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Create role-targeted resume branches to tailor your career history for
            specific positions, companies, or criteria.
          </p>
          <div className="mt-6">
            <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Create Your First Branch</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBranches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              templateName={templatesMap[branch.template_set_id]}
              presetName={branch.preset_id ? presetsMap[branch.preset_id] : undefined}
              onDelete={handleDeleteTrigger}
            />
          ))}
        </div>
      )}

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
