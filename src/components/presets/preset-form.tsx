import React, { useState } from "react";
import { Shield, Copy, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConstraintControls } from "./constraint-controls";
import type {
  Preset,
  CreatePresetRequest,
  TemplateSet,
} from "@/api/preset-queries";

/**
 * Broadly supported left-to-right (LTR) languages for contextual LLM translation.
 */
export const SUPPORTED_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Dutch",
  "Polish",
  "Swedish",
  "Danish",
  "Norwegian",
  "Finnish",
  "Czech",
  "Romanian",
  "Hungarian",
  "Turkish",
  "Vietnamese",
  "Indonesian",
  "Japanese",
  "Korean",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "Hindi",
] as const;

/**
 * Props for the PresetForm component.
 */
export interface PresetFormProps {
  /** Optional initial preset values for edit or clone mode */
  initialValues?: Partial<Preset>;
  /** Available template sets for populating the template selector dropdown */
  templateSets: TemplateSet[];
  /** Callback invoked on valid form submission */
  onSubmit: (values: CreatePresetRequest) => Promise<void> | void;
  /** Callback for duplicating a preset (offered in read-only mode) */
  onDuplicate?: (preset: Preset) => void;
  /** Whether a mutation submission is currently in progress */
  isSubmitting?: boolean;
  /** Whether the preset is built-in (triggers read-only mode and disables all form inputs) */
  isBuiltIn?: boolean;
}

/**
 * Validation error dictionary keyed by form field name.
 */
export type FormErrors = Partial<
  Record<"name" | "templateSetId" | "systemInstructions", string>
>;

/**
 * PresetForm manages the creation, editing, and read-only inspection of presets:
 * - Maps strictly to the canonical OpenAPI Preset schema (`name`, `description`, `template_set_id`,
 *   `system_instructions`, `language`)
 * - Integrates the interactive ConstraintControls builder to synthesize length, bullet counts, tone,
 *   and section priorities into prompt instructions
 * - Enforces immutability for system presets (`isBuiltIn === true`): disables inputs, displays an alert banner,
 *   and suppresses the submit action
 * - Enforces WCAG 2.1 AA accessibility with explicit label associations, ARIA invalid states, and alert error messages
 */
