import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
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
   * Available presets / tailoring strategies loaded from the API.
   */
  presets: Preset[];
  /**
   * Available visual layout template sets loaded from the API.
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
  /**
   * Optional ref to trigger element to restore focus on modal dismissal.
   */
  triggerRef?: React.RefObject<HTMLElement | null>;
  /**
   * Optional initial form values used to pre-populate the wizard (e.g. guided tour demos).
   */
  initialValues?: Partial<CreateBranchInput>;
  /**
   * Optional externally controlled wizard step (1 | 2 | 3).
   */
  controlledStep?: 1 | 2 | 3;
  /**
   * Optional callback fired whenever the active wizard step changes.
   */
  onStepChange?: (step: 1 | 2 | 3) => void;
  /**
   * When true, locks inputs/radios to read-only demo values while keeping Cancel and Submit functional.
   */
  readOnlyDemo?: boolean;
  /**
   * When true, renders the dialog inline within its parent container instead of portaling over the full viewport.
   */
  inline?: boolean;
}

/**
 * CreateBranchModal Component
 *
 * Implements RFC-005 Section 6.1 Progressive 3-Step Creation Wizard:
 * - Step 1: Opportunity Context (Name, target company, target role, job description / requirements).
 * - Step 2: AI Tailoring Strategy (LLM prompt guidelines, density, custom instructions).
 * - Step 3: Visual Layout & Design (ATS layout, styling themes).
 *
 * Workflow Invariant:
 * Selecting a strategy in Step 2 automatically suggests its `suggested_theme_id` in Step 3
 * without overwriting an explicit user selection in Step 3.
 *
 * Accessibility & WAI-ARIA Considerations:
 * - Uses Radix UI Dialog primitives (`role="dialog"`).
 * - Step indicator navigation with `aria-current="step"`.
 * - Radio groups with `<fieldset>` and `<legend>` for strategy and theme cards.
 * - Form labels explicitly bound to input IDs (`htmlFor`).
 * - Validation errors announced with `role="alert"`.
 * - Sized responsively (`sm:max-w-[720px]`).
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
  triggerRef,
  initialValues,
  controlledStep,
  onStepChange,
  readOnlyDemo = false,
  inline = false,
}) => {
  const inlineTitleId = React.useId();
  const inlineDescId = React.useId();
  const [internalStep, setInternalStep] = useState<1 | 2 | 3>(1);
  const step = controlledStep ?? internalStep;
  const setStep = React.useCallback(
    (next: 1 | 2 | 3) => {
      setInternalStep(next);
      onStepChange?.(next);
    },
    [onStepChange]
  );
  const [hasManuallySelectedTheme, setHasManuallySelectedTheme] = useState(false);
  const internalTriggerRef = useRef<HTMLElement | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [presetId, setPresetId] = useState<string>("");
  const [templateSetId, setTemplateSetId] = useState<string>("");
  const [targetRequirements, setTargetRequirements] = useState("");
  const [branchInstructions, setBranchInstructions] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  // Initialize or reset defaults when modal opens
  useEffect(() => {
    if (open) {
      if (!triggerRef?.current) {
        internalTriggerRef.current = (document.activeElement as HTMLElement) || null;
      }
      setInternalStep(1);
      setHasManuallySelectedTheme(Boolean(initialValues?.template_set_id));
      setName(initialValues?.name ?? "");
      setTargetCompany(initialValues?.target_company ?? "");
      setTargetRole(initialValues?.target_role ?? "");
      setTargetRequirements(initialValues?.target_requirements ?? "");
      setBranchInstructions(initialValues?.branch_instructions ?? "");
      setNameError(null);

      // Default preset to initialValues or built-in system preset if available
      const defaultPreset =
        presets.find((p) => p.is_built_in) || presets[0] || null;
      const initialPresetId =
        initialValues?.preset_id ?? (defaultPreset ? defaultPreset.id : "");
      setPresetId(initialPresetId);

      // Default template to initialValues, preset's suggested theme, or first available template
      const initialTemplateId =
        initialValues?.template_set_id ??
        defaultPreset?.suggested_theme_id ??
        (templates[0] && templates[0].id) ??
        "standard";
      setTemplateSetId(initialTemplateId);
    }
  }, [open, presets, templates, triggerRef, initialValues]);

  /**
   * Validates Step 1 inputs (required name and unique name check).
   */
  const validateStep1 = (): boolean => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Branch name is required.");
      return false;
    }

    const isDuplicate = existingBranches.some(
      (b) => b.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setNameError("A branch with this name already exists. Please choose a unique name.");
      return false;
    }

    setNameError(null);
    return true;
  };

  /**
   * Handles preset selection changes, auto-suggesting the preset's theme if not manually chosen.
   */
  const handlePresetChange = (newPresetId: string) => {
    if (readOnlyDemo) return;
    setPresetId(newPresetId);
    if (newPresetId && !hasManuallySelectedTheme) {
      const selected = presets.find((p) => p.id === newPresetId);
      const suggested = selected?.suggested_theme_id;
      if (suggested && templates.some((t) => t.id === suggested)) {
        setTemplateSetId(suggested);
      }
    }
  };

  /**
   * Handles template selection changes, recording user manual intent.
   */
  const handleTemplateChange = (newTemplateId: string, isManual = true) => {
    if (readOnlyDemo) return;
    setTemplateSetId(newTemplateId);
    if (isManual) {
      setHasManuallySelectedTheme(true);
    }
  };

  /**
   * Advances wizard forward.
   */
  const handleNext = () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  /**
   * Moves wizard backward.
   */
  const handleBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  };

  /**
   * Validates form state and dispatches creation callback.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) {
      setStep(1);
      return;
    }

    const trimmedName = name.trim();
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

  const handleInlineClose = React.useCallback(() => {
    onOpenChange(false);
    const el = triggerRef?.current || internalTriggerRef.current;
    if (el) {
      internalTriggerRef.current = null;
      requestAnimationFrame(() => el.focus());
    }
  }, [onOpenChange, triggerRef]);

  useEffect(() => {
    if (!inline || !open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleInlineClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inline, open, handleInlineClose]);

  const handleCloseAction = () => {
    if (inline) {
      handleInlineClose();
    } else {
      onOpenChange(false);
    }
  };

  const StepHeadingTag: "h3" | "h4" = inline ? "h4" : "h3";

  const wizardBody = (
    <>
      {/* Wizard Step Indicator */}
      <nav aria-label="Creation Steps" className="border-b border-slate-200 dark:border-slate-800 pb-3 my-2">
          <ol className="flex w-full items-center justify-between gap-2 text-xs sm:text-sm">
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`w-full py-1.5 px-2.5 rounded-md text-left font-medium transition-colors ${
                  step === 1
                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                aria-current={step === 1 ? "step" : undefined}
              >
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-300">Step 1</span>
                <span>The Opportunity</span>
              </button>
            </li>
            <li className="flex-1">
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
                className={`w-full py-1.5 px-2.5 rounded-md text-left font-medium transition-colors ${
                  step === 2
                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                aria-current={step === 2 ? "step" : undefined}
              >
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-300">Step 2</span>
                <span>AI Tailoring</span>
              </button>
            </li>
            <li className="flex-1">
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setStep(3);
                }}
                className={`w-full py-1.5 px-2.5 rounded-md text-left font-medium transition-colors ${
                  step === 3
                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                aria-current={step === 3 ? "step" : undefined}
              >
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-300">Step 3</span>
                <span>Visual Design</span>
              </button>
            </li>
          </ol>
        </nav>

        <form noValidate onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* STEP 1: The Opportunity */}
          <div className={step === 1 ? "space-y-4" : "hidden"}>
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
                readOnly={readOnlyDemo}
                value={name}
                onChange={(e) => {
                  if (readOnlyDemo) return;
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
                  readOnly={readOnlyDemo}
                  value={targetCompany}
                  onChange={(e) => {
                    if (!readOnlyDemo) setTargetCompany(e.target.value);
                  }}
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
                  readOnly={readOnlyDemo}
                  value={targetRole}
                  onChange={(e) => {
                    if (!readOnlyDemo) setTargetRole(e.target.value);
                  }}
                  placeholder="e.g. Staff Backend Engineer"
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Target Requirements (Job Description) */}
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
                readOnly={readOnlyDemo}
                value={targetRequirements}
                onChange={(e) => {
                  if (!readOnlyDemo) setTargetRequirements(e.target.value);
                }}
                placeholder="Paste job description or requirements to guide LLM alignment..."
                className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* STEP 2: AI Tailoring Strategy */}
          <div className={step === 2 ? "space-y-4" : "hidden"}>
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
              <StepHeadingTag className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Step 2: AI Tailoring Strategy
              </StepHeadingTag>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Choose how AI analyzes and presents your career achievements (prompt directives and density guidelines):
              </p>
            </div>

            <div>
              <label
                htmlFor="create-preset-id"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Tailoring Strategy
              </label>
              <select
                id="create-preset-id"
                value={presetId}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Generic (No Strategy) --</option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                    {preset.language && preset.language !== "English" ? ` (${preset.language})` : ""}
                    {preset.is_built_in ? " (System Default)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Selectable Strategy Cards */}
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Strategy Options
              </legend>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {presets.map((preset) => {
                  const isSelected = presetId === preset.id;
                  return (
                    <label
                      key={preset.id}
                      htmlFor={`strategy-card-${preset.id}`}
                      className={`flex cursor-pointer flex-col justify-between rounded-lg border p-3 text-xs transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30 ring-1 ring-indigo-500"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {preset.name}
                        </span>
                        <input
                          type="radio"
                          id={`strategy-card-${preset.id}`}
                          name="tailoring-strategy-card"
                          value={preset.id}
                          checked={isSelected}
                          onChange={() => handlePresetChange(preset.id)}
                          className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                        />
                      </div>
                      {preset.system_instructions && (
                        <p className="mt-1 text-[11px] text-slate-700 dark:text-slate-300 line-clamp-2">
                          {preset.system_instructions}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {preset.is_built_in && (
                          <span className="inline-flex items-center rounded bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:text-indigo-300">
                            Built-in
                          </span>
                        )}
                        {preset.language && (
                          <span className="inline-flex items-center rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-700 dark:text-slate-300">
                            {preset.language}
                          </span>
                        )}
                        {preset.suggested_theme_id && (
                          <span className="inline-flex items-center rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-700 dark:text-slate-300">
                            Suggests: {preset.suggested_theme_id}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>

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
                readOnly={readOnlyDemo}
                value={branchInstructions}
                onChange={(e) => {
                  if (!readOnlyDemo) setBranchInstructions(e.target.value);
                }}
                placeholder="e.g. Prioritize distributed systems, Kubernetes, and Go architecture..."
                className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* STEP 3: Visual Layout & Design */}
          <div className={step === 3 ? "space-y-4" : "hidden"}>
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
              <StepHeadingTag className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Step 3: Visual Layout & Design
              </StepHeadingTag>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Choose visual appearance and ATS formatting (visual Go template layout, independent of AI strategy):
              </p>
            </div>

            <div>
              <label
                htmlFor="create-template-set-id"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Template Set *
              </label>
              <select
                id="create-template-set-id"
                aria-required="true"
                value={templateSetId}
                onChange={(e) => handleTemplateChange(e.target.value, true)}
                className="block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

            {/* Selectable Theme Cards */}
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Theme Options
              </legend>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {templates.map((template) => {
                  const isSelected = templateSetId === template.id;
                  return (
                    <label
                      key={template.id}
                      htmlFor={`template-card-${template.id}`}
                      className={`flex cursor-pointer flex-col justify-between rounded-lg border p-3 text-xs transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30 ring-1 ring-indigo-500"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {template.name}
                        </span>
                        <input
                          type="radio"
                          id={`template-card-${template.id}`}
                          name="visual-theme-card"
                          value={template.id}
                          checked={isSelected}
                          onChange={() => handleTemplateChange(template.id, true)}
                          className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                        />
                      </div>
                      {template.description && (
                        <p className="mt-1 text-[11px] text-slate-700 dark:text-slate-300 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {template.is_built_in && (
                          <span className="inline-flex items-center rounded bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                            Built-in Theme
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={handleCloseAction}
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={handleBack}
                >
                  Back
                </Button>
              )}
              {step < 3 && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSubmitting}
                  onClick={handleNext}
                >
                  Next: {step === 1 ? "AI Tailoring" : "Visual Design"}
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Branch"}
              </Button>
            </div>
          </DialogFooter>
        </form>
    </>
  );

  if (inline) {
    if (!open) return null;
    return (
      <div className="relative z-10 flex w-full items-center justify-center rounded-lg bg-slate-950/20 dark:bg-slate-950/50 backdrop-blur-[1px] p-2 sm:p-4">
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby={inlineTitleId}
          aria-describedby={inlineDescId}
          className="relative w-full max-w-[680px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-5 sm:p-6 shadow-xl space-y-4"
        >
          <button
            type="button"
            onClick={handleInlineClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>

          <div className="flex flex-col space-y-1.5 text-center sm:text-left pr-6">
            <h3
              id={inlineTitleId}
              className="text-lg font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-100"
            >
              Create New Resume Branch
            </h3>
            <p id={inlineDescId} className="text-sm text-slate-500 dark:text-slate-300">
              Configure a tailored resume branch with target roles, custom instructions, and template sets.
            </p>
          </div>

          {wizardBody}
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={FORM_DIALOG_CONTENT_CLASS}
        onCloseAutoFocus={(e) => {
          const el = triggerRef?.current || internalTriggerRef.current;
          if (el) {
            e.preventDefault();
            internalTriggerRef.current = null;
            el.focus();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Create New Resume Branch</DialogTitle>
          <DialogDescription>
            Configure a tailored resume branch with target roles, custom instructions, and template sets.
          </DialogDescription>
        </DialogHeader>

        {wizardBody}
      </DialogContent>
    </Dialog>
  );
};
