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
import { TemplateMetadataCard } from "./template-metadata-card";
import { cn } from "@/lib/utils";

export { TemplateMetadataCard, type TemplateMetadataCardProps } from "./template-metadata-card";

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
 * Used as a composite form component binding full-width metadata and multi-tab template editors.
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
    <div className={cn("space-y-4 w-full", className)}>
      <TemplateMetadataCard
        name={data.name}
        description={data.description}
        onChange={onChange}
        readOnly={readOnly}
      />

      <div className="pt-2">
        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
          Template Definition
        </span>
        <TemplateCodeEditor
          htmlTemplate={data.htmlTemplate}
          cssStyles={data.cssStyles}
          markdownTemplate={data.markdownTemplate}
          textTemplate={data.textTemplate}
          onChange={onChange}
          readOnly={readOnly}
          serverError={serverError}
        />
      </div>
    </div>
  );
};
