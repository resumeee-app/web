/**
 * @file template-card.tsx
 * @description Card component for displaying a single TemplateSet in the templates catalog.
 * Displays template name, description, supported formats, ownership badges, and action triggers.
 *
 * Immutability & Safety Invariant:
 * Deletion is strictly prohibited for built-in system templates. The delete action is hidden
 * and omitted from the DOM when `isBuiltInTemplate(template)` evaluates to true.
 *
 * Accessibility & WAI-ARIA Considerations:
 * - Rendered as an `<article>` semantic landmark with an accessible heading.
 * - All interactive action buttons include descriptive, contextual `aria-label` tags
 *   (e.g., `aria-label="Delete Standard Clean"`).
 * - Interactive elements maintain prominent `:focus-visible` outline rings for keyboard navigation.
 */

import * as React from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Copy,
  Edit2,
  Trash2,
  Eye,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isBuiltInTemplate,
  type TemplateSet,
} from "@/api/template-queries";
import { cn } from "@/lib/utils";

/**
 * Props for the TemplateCard component.
 */
export interface TemplateCardProps {
  /** The TemplateSet entity to display. */
  template: TemplateSet;
  /** Callback fired when the user clicks the quick preview button. */
  onPreview: (template: TemplateSet) => void;
  /** Callback fired when the user initiates deletion of a custom template. */
  onDelete: (template: TemplateSet) => void;
  /** Callback fired when the user duplicates a template as a new custom template. */
  onDuplicate: (template: TemplateSet) => void;
  /** Optional additional CSS class names for outer article container. */
  className?: string;
}

/**
 * Renders an accessible card for a single TemplateSet.
 *
 * Architectural Role:
 * Used within the template catalog grid to present template metadata, status badges,
 * and provide entry points for viewing, editing, duplicating, or deleting templates.
 *
 * @param props - Component props satisfying TemplateCardProps.
 * @returns JSX element representing the template card.
 */
export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onPreview,
  onDelete,
  onDuplicate,
  className,
}) => {
  const isBuiltIn = isBuiltInTemplate(template);

  return (
    <article
      data-testid={`template-card-${template.id}`}
      className={cn(
        "flex flex-col justify-between rounded-xl border bg-white dark:bg-slate-900 p-5 shadow-sm transition-all hover:shadow-md",
        isBuiltIn ? "border-slate-200 dark:border-slate-800" : "border-indigo-100 dark:border-indigo-950",
        className
      )}
    >
      <div>
        {/* Top Badges & Author row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-1.5">
            {isBuiltIn ? (
              <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300 ring-1 ring-inset ring-amber-600/20">
                <ShieldCheck className="h-3 w-3 mr-1" aria-hidden="true" />
                Built-in
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-600/20">
                <User className="h-3 w-3 mr-1" aria-hidden="true" />
                Custom
              </span>
            )}
          </div>

          {/* Target Formats */}
          <div className="flex items-center space-x-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {template.html_template && (
              <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">HTML</span>
            )}
            {template.markdown_template && (
              <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">MD</span>
            )}
            {template.text_template && (
              <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">TXT</span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
          {template.name}
        </h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
          {template.description || "No description provided."}
        </p>
      </div>

      {/* Action Row */}
      <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1">
          {/* Quick Preview */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPreview(template)}
            aria-label={`Preview ${template.name}`}
            className="h-8 text-xs text-slate-700 dark:text-slate-200"
          >
            <Eye className="h-3.5 w-3.5 mr-1 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            Preview
          </Button>

          {/* Duplicate as Custom */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDuplicate(template)}
            aria-label={`Duplicate ${template.name} as Custom`}
            className="h-8 text-xs text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <Copy className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Duplicate
          </Button>
        </div>

        <div className="flex items-center space-x-1">
          {/* Edit Button: Custom only */}
          {!isBuiltIn ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 text-xs text-slate-700 dark:text-slate-200"
            >
              <Link
                to={`/templates/${template.id}`}
                aria-label={`Edit ${template.name}`}
              >
                <Edit2 className="h-3.5 w-3.5 mr-1 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                Edit
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-slate-500 dark:text-slate-400"
            >
              <Link
                to={`/templates/${template.id}`}
                aria-label={`View ${template.name} source`}
              >
                <FileText className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                View
              </Link>
            </Button>
          )}

          {/* Delete Button: Strictly custom only; hidden and disabled for built-ins */}
          {!isBuiltIn && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => onDelete(template)}
              aria-label={`Delete ${template.name}`}
              className="h-8 px-2 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Delete {template.name}</span>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
};
