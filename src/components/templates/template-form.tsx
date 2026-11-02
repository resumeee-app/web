/**
 * @file template-form.tsx
 * @description Composite form component for defining template set metadata (Name, Description)
 * alongside multi-format template definitions (HTML, CSS, Markdown, Plain Text).
 *
 * Accessibility & WAI-ARIA Considerations:
 * - Form input fields are explicitly associated with descriptive labels via matching `id` and `htmlFor`.
 * - Required form controls feature visible `*` indicators and the `required` HTML attribute.
 * - Read-only states apply `disabled` attributes and styling cues when displaying immutable templates.
 */

import * as React from "react";
import { TemplateCodeEditor } from "./template-code-editor";
import { cn } from "@/lib/utils";

/**
 * Data structure representing all editable fields in a template set form.
 */
export interface TemplateFormData {
  /** Display title for the template set. */
  name: string;
  /** Summary of template typography, layout style, or recommended industry. */
  description: string;
  /** Go HTML template source code. */
  htmlTemplate: string;
  /** CSS stylesheet rules injected into HTML template previews. */
  cssStyles: string;
  /** Go Markdown template source code. */
  markdownTemplate: string;
  /** Go Plain Text template source code for ATS systems. */
  textTemplate: string;
}

/**
 * Props for the TemplateForm component.
 */
export interface TemplateFormProps {
  /** Form data model representing current field values. */
  data: TemplateFormData;
  /** Callback fired whenever any form field or template format changes. */
  onChange: (data: Partial<TemplateFormData>) => void;
  /** Whether the form inputs are disabled for read-only built-in templates. */
  readOnly?: boolean;
  /** Server-side syntax or validation error diagnostics returned from the API. */
  serverError?: { message?: string; details?: string } | null;
  /** Optional custom CSS classes for the container. */
  className?: string;
}

/**
 * Composite form component binding template metadata inputs to the tabbed code editor.
 *
 * Architectural Role:
 * Used as the primary input surface in TemplateEditorPage for building and editing templates.
 *
 * @param props - Component props satisfying TemplateFormProps.
 * @returns JSX element representing the template form.
 */
export const TemplateForm: React.FC<TemplateFormProps> = ({
  data,
  onChange,
  readOnly = false,
  serverError,
  className,
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <label
          htmlFor="template-name"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
        >
          Template Name <span className="text-red-500">*</span>
        </label>
        <input
          id="template-name"
          type="text"
          required
          disabled={readOnly}
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Executive Modern Tech Resume"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:opacity-75"
        />
      </div>

      <div>
        <label
          htmlFor="template-description"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
        >
          Description
        </label>
        <input
          id="template-description"
          type="text"
          disabled={readOnly}
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Brief summary of layout, font hierarchy, or targeted industry"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:opacity-75"
        />
      </div>

      <div className="pt-2">
        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
          Template Definition
        </span>
        <TemplateCodeEditor
          htmlTemplate={data.htmlTemplate}
          cssStyles={data.cssStyles}
          markdownTemplate={data.markdownTemplate}
          textTemplate={data.textTemplate}
          onChange={({ htmlTemplate, cssStyles, markdownTemplate, textTemplate }) => {
            const updates: Partial<TemplateFormData> = {};
            if (htmlTemplate !== undefined) updates.htmlTemplate = htmlTemplate;
            if (cssStyles !== undefined) updates.cssStyles = cssStyles;
            if (markdownTemplate !== undefined) updates.markdownTemplate = markdownTemplate;
            if (textTemplate !== undefined) updates.textTemplate = textTemplate;
            onChange(updates);
          }}
          readOnly={readOnly}
          serverError={serverError}
        />
      </div>
    </div>
  );
};
