import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  FORM_DIALOG_CONTENT_CLASS,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type {
  Branch,
  Preset,
  TemplateSet,
  CreateBranchInput,
} from "@/api/branch-queries";

/**
 * Props for the CreateBranchModal component.
 */
export interface CreateBranchModalProps {
  /**
   * Controls whether the modal dialog is open.
   */
  open: boolean;
  /**
   * Callback fired when open state changes.
   */
  onOpenChange: (open: boolean) => void;
  /**
   * List of existing branches used for client-side name uniqueness checks.
   */
  existingBranches: Branch[];
  /**
   * Available presets loaded from the API.
   */
  presets: Preset[];
  /**
   * Available template sets loaded from the API.
   */
  templates: TemplateSet[];
  /**
   * Submission callback delivering validated branch creation inputs.
   */
  onSubmit: (input: CreateBranchInput) => Promise<void> | void;
  /**
   * Indicates if the creation mutation is currently pending.
   */
  isSubmitting?: boolean;
}

/**
 * CreateBranchModal Component
 *
 * Accessible modal dialog for creating a new resume branch.
 *
 * Architectural Role:
 * - Collects branch configuration: Name, target company, role, preset, template set,
 *   requirements, and custom LLM prompt instructions.
 * - Performs client-side validation to ensure branch names are non-empty and unique.
 * - Automatically cascades preset defaults: selecting a preset with an associated template
 *   auto-populates the template selector.
 * - Sized responsively to at least 720px on desktop and tablet viewports while preserving mobile fluidity.
 *
 * Accessibility & WAI-ARIA Considerations:
 * - Uses Radix UI Dialog primitives (`role="dialog"`).
 * - Implements automatic focus trapping and focus restoration upon dismiss.
 * - Form labels explicitly bound to input IDs (`htmlFor`).
 * - Validation errors announced with `role="alert"` and associated via `aria-describedby` and `aria-invalid`.
 *
 * @param {CreateBranchModalProps} props Component properties.
 * @returns {JSX.Element} The rendered modal dialog.
 */
export const CreateBranchModal: React.FC<CreateBranchModalProps> = ({
  open,
  onOpenChange,
  existingBranches,
  presets,
  templates,
  onSubmit,
  isSubmitting = false,
}) => {
  const [name, setName] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [presetId, setPresetId] = useState<string>("");
  const [templateSetId, setTemplateSetId] = useState<string>("");
  const [targetRequirements, setTargetRequirements] = useState("");
  const [branchInstructions, setBranchInstructions] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  // Initialize or reset defaults when modal opens or options change
  useEffect(() => {
    if (open) {
      setName("");
      setTargetCompany("");
      setTargetRole("");
      setTargetRequirements("");
      setBranchInstructions("");
      setNameError(null);

      // Default preset to built-in system preset if available
      const defaultPreset =
        presets.find((p) => p.is_built_in) || presets[0] || null;
      const initialPresetId = defaultPreset ? defaultPreset.id : "";
      setPresetId(initialPresetId);

      // Default template to preset's template or first available template
      const initialTemplateId =
        (defaultPreset && defaultPreset.template_set_id) ||
        (templates[0] && templates[0].id) ||
        "standard";
      setTemplateSetId(initialTemplateId);
    }
  }, [open, presets, templates]);

  /**
   * Handles preset selection changes, auto-selecting the preset's default template.
   */
  const handlePresetChange = (newPresetId: string) => {
    setPresetId(newPresetId);
    if (newPresetId) {
      const selected = presets.find((p) => p.id === newPresetId);
      if (selected && selected.template_set_id) {
        setTemplateSetId(selected.template_set_id);
      }
    }
  };

  /**
   * Validates form state and dispatches creation callback.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError("Branch name is required.");
      return;
    }

    const isDuplicate = existingBranches.some(
      (b) => b.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setNameError("A branch with this name already exists. Please choose a unique name.");
      return;
    }

    setNameError(null);

    await onSubmit({
      name: trimmedName,
      target_company: targetCompany.trim(),
      target_role: targetRole.trim(),
      preset_id: presetId || undefined,
      template_set_id: templateSetId,
      target_requirements: targetRequirements.trim(),
      branch_instructions: branchInstructions.trim(),
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={FORM_DIALOG_CONTENT_CLASS}>
        <DialogHeader>
          <DialogTitle>Create New Resume Branch</DialogTitle>
          <DialogDescription>
            Configure a tailored resume branch with target roles, custom instructions, and template sets.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Branch Name Field */}
          <div>
            <label
              htmlFor="create-branch-name"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Branch Name *
            </label>
            <input
              id="create-branch-name"
              type="text"
              aria-required="true"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="e.g. Stripe - Staff Backend Engineer"
              aria-invalid={nameError ? "true" : undefined}
              aria-describedby={nameError ? "name-error" : undefined}
              className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {nameError && (
              <p id="name-error" role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
                {nameError}
              </p>
            )}
          </div>

          {/* Grid of Company & Role */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="create-target-company"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Target Company
              </label>
              <input
                id="create-target-company"
                type="text"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="e.g. Stripe"
                className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="create-target-role"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Target Role
              </label>
              <input
                id="create-target-role"
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Staff Backend Engineer"
                className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Grid of Preset & Template */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="create-preset-id"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Preset
              </label>
              <select
                id="create-preset-id"
                value={presetId}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Generic (No Preset) --</option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                    {preset.is_built_in ? " (System Default)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="create-template-set-id"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Template Set *
              </label>
              <select
                id="create-template-set-id"
                aria-required="true"
                value={templateSetId}
                onChange={(e) => setTemplateSetId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
                {templates.length === 0 && (
                  <option value="standard">Standard Default</option>
                )}
              </select>
            </div>
          </div>

          {/* Job Requirements */}
          <div>
            <label
              htmlFor="create-target-requirements"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Target Requirements (Job Description)
            </label>
            <textarea
              id="create-target-requirements"
              rows={3}
              value={targetRequirements}
              onChange={(e) => setTargetRequirements(e.target.value)}
              placeholder="Paste job description or requirements to guide LLM alignment..."
              className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Custom LLM Instructions */}
          <div>
            <label
              htmlFor="create-branch-instructions"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Custom Instructions (Tier 3 Prompt)
            </label>
            <textarea
              id="create-branch-instructions"
              rows={2}
              value={branchInstructions}
              onChange={(e) => setBranchInstructions(e.target.value)}
              placeholder="e.g. Prioritize distributed systems, Kubernetes, and Go architecture..."
              className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
