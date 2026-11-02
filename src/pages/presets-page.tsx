import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Sliders, AlertCircle, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PresetCard } from "@/components/presets/preset-card";
import {
  usePresetsQuery,
  useTemplateSetsQuery,
  useDeletePresetMutation,
  type Preset,
} from "@/api/preset-queries";

/**
 * PresetsPage component displays the gallery grid of system-provided built-in
 * presets and user-created custom presets.
 *
 * Provides actions to create new presets, inspect/view system presets, duplicate
 * existing presets, and delete custom presets with Radix AlertDialog confirmation.
 */
export const PresetsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    data: presets = [],
    isLoading: isPresetsLoading,
    isError: isPresetsError,
    error: presetsError,
  } = usePresetsQuery();

  const { data: templateSets = [] } = useTemplateSetsQuery();
  const deletePresetMutation = useDeletePresetMutation();
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const templateMap = useMemo(() => {
    return new Map<string, string>(
      templateSets.map((tmpl) => [tmpl.id, tmpl.name])
    );
  }, [templateSets]);

  const handleDuplicate = (preset: Preset) => {
    navigate(`/presets/new?clone_from=${encodeURIComponent(preset.id)}`);
  };

  const handleDelete = async (presetId: string) => {
    setDeleteError(null);
    try {
      await deletePresetMutation.mutateAsync(presetId);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : `Failed to delete preset ${presetId}. Please try again.`;
      setDeleteError(message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <Sliders className="h-6 w-6 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Presets & Tailoring Strategies
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Configure Tier-2 prompt instructions, target length constraints,
            formatting rules, and administrative fields for resume generation.
          </p>
        </div>

        <Link
          to="/presets/new"
          className={buttonVariants({
            variant: "default",
            size: "default",
            className: "gap-2 shrink-0 focus-visible:ring-indigo-500",
          })}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>New Preset</span>
        </Link>
      </div>

      {/* Loading state */}
      {isPresetsLoading && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center justify-center py-16 space-y-3"
        >
          <Loader2
            className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400"
            aria-hidden="true"
          />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading presets gallery...</p>
        </div>
      )}

      {/* Error state */}
      {isPresetsError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4 flex items-start gap-3"
        >
          <AlertCircle
            className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
              Failed to load presets
            </h3>
            <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
              {presetsError?.message || "An unexpected error occurred."}
            </p>
          </div>
        </div>
      )}

      {/* Delete error state */}
      {deleteError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4 flex items-start gap-3"
        >
          <AlertCircle
            className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
              Failed to delete preset
            </h3>
            <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{deleteError}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isPresetsLoading && !isPresetsError && presets.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-12 text-center">
          <Sliders
            className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500"
            aria-hidden="true"
          />
          <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
            No presets found
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            You do not have any tailoring strategy presets yet. Create a custom
            preset to guide LLM resume tailoring.
          </p>
          <div className="mt-6">
            <Link
              to="/presets/new"
              className={buttonVariants({
                variant: "default",
                size: "default",
                className: "gap-2 focus-visible:ring-indigo-500",
              })}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Create your first preset</span>
            </Link>
          </div>
        </div>
      )}

      {/* Presets Gallery Grid */}
      {!isPresetsLoading && !isPresetsError && presets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {presets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              templateName={templateMap.get(preset.template_set_id)}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
