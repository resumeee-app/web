import * as React from "react";
import { FileText, ChevronDown, ChevronUp, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Props for the BranchContextEditor component.
 */
export interface BranchContextEditorProps {
  /** Target requirements / job description text from the branch. */
  targetRequirements?: string | null;
  /** Custom LLM instructions or constraints specific to this branch. */
  branchInstructions?: string | null;
  /** Flag indicating whether the save mutation is currently in flight. */
  isSaving?: boolean;
  /** Callback invoked when the user saves the context. */
  onSave: (data: {
    target_requirements: string;
    branch_instructions: string;
  }) => Promise<void> | void;
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
  targetRequirements = "",
  branchInstructions = "",
  isSaving = false,
  onSave,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
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
    setRequirements(targetRequirements || "");
  }, [targetRequirements]);

  React.useEffect(() => {
    setInstructions(branchInstructions || "");
  }, [branchInstructions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      target_requirements: requirements,
      branch_instructions: instructions,
    });
  };

  const hasChanges =
    requirements !== (targetRequirements || "") ||
    instructions !== (branchInstructions || "");

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          <div>
            <h2 id={headingId} className="text-lg font-bold text-slate-900">
              Job Description & Context
            </h2>
            <p className="text-xs text-slate-500">
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
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600"
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
          className="mt-6 space-y-4 border-t border-slate-100 pt-4"
        >
          <div>
            <label
              htmlFor="target-requirements-input"
              className="block text-sm font-semibold text-slate-800"
            >
              Job Description & Target Requirements
            </label>
            <p className="mt-0.5 text-xs text-slate-500">
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
              className="mt-2 block w-full rounded-md border border-slate-300 p-3 text-sm font-mono text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div>
            <label
              htmlFor="branch-instructions-input"
              className="block text-sm font-semibold text-slate-800"
            >
              Custom Branch Instructions
            </label>
            <p className="mt-0.5 text-xs text-slate-500">
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
              className="mt-2 block w-full rounded-md border border-slate-300 p-3 text-sm font-mono text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
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
