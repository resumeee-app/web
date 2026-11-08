import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { api } from "./client";
import type { components } from "./schema";

/**
 * Resume branch domain entity, extending the OpenAPI schema with client-side convenience flags.
 */
export type Branch = components["schemas"]["Branch"] & {
  is_default?: boolean;
  status?: string;
  tailoring_strategy_id?: string | null;
  custom_directives?: string;
};

/**
 * TargetResume is an alias for Branch under RFC-005 domain terminology.
 */
export type TargetResume = Branch;

/**
 * System or user-defined preset containing default instructions and template binding.
 */
export type Preset = components["schemas"]["Preset"] & {
  suggested_theme_id?: string | null;
};

/**
 * TailoringStrategy is an alias for Preset under RFC-005 domain terminology.
 */
export type TailoringStrategy = Preset;

/**
 * Visual presentation template set containing HTML, Markdown, and plaintext formatting templates.
 */
export type TemplateSet = components["schemas"]["TemplateSet"];

/**
 * Input payload for creating a new tailored resume branch / target resume.
 */
export type CreateBranchInput = {
  name: string;
  target_role?: string;
  target_company?: string;
  target_requirements?: string;
  branch_instructions?: string;
  custom_directives?: string;
  preset_id?: string;
  tailoring_strategy_id?: string;
  template_set_id: string;
  provider_override?: string;
  model_override?: string;
  reasoning_level?: components["schemas"]["CreateBranchRequest"]["reasoning_level"];
  pinned_entity_ids?: string[];
  excluded_entity_ids?: string[];
};

/**
 * Lifecycle status indicator for a resume branch.
 * - `active`: Branch is ready, tailored, or default un-tailored.
 * - `tailoring`: Asynchronous LLM tailoring job is in progress.
 * - `error`: Tailoring or synchronization failed.
 * - `stale`: Branch is out of sync with the latest main profile revision.
 * - `needs_sync`: Alias for stale status.
 */
export type BranchStatus = "active" | "tailoring" | "error" | "stale" | "needs_sync";

/**
 * Extracts a human-readable error message from an API response or unknown error object,
 * falling back to the specified default string.
 *
 * @param {unknown} error The error payload returned by OpenAPI client or caught during fetch.
 * @param {string} fallback Default error message when no specific message is extracted.
 * @returns {string} The resolved error message.
 */
export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
}

/**
 * Deterministically checks whether a branch is the protected Default Branch.
 * Evaluates the runtime `is_default` flag and falls back to deterministic identifier conventions.
 */
export function isDefaultBranch(branch: Branch): boolean {
  if (branch.is_default === true) {
    return true;
  }
  if (branch.id && branch.id.startsWith("branch-default-")) {
    return true;
  }
  if (branch.name && branch.name === "Main Profile (Default)") {
    return true;
  }
  return false;
}

/**
 * Resolves the visual and operational status indicator for a branch.
 * Decouples is_stale from active tailoring to prevent false active job indicators.
 */
export function getBranchStatus(branch: Branch): BranchStatus {
  if (branch.status) {
    const s = branch.status.toLowerCase();
    if (s === "tailoring" || s === "processing" || s === "pending") {
      return "tailoring";
    }
    if (s === "error" || s === "failed") {
      return "error";
    }
    if (s === "stale" || s === "needs_sync" || s === "out_of_sync") {
      return "stale";
    }
    if (s === "active" || s === "completed" || s === "completed_with_warnings") {
      if (branch.is_stale) {
        return "stale";
      }
      return "active";
    }
  }
  if (branch.is_stale) {
    return "stale";
  }
  return "active";
}

/**
 * Formats the active version state for branch display:
 * - Default branch displays "Untailored" (mirrors main profile without LLM tailoring).
 * - Custom tailored branch with active version displays "v<N> (Active)".
 * - Custom branch without an active version displays "Not tailored yet".
 */
export function formatBranchVersionStatus(branch: Branch): string {
  if (isDefaultBranch(branch)) {
    return "Untailored";
  }
  if (!branch.active_version_id || branch.active_version_id.trim().length === 0) {
    return "Not tailored yet";
  }
  const cleanId = branch.active_version_id.trim();
  const version = cleanId.startsWith("v") || cleanId.startsWith("V")
    ? cleanId
    : `v${cleanId}`;
  return `${version} (Active)`;
}

/**
 * Query key factory for resume branches cache entries.
 */
export const branchKeys = {
  all: ["branches"] as const,
  lists: () => [...branchKeys.all, "list"] as const,
  list: (filters: { stale?: boolean }) =>
    [...branchKeys.lists(), filters] as const,
  details: () => [...branchKeys.all, "detail"] as const,
  detail: (id: string) => [...branchKeys.details(), id] as const,
};

