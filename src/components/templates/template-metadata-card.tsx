/**
 * @file template-metadata-card.tsx
 * @description Dedicated, full-width container component for template metadata (Name, Description).
 * Spans 100% width of the parent container above the code editor and preview split view.
 *
 * Architectural Role:
 * Separates template identity and summary metadata from format-specific template definitions,
 * maximizing horizontal space on desktop via a 2-column responsive layout while leaving
 * the split view below dedicated entirely to code editing and live sandboxed preview.
 *
 * Accessibility & WAI-ARIA Considerations:
 * - Semantic `<section>` landmark with accessible name via `aria-labelledby`.
 * - Explicit label associations matching `htmlFor` and input `id` attributes.
 * - Required indicator (`*`) with HTML5 `required` attribute on Template Name.
 * - Disabled states and styling cues when displaying immutable built-in templates.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Standard styling for text input controls inside the metadata card.
 */
export const METADATA_INPUT_CLASS =
  "mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:opacity-75 transition-colors";

/**
 * Props for the TemplateMetadataCard component.
 */
export interface TemplateMetadataCardProps {
  /** Display title for the template set. */
  name: string;
  /** Summary of template typography, layout style, or recommended industry. */
  description: string;
  /** Callback fired whenever the name or description changes. */
  onChange: (updates: { name?: string; description?: string }) => void;
  /** Whether form controls are locked into read-only mode for built-in templates. */
  readOnly?: boolean;
  /** Optional custom CSS classes for container overrides. */
  className?: string;
}

/**
 * Full-width metadata container component for template name and description.
 *
 * @param props - Component props satisfying {@link TemplateMetadataCardProps}.
 * @returns JSX element representing the 100% width template metadata card.
 */
export const TemplateMetadataCard: React.FC<TemplateMetadataCardProps> = ({
  name,
  description,
  onChange,
  readOnly = false,
  className,
}) => {
  return (
    <section
      aria-labelledby="template-metadata-heading"
      data-testid="template-metadata-card"
      className={cn(
        "w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm",
        className
      )}
    >
      <h2 id="template-metadata-heading" className="sr-only">
        Template Metadata
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {/* Template Name Field */}
        <div>
          <label
            htmlFor="template-name"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Template Name <span className="text-red-500">*</span>
          </label>
          <input
            id="template-name"
            type="text"
            required
            disabled={readOnly}
            value={name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Executive Modern Tech Resume"
            className={METADATA_INPUT_CLASS}
          />
        </div>

        {/* Template Description Field */}
        <div>
          <label
            htmlFor="template-description"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Description
          </label>
          <input
            id="template-description"
            type="text"
            disabled={readOnly}
            value={description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Brief summary of layout, font hierarchy, or targeted industry"
            className={METADATA_INPUT_CLASS}
          />
        </div>
      </div>
    </section>
  );
};
