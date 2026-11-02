import React from "react";
import { Link } from "react-router-dom";
import { Copy, Edit3, Trash2, Eye, Shield, Cpu, Layers } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import type { Preset } from "@/api/preset-queries";

/**
 * Props for the PresetCard component.
 */
export interface PresetCardProps {
  /** The Preset entity to render */
  preset: Preset;
  /** Human-readable template set name (e.g. 'Standard Clean') */
  templateName?: string;
  /** Callback triggered when clicking 'Duplicate to Custom' */
  onDuplicate: (preset: Preset) => void;
  /** Optional callback triggered when confirming deletion of a custom preset */
  onDelete?: (presetId: string) => void;
  /** Accessible heading level ('h2' by default to maintain valid document heading hierarchy) */
  headingLevel?: "h2" | "h3";
}

/**
 * PresetCard renders an individual preset in the Presets Gallery:
 * - Distinguishes system presets vs. custom presets via distinct badges
 * - Displays target instructions summary, template reference, and administrative fields badge
 * - Enforces immutability: system presets render 'View Details' without edit or delete controls
 * - Guards deletion of custom presets with a Radix UI AlertDialog confirmation
 * - Maintains WCAG 2.1 AA accessibility with keyboard navigation and explicit accessible names
 */
export const PresetCard: React.FC<PresetCardProps> = ({
  preset,
  templateName,
  onDuplicate,
  onDelete,
  headingLevel = "h2",
}) => {
  const isBuiltIn = Boolean(
    preset.is_built_in || preset.id.startsWith("builtin-")
  );
  const HeadingTag = headingLevel;

  return (
    <article className="flex flex-col justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-shadow hover:shadow-md">
      <div>
        {/* Header row: title and badges */}
        <div className="flex items-start justify-between gap-2">
          <HeadingTag className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug">
            {preset.name}
          </HeadingTag>
          <div className="flex flex-wrap gap-1 items-center shrink-0">
            {isBuiltIn ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-400/20">
                <Shield className="h-3 w-3" aria-hidden="true" />
                <span>System Preset</span>
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300 ring-1 ring-inset ring-purple-700/10 dark:ring-purple-400/20">
                Custom
              </span>
            )}
            {preset.include_admin_fields && (
              <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300 ring-1 ring-inset ring-amber-600/20 dark:ring-amber-400/20">
                Admin Fields
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
          {preset.description || "No description provided."}
        </p>

        {/* System instructions preview */}
        <div className="mt-3 rounded bg-slate-50 dark:bg-slate-800/60 p-2.5 text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">
            Instructions:
          </span>
          <p className="line-clamp-2 italic">
            "{preset.system_instructions}"
          </p>
        </div>

        {/* Metadata footer badges */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            <span>{templateName || preset.template_set_id}</span>
          </span>
          {preset.model_override && (
            <span className="inline-flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
              <span>{preset.model_override}</span>
            </span>
          )}
        </div>
      </div>

      {/* Card action controls */}
      <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between gap-2">
        {/* Primary view or edit navigation */}
        <div className="flex items-center gap-2">
          {isBuiltIn ? (
            <Link
              to={`/presets/${preset.id}`}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "gap-1.5 text-xs text-slate-700 dark:text-slate-300",
              })}
            >
              <Eye className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <span>View Details</span>
            </Link>
          ) : (
            <Link
              to={`/presets/${preset.id}`}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "gap-1.5 text-xs text-slate-700 dark:text-slate-300",
              })}
            >
              <Edit3 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <span>Edit</span>
            </Link>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDuplicate(preset)}
            className="gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            aria-label={`Duplicate ${preset.name} to Custom`}
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Duplicate to Custom</span>
          </Button>
        </div>

        {/* Delete button guarded by Radix AlertDialog for custom presets only */}
        {!isBuiltIn && onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300"
                aria-label={`Delete ${preset.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Delete</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Preset</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{preset.name}"? This action
                  cannot be undone and will permanently remove this custom
                  strategy preset.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(preset.id)}>
                  Confirm Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </article>
  );
};
