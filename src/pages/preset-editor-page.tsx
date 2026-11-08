import React from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ArrowLeft, Sliders, AlertCircle, Loader2 } from "lucide-react";
import { PresetForm } from "@/components/presets/preset-form";
import {
  usePresetQuery,
  useTemplateSetsQuery,
  useCreatePresetMutation,
  useUpdatePresetMutation,
  type CreatePresetRequest,
  type Preset,
} from "@/api/preset-queries";

/**
 * PresetEditorPage handles creating new custom presets (/presets/new),
 * updating existing custom presets (/presets/:id), and viewing built-in
 * system presets in read-only mode with a duplication action.
 */
export const PresetEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const cloneFromId = searchParams.get("clone_from");

  const isCreateMode = !id || id === "new";

  // Fetch target preset when in edit or view mode
  const {
    data: preset,
    isLoading: isPresetLoading,
    isError: isPresetError,
    error: presetError,
  } = usePresetQuery(id, {
    enabled: !isCreateMode && Boolean(id),
  });

  // Fetch cloned preset if ?clone_from is provided
  const {
    data: clonedPreset,
    isLoading: isClonedLoading,
  } = usePresetQuery(cloneFromId || undefined, {
    enabled: isCreateMode && Boolean(cloneFromId),
  });

  const {
    data: templateSets = [],
    isLoading: isTemplatesLoading,
  } = useTemplateSetsQuery();

  const createPresetMutation = useCreatePresetMutation();
  const updatePresetMutation = useUpdatePresetMutation();
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const isBuiltIn =
    !isCreateMode &&
    Boolean(preset?.is_built_in || id?.startsWith("builtin-"));

  const isPageLoading =
    isTemplatesLoading ||
    (!isCreateMode && isPresetLoading) ||
    (isCreateMode && Boolean(cloneFromId) && isClonedLoading);

  const handleSubmit = async (values: CreatePresetRequest) => {
    setSaveError(null);
    try {
      if (isCreateMode) {
        await createPresetMutation.mutateAsync(values);
      } else if (id && !isBuiltIn) {
        await updatePresetMutation.mutateAsync({
          id,
          data: values,
        });
      }
      navigate("/presets");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to save preset. Please check the form and try again.";
      setSaveError(message);
    }
  };

  const handleDuplicate = (sourcePreset: Preset) => {
    navigate(`/presets/new?clone_from=${encodeURIComponent(sourcePreset.id)}`);
  };

  // Derive initial values
  const initialValues: Partial<Preset> | undefined = React.useMemo(() => {
    if (isCreateMode && clonedPreset) {
      return {
        name: `Copy of ${clonedPreset.name}`,
        description: clonedPreset.description,
        template_set_id: clonedPreset.template_set_id,
        system_instructions: clonedPreset.system_instructions,
        language: clonedPreset.language,
        is_built_in: false,
      };
    }
    if (!isCreateMode && preset) {
      return preset;
    }
    return undefined;
  }, [isCreateMode, clonedPreset, preset]);

  // Page title and subtitle
  let pageTitle = "Create Tailoring Strategy";
  let pageSubtitle = "Define AI prompt directives, density constraints, and formatting rules.";

  if (isCreateMode && cloneFromId) {
    pageTitle = "Duplicate Tailoring Strategy";
    pageSubtitle = "Create a customized copy of an existing tailoring strategy.";
  } else if (!isCreateMode && preset) {
    if (isBuiltIn) {
      pageTitle = `${preset.name} (System Strategy)`;
      pageSubtitle =
        "Built-in system strategy. Read-only mode with duplicate option.";
    } else {
      pageTitle = `Edit: ${preset.name}`;
      pageSubtitle = "Update AI prompt directives and tailoring configurations.";
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Back navigation and header */}
      <div>
        <Link
          to="/presets"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1 -ml-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to Tailoring Strategies</span>
        </Link>

        <div className="mt-3 flex items-center space-x-2">
          <Sliders className="h-6 w-6 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {pageTitle}
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{pageSubtitle}</p>
      </div>

      {/* Loading state */}
      {isPageLoading && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center justify-center py-16 space-y-3"
        >
          <Loader2
            className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400"
            aria-hidden="true"
          />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading tailoring strategy details...</p>
        </div>
      )}

      {/* Error state */}
      {!isCreateMode && isPresetError && (
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
              Failed to load tailoring strategy
            </h3>
            <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
              {presetError?.message || "The requested tailoring strategy could not be found."}
            </p>
          </div>
        </div>
      )}

      {/* Save mutation error state */}
      {saveError && (
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
              Failed to save tailoring strategy
            </h3>
            <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{saveError}</p>
          </div>
        </div>
      )}

      {/* Form content */}
      {!isPageLoading && (!isPresetError || isCreateMode) && (
        <PresetForm
          key={initialValues?.id || (cloneFromId ? "cloned" : "new")}
          initialValues={initialValues}
          templateSets={templateSets}
          onSubmit={handleSubmit}
          onDuplicate={handleDuplicate}
          isSubmitting={
            createPresetMutation.isPending || updatePresetMutation.isPending
          }
          isBuiltIn={isBuiltIn}
        />
      )}
    </div>
  );
};
