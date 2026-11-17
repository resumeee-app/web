import * as React from "react";
import { FileText, ChevronDown, ChevronUp, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Props for the BranchContextEditor component.
 */
export interface BranchContextEditorProps {
  /** Target role title from the branch. */
  targetRole?: string | null;
  /** Target company name from the branch. */
  targetCompany?: string | null;
  /** Target requirements / job description text from the branch. */
  targetRequirements?: string | null;
  /** Custom LLM instructions or constraints specific to this branch. */
  branchInstructions?: string | null;
  /** Flag indicating whether the save mutation is currently in flight. */
  isSaving?: boolean;
  /** Callback invoked when the user saves the context. */
  onSave: (data: {
    target_role?: string;
    target_company?: string;
    target_requirements: string;
    branch_instructions: string;
  }) => Promise<void> | void;
  /** Callback fired whenever draft context inputs change to enable reactive prompt previews. */
  onDraftChange?: (data: {
    target_role?: string;
    target_company?: string;
    target_requirements?: string;
    branch_instructions?: string;
  } | null) => void;
  /** Whether the editor starts expanded by default. Defaults to false. */
  defaultExpanded?: boolean;
}

/**
 * BranchContextEditor provides an accessible, expandable editor for viewing
 * and modifying a branch's target job description/requirements and custom
 * tailoring prompt instructions.
 *
 * Accessibility / WAI-ARIA Considerations:
 * - Semantic `<section>` landmark with `aria-labelledby`.
 * - Disclosure button utilizes `aria-expanded` and `aria-controls` referencing the collapsible panel.
 * - Form inputs have programmatic `<label htmlFor="...">` associations.
 * - Save button provides `aria-busy` when save mutation is in flight.
 */
export const BranchContextEditor: React.FC<BranchContextEditorProps> = ({
  targetRole,
  targetCompany,
  targetRequirements = "",
  branchInstructions = "",
  isSaving = false,
  onSave,
  onDraftChange,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const [role, setRole] = React.useState(targetRole || "");
  const [company, setCompany] = React.useState(targetCompany || "");
  const [requirements, setRequirements] = React.useState(
    targetRequirements || ""
  );
  const [instructions, setInstructions] = React.useState(
    branchInstructions || ""
  );

  const panelId = React.useId();
  const headingId = React.useId();

  // Synchronize state when upstream branch props change
  React.useEffect(() => {
    setRole(targetRole || "");
  }, [targetRole]);

  React.useEffect(() => {
    setCompany(targetCompany || "");
  }, [targetCompany]);

  React.useEffect(() => {
    setRequirements(targetRequirements || "");
  }, [targetRequirements]);

  React.useEffect(() => {
    setInstructions(branchInstructions || "");
  }, [branchInstructions]);

  const hasChanges =
    role !== (targetRole || "") ||
    company !== (targetCompany || "") ||
    requirements !== (targetRequirements || "") ||
    instructions !== (branchInstructions || "");

  const isFirstRender = React.useRef(true);

  // Notify listeners of live draft changes when dirty, or null when clean
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (!hasChanges) {
        return;
      }
    }
    if (hasChanges) {
      onDraftChange?.({
        target_role: role,
        target_company: company,
        target_requirements: requirements,
        branch_instructions: instructions,
      });
    } else {
      onDraftChange?.(null);
    }
  }, [hasChanges, role, company, requirements, instructions, onDraftChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: {
      target_role?: string;
      target_company?: string;
      target_requirements: string;
      branch_instructions: string;
    } = {
      target_requirements: requirements,
      branch_instructions: instructions,
    };
    if (role !== (targetRole || "")) {
      payload.target_role = role;
    }
    if (company !== (targetCompany || "")) {
      payload.target_company = company;
    }
    await onSave(payload);
  };

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <div>
            <h2 id={headingId} className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Job Description & Context
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              Target requirements and custom tailoring instructions for this branch.
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-controls={panelId}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300"
        >
          <span>
            {isExpanded ? "Hide Editor" : "Edit Job Description & Context"}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      {isExpanded && (
        <form
          id={panelId}
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4"
        >
          {(targetRole !== undefined || targetCompany !== undefined) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="target-role-input"
                  className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  Target Role
                </label>
                <input
                  id="target-role-input"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={isSaving}
                  placeholder="e.g., Staff Distributed Systems Engineer"
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 dark:disabled:bg-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="target-company-input"
                  className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  Target Company
                </label>
                <input
                  id="target-company-input"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  disabled={isSaving}
                  placeholder="e.g., Stripe"
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 dark:disabled:bg-slate-900"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="target-requirements-input"
              className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              Job Description & Target Requirements
            </label>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">
              Paste the target job description or requirements to guide LLM ATS
              alignment and qualification gap analysis.
            </p>
            <textarea
              id="target-requirements-input"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              disabled={isSaving}
              rows={6}
              placeholder="Paste job description, responsibilities, or required qualifications..."
              className="mt-2 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-500 dark:disabled:text-slate-400"
            />
          </div>

          <div>
            <label
              htmlFor="branch-instructions-input"
              className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              Custom Branch Instructions
            </label>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">
              Add custom instructions or prompts specific to this resume branch
              (e.g., tone, emphasis, special constraints).
            </p>
            <textarea
              id="branch-instructions-input"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={isSaving}
              rows={4}
              placeholder="e.g., Emphasize Go distributed systems experience and keep summary under 3 sentences..."
              className="mt-2 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-500 dark:disabled:text-slate-400"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSaving || !hasChanges}
              aria-busy={isSaving}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  <span>Save Context</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
};
