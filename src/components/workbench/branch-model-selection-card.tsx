import * as React from "react";
import {
  Cpu,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "./badge";
import { isUserAdmin } from "@/api/client";
import {
  useAvailableModelsQuery,
  type ModelOption,
} from "@/api/preset-queries";
import type { Branch } from "@/api/workbench-queries";

/**
 * Props for the BranchModelSelectionCard component.
 */
export interface BranchModelSelectionCardProps {
  /** The resume branch entity providing baseline LLM configuration and identifiers. */
  branch: Branch;
  /** Whether the card starts expanded by default. Defaults to false. */
  defaultExpanded?: boolean;
  /** Optional explicit override for admin status; defaults to isUserAdmin(). */
  isAdmin?: boolean;
  /** Flag indicating whether the save mutation is currently in flight. */
  isUpdating?: boolean;
  /** Callback invoked when the user saves updated LLM model and reasoning settings. */
  onUpdate: (data: {
    provider_override?: string;
    model_override?: string;
    reasoning_level?: Branch["reasoning_level"];
  }) => Promise<void> | void;
}

/**
 * Formats a raw provider key into a user-friendly display name.
 *
 * @param provider - Raw provider identifier string (e.g. "gemini", "anthropic").
 * @returns Human-readable formatted provider label.
 */
function formatProviderName(provider: string): string {
  switch (provider.toLowerCase()) {
    case "gemini":
      return "Google Gemini";
    case "openai":
      return "OpenAI";
    case "anthropic":
      return "Anthropic";
    case "compat":
    case "openai-compat":
      return "OpenAI Compatible";
    default:
      return provider.charAt(0).toUpperCase() + provider.slice(1);
  }
}

/**
 * BranchModelSelectionCard provides an accessible, expandable configuration panel
 * under the LLM Prompt Preview in Branch Tailoring for configuring AI provider,
 * model override, and reasoning effort constraints.
 *
 * Strictly restricted to administrators: returns null if the user lacks admin privileges.
 *
 * Accessibility / WAI-ARIA Considerations:
 * - Semantic `<section>` landmark with programmatic `aria-labelledby`.
 * - Disclosure button utilizes `aria-expanded` and `aria-controls`.
 * - All form select controls have explicit `<label htmlFor="...">` bindings.
 * - Submit button provides `aria-busy` when save mutation is in flight.
 */
export const BranchModelSelectionCard: React.FC<BranchModelSelectionCardProps> = ({
  branch,
  defaultExpanded = false,
  isAdmin: propIsAdmin,
  isUpdating = false,
  onUpdate,
}) => {
  const isAdmin = propIsAdmin ?? isUserAdmin();

  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const [providerOverride, setProviderOverride] = React.useState(
    branch.provider_override || ""
  );
  const [modelOverride, setModelOverride] = React.useState(
    branch.model_override || ""
  );
  const [reasoningLevel, setReasoningLevel] = React.useState(
    branch.reasoning_level || ""
  );

  const panelId = React.useId();
  const headingId = React.useId();

  // Synchronize internal state whenever upstream branch prop changes
  React.useEffect(() => {
    setProviderOverride(branch.provider_override || "");
    setModelOverride(branch.model_override || "");
    setReasoningLevel(branch.reasoning_level || "");
  }, [branch.provider_override, branch.model_override, branch.reasoning_level]);

  // Query catalog of registered available LLM models
  const { data: availableModels = [] } = useAvailableModelsQuery();

  /**
   * Distinct available providers dynamically extracted from available models.
   */
  const distinctProviders = React.useMemo(() => {
    if (availableModels.length > 0) {
      const providers = Array.from(
        new Set(availableModels.map((m: ModelOption) => m.provider))
      );
      if (providerOverride && !providers.includes(providerOverride)) {
        providers.push(providerOverride);
      }
      return providers;
    }
    return ["gemini", "openai", "anthropic"];
  }, [availableModels, providerOverride]);

  /**
   * Available models dynamically filtered by the currently chosen provider override.
   */
  const filteredModels = React.useMemo(() => {
    if (!availableModels || availableModels.length === 0) {
      return [];
    }
    if (!providerOverride) {
      return availableModels;
    }
    return availableModels.filter(
      (m: ModelOption) => m.provider === providerOverride
    );
  }, [availableModels, providerOverride]);

  /**
   * Handles provider selection change, resetting model if the current model
   * does not belong to the newly chosen provider.
   */
  const handleProviderChange = (newProvider: string) => {
    setProviderOverride(newProvider);
    if (!newProvider) {
      setModelOverride("");
    } else if (modelOverride) {
      const modelValid = availableModels.some(
        (m: ModelOption) => m.provider === newProvider && m.model === modelOverride
      );
      if (!modelValid) {
        setModelOverride("");
      }
    }
  };

  /**
   * Handles model selection change, automatically inferring provider if not selected.
   */
  const handleModelChange = (newModel: string) => {
    setModelOverride(newModel);
    if (newModel && !providerOverride) {
      const match = availableModels.find((m: ModelOption) => m.model === newModel);
      if (match?.provider) {
        setProviderOverride(match.provider);
      }
    }
  };

  /**
   * Resets local draft configuration to baseline branch values.
   */
  const handleReset = () => {
    setProviderOverride(branch.provider_override || "");
    setModelOverride(branch.model_override || "");
    setReasoningLevel(branch.reasoning_level || "");
  };

  /**
   * Handles form submission to persist LLM configuration.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate({
      provider_override: providerOverride.trim(),
      model_override: modelOverride.trim(),
      reasoning_level: (reasoningLevel.trim() || undefined) as Branch["reasoning_level"],
    });
  };

  // Only available for Admins
  if (!isAdmin) {
    return null;
  }

  const hasChanges =
    providerOverride !== (branch.provider_override || "") ||
    modelOverride !== (branch.model_override || "") ||
    reasoningLevel !== (branch.reasoning_level || "");

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Cpu
            className="h-5 w-5 text-indigo-600 dark:text-indigo-400"
            aria-hidden="true"
          />
          <div>
            <h2
              id={headingId}
              className="text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              LLM Model & Reasoning
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              Configure AI provider, model override, and reasoning depth for tailoring this branch.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Active configuration badges */}
          {branch.provider_override && (
            <Badge variant="outline" className="text-xs">
              {formatProviderName(branch.provider_override)}
            </Badge>
          )}
          {branch.model_override && (
            <Badge variant="outline" className="text-xs font-mono">
              {branch.model_override}
            </Badge>
          )}
          {branch.reasoning_level && (
            <Badge variant="secondary" className="text-xs">
              Reasoning: {branch.reasoning_level}
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-controls={panelId}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            <span>
              {isExpanded ? "Hide Model Settings" : "Configure Model & Reasoning"}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <form
          id={panelId}
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Provider Override */}
            <div>
              <label
                htmlFor="branch-provider"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Provider Override
              </label>
              <select
                id="branch-provider"
                value={providerOverride}
                disabled={isUpdating}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400"
              >
                <option value="">-- System Default (Inherit) --</option>
                {distinctProviders.map((provider) => (
                  <option key={provider} value={provider}>
                    {formatProviderName(provider)}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Override */}
            <div>
              <label
                htmlFor="branch-model"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Model Override
              </label>
              <select
                id="branch-model"
                value={modelOverride}
                disabled={isUpdating}
                onChange={(e) => handleModelChange(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400"
              >
                <option value="">-- Inherit Default Model --</option>
                {filteredModels.map((m: ModelOption) => (
                  <option key={`${m.provider}:${m.model}`} value={m.model}>
                    {m.display_name} {m.is_default ? "(Default)" : ""}
                  </option>
                ))}
                {modelOverride &&
                  !filteredModels.some((m: ModelOption) => m.model === modelOverride) && (
                    <option value={modelOverride}>
                      {modelOverride} (Custom / Current)
                    </option>
                  )}
              </select>
            </div>

            {/* Reasoning Level */}
            <div>
              <label
                htmlFor="branch-reasoning-level"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Reasoning Level
              </label>
              <select
                id="branch-reasoning-level"
                value={reasoningLevel}
                disabled={isUpdating}
                onChange={(e) => setReasoningLevel(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400"
              >
                <option value="">-- System Default (Inherit) --</option>
                <option value="none">None (Standard fast)</option>
                <option value="low">Low (Basic verification)</option>
                <option value="medium">Medium (Balanced reasoning)</option>
                <option value="high">High (Deep analytical reasoning)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUpdating || !hasChanges}
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset</span>
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isUpdating}
              aria-busy={isUpdating}
              className="flex items-center gap-1.5 text-xs font-medium"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Save Model Settings</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
};