/**
 * Query key factory for presets cache entries.
 */
export const presetKeys = {
  all: ["presets"] as const,
  list: () => [...presetKeys.all, "list"] as const,
};

/**
 * Query key factory for template sets cache entries.
 */
export const templateKeys = {
  all: ["templates"] as const,
  list: () => [...templateKeys.all, "list"] as const,
};

/**
 * Queries all resume branches for the current user.
 */
export function useBranchesQuery(
  staleOnly?: boolean
): UseQueryResult<Branch[], Error> {
  return useQuery({
    queryKey: branchKeys.list({ stale: staleOnly }),
    queryFn: async () => {
      const { data, error } = await api.GET("/branches", {
        params: { query: { stale: staleOnly } },
      });
      if (error) {
        throw new Error(
          extractApiErrorMessage(error, "Failed to fetch branches")
        );
      }
      return (data as Branch[]) || [];
    },
  });
}

/**
 * Queries available presets for branch creation.
 */
export function usePresetsQuery(): UseQueryResult<Preset[], Error> {
  return useQuery({
    queryKey: presetKeys.list(),
    queryFn: async () => {
      const { data, error } = await api.GET("/presets");
      if (error) {
        throw new Error(
          extractApiErrorMessage(error, "Failed to fetch presets")
        );
      }
      return data || [];
    },
  });
}

/**
 * Queries available template sets for branch creation.
 */
export function useTemplatesQuery(): UseQueryResult<TemplateSet[], Error> {
  return useQuery({
    queryKey: templateKeys.list(),
    queryFn: async () => {
      const { data, error } = await api.GET("/templates");
      if (error) {
        throw new Error(
          extractApiErrorMessage(error, "Failed to fetch template sets")
        );
      }
      return data || [];
    },
  });
}

/**
 * Mutation hook for creating a new resume branch with optimistic cache updates.
 */
export function useCreateBranchMutation(): UseMutationResult<
  Branch,
  Error,
  CreateBranchInput,
  { previousBranches?: Branch[] }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBranchInput) => {
      const payload = {
        ...input,
        preset_id: input.preset_id || input.tailoring_strategy_id,
        tailoring_strategy_id: input.tailoring_strategy_id || input.preset_id,
        branch_instructions: input.branch_instructions || input.custom_directives,
        custom_directives: input.custom_directives || input.branch_instructions,
      };
      const { data, error } = await api.POST("/branches", {
        body: payload,
      });
      if (error) {
        throw new Error(
          extractApiErrorMessage(error, "Failed to create branch")
        );
      }
      return data as Branch;
    },
    onMutate: async (newBranchInput: CreateBranchInput) => {
      const queryKey = branchKeys.list({ stale: undefined });
      await queryClient.cancelQueries({ queryKey });

      const previousBranches = queryClient.getQueryData<Branch[]>(queryKey);

      const optimisticBranch: Branch = {
        id: `optimistic-${Date.now()}`,
        user_id: "current-user",
        name: newBranchInput.name,
        target_role: newBranchInput.target_role,
        target_company: newBranchInput.target_company,
        target_requirements: newBranchInput.target_requirements,
        branch_instructions:
          newBranchInput.custom_directives || newBranchInput.branch_instructions,
        custom_directives:
          newBranchInput.custom_directives || newBranchInput.branch_instructions,
        preset_id:
          newBranchInput.tailoring_strategy_id || newBranchInput.preset_id,
        tailoring_strategy_id:
          newBranchInput.tailoring_strategy_id || newBranchInput.preset_id,
        template_set_id: newBranchInput.template_set_id,
        is_default: false,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (previousBranches) {
        queryClient.setQueryData<Branch[]>(queryKey, [
          ...previousBranches,
          optimisticBranch,
        ]);
      }

      return { previousBranches };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousBranches) {
        queryClient.setQueryData(
          branchKeys.list({ stale: undefined }),
          context.previousBranches
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: branchKeys.lists() });
    },
  });
}

/**
 * Mutation hook for deleting a non-default resume branch.
 * Enforces client-side guard against default branch deletion before network request.
 */
export function useDeleteBranchMutation(): UseMutationResult<
  void,
  Error,
  Branch,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (branch: Branch) => {
      if (isDefaultBranch(branch)) {
        throw new Error("Cannot delete default branch");
      }
      const { error } = await api.DELETE("/branches/{id}", {
        params: { path: { id: branch.id } },
      });
      if (error) {
        throw new Error(
          extractApiErrorMessage(error, "Failed to delete branch")
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchKeys.lists() });
    },
  });
}