export const PresetForm: React.FC<PresetFormProps> = ({
  initialValues,
  templateSets,
  onSubmit,
  onDuplicate,
  isSubmitting = false,
  isBuiltIn = false,
}) => {
  const [name, setName] = useState(initialValues?.name || "");
  const [description, setDescription] = useState(
    initialValues?.description || ""
  );
  const [templateSetId, setTemplateSetId] = useState(
    initialValues?.template_set_id ||
      (templateSets.length > 0 && templateSets[0] ? templateSets[0].id : "")
  );
  const [systemInstructions, setSystemInstructions] = useState(
    initialValues?.system_instructions || ""
  );
  const [language, setLanguage] = useState(
    initialValues?.language || "English"
  );

  const [errors, setErrors] = useState<FormErrors>({});

  /**
   * Resets error state for a single field if an error currently exists.
   */
  const clearFieldError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  /**
   * Validates mandatory fields before dispatching submit.
   * @returns true if all required fields are valid
   */
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!name.trim()) {
      newErrors.name = "Strategy name is required";
    }
    if (!templateSetId) {
      newErrors.templateSetId = "Template set is required";
    }
    if (!systemInstructions.trim()) {
      newErrors.systemInstructions = "System instructions are required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles form submission and triggers onSubmit callback.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBuiltIn) return;
    if (!validate()) return;

    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      template_set_id: templateSetId,
      system_instructions: systemInstructions.trim(),
      language: language.trim() || "English",
    });
  };

  /**
   * Appends synthesized constraints from the ConstraintControls builder into system instructions.
   */
  const handleApplyConstraints = (constraints: string) => {
    if (isBuiltIn) return;
    setSystemInstructions((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n\n${constraints}` : constraints;
    });
    clearFieldError("systemInstructions");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Immutability Banner for built-in system presets */}
      {isBuiltIn && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Shield
              className="h-5 w-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                System Strategy (Read-Only)
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                This built-in tailoring strategy is protected from direct modification. You
                can duplicate it to create a customizable copy.
              </p>
            </div>
          </div>
          {onDuplicate && initialValues && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDuplicate(initialValues as Preset)}
              className="shrink-0 gap-1.5 text-xs text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-blue-950"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Duplicate as Custom</span>
            </Button>
          )}
        </div>
      )}

      {/* Preset Details section */}
      <div className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Tailoring Strategy Configuration
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tailoring Strategy defines AI prompt directives and density constraints. Visual formatting and layout are controlled separately by the Template Set.
          </p>
        </div>

        {/* Name input */}
        <div>
          <label
            htmlFor="preset-name"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Strategy Name <span className="text-red-500">*</span>
          </label>
          <input
            id="preset-name"
            type="text"
            value={name}
            disabled={isBuiltIn}
            onChange={(e) => {
              setName(e.target.value);
              clearFieldError("name");
            }}
            placeholder="e.g. 1-Page Tech Resume, Staff Architect CV"
            className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "preset-name-error" : undefined}
          />
          {errors.name && (
            <p
              id="preset-name-error"
              role="alert"
              className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
            >
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{errors.name}</span>
            </p>
          )}
        </div>

        {/* Description input */}
        <div>
          <label
            htmlFor="preset-description"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Description
          </label>
          <input
            id="preset-description"
            type="text"
            value={description}
            disabled={isBuiltIn}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief purpose or context for this tailoring strategy"
            className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400"
          />
        </div>

        {/* Template Set selection */}
        <div>
          <label
            htmlFor="preset-template"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Template Set <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Visual Go template layout suggested when this tailoring strategy is selected.
          </p>
          <select
            id="preset-template"
            value={templateSetId}
            disabled={isBuiltIn}
            onChange={(e) => {
              setTemplateSetId(e.target.value);
              clearFieldError("templateSetId");
            }}
            className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400"
            aria-invalid={Boolean(errors.templateSetId)}
            aria-describedby={
              errors.templateSetId ? "preset-template-error" : undefined
            }
          >
            <option value="">Select a template set...</option>
            {templateSets.map((tmpl) => (
              <option key={tmpl.id} value={tmpl.id}>
                {tmpl.name} {tmpl.is_built_in ? "(Built-in)" : ""}
              </option>
            ))}
          </select>
          {errors.templateSetId && (
            <p
              id="preset-template-error"
              role="alert"
              className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
            >
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{errors.templateSetId}</span>
            </p>
          )}
        </div>

        {/* Target Language selection */}
        <div>
          <label
            htmlFor="preset-language"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Language
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Language for contextual translation of tailored resume content (summary, accomplishments, projects). Defaults to English.
          </p>
          <select
            id="preset-language"
            value={language}
            disabled={isBuiltIn}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang} {lang === "English" ? "(Default)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Constraints builder interactive helper */}
      <ConstraintControls
        disabled={isBuiltIn}
        onApplyInstructions={handleApplyConstraints}
      />

      {/* System Instructions Prompt */}
      <div className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div>
          <label
            htmlFor="preset-instructions"
            className="block text-sm font-medium text-slate-900 dark:text-slate-100"
          >
            System Instructions (LLM Prompt){" "}
            <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Guidance and rules supplied to the LLM when tailoring resumes using
            this preset.
          </p>
        </div>

        <textarea
          id="preset-instructions"
          rows={5}
          value={systemInstructions}
          disabled={isBuiltIn}
          onChange={(e) => {
            setSystemInstructions(e.target.value);
            clearFieldError("systemInstructions");
          }}
          placeholder="e.g. Focus strictly on high-impact accomplishments, quantitative metrics, and concise technical summaries."
          className="block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-mono shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400"
          aria-invalid={Boolean(errors.systemInstructions)}
          aria-describedby={
            errors.systemInstructions ? "preset-instructions-error" : undefined
          }
        />
        {errors.systemInstructions && (
          <p
            id="preset-instructions-error"
            role="alert"
            className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
          >
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{errors.systemInstructions}</span>
          </p>
        )}
      </div>

      {/* Form Submission Actions */}
      {!isBuiltIn && (
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="gap-2 focus-visible:ring-indigo-500"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>{isSubmitting ? "Saving..." : "Save Tailoring Strategy"}</span>
          </Button>
        </div>
      )}
    </form>
  );
};
