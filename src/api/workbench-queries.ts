import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, extractApiErrorMessage } from "./client";
import type { components } from "./schema";

/**
 * Branch represents a targeted resume variant for a specific role or company.
 */
export type Branch = components["schemas"]["Branch"];

/**
 * BranchVersion represents a specific immutable snapshot generated for a branch.
 */
export type BranchVersion = components["schemas"]["BranchVersion"];

/**
 * Preset represents a set of LLM prompts and targeting instructions.
 */
export type Preset = components["schemas"]["Preset"];

/**
 * TemplateSet represents an ATS HTML/text template layout.
 */
export type TemplateSet = components["schemas"]["TemplateSet"];

/**
 * SyncBranchesResponse represents the output from enqueuing a batch sync job.
 */
export type SyncBranchesResponse =
  components["schemas"]["SyncBranchesResponse"];

/**
 * UpdateBranchRequest payload for updating branch metadata or active version pointer.
 */
export type UpdateBranchRequest = components["schemas"]["UpdateBranchRequest"];

/**
 * TanStack Query key factory for branch workbench server state.
 */
export const workbenchKeys = {
  all: ["workbench"] as const,
  branch: (id: string) => [...workbenchKeys.all, "branch", id] as const,
  versions: (id: string) => [...workbenchKeys.all, "versions", id] as const,
  presets: () => [...workbenchKeys.all, "presets"] as const,
  templates: () => [...workbenchKeys.all, "templates"] as const,
};

/**
 * Retrieves branch details via GET /branches/{id}.
 *
 * @param branchId - Unique UUID identifier of the resume branch.
 * @returns Promise resolving to the Branch record.
 * @throws Error when the branch cannot be found or network request fails.
 */
export async function fetchBranch(branchId: string): Promise<Branch> {
  const { data, error } = await api.GET("/branches/{id}", {
    params: { path: { id: branchId } },
  });

  if (error || !data) {
    throw new Error(extractApiErrorMessage(error, "Failed to fetch branch"));
  }

  return data;
}

/**
 * Retrieves historical versions for a branch via GET /branches/{id}/versions.
 *
 * @param branchId - Unique UUID identifier of the resume branch.
 * @returns Promise resolving to the list of BranchVersion records.
 * @throws Error when versions cannot be retrieved.
 */
export async function fetchBranchVersions(
  branchId: string
): Promise<BranchVersion[]> {
  const { data, error } = await api.GET("/branches/{id}/versions", {
    params: { path: { id: branchId } },
  });

  if (error || !data) {
    throw new Error(
      extractApiErrorMessage(error, "Failed to fetch branch versions")
    );
  }

  return data;
}

/**
 * Retrieves preset catalog via GET /presets.
 *
 * @returns Promise resolving to the list of Presets.
 * @throws Error when presets cannot be retrieved.
 */
export async function fetchPresets(): Promise<Preset[]> {
  const { data, error } = await api.GET("/presets");

  if (error || !data) {
    throw new Error(extractApiErrorMessage(error, "Failed to fetch presets"));
  }

  return data;
}

/**
 * Retrieves template catalog via GET /templates.
 *
 * @returns Promise resolving to the list of TemplateSets.
 * @throws Error when templates cannot be retrieved.
 */
export async function fetchTemplates(): Promise<TemplateSet[]> {
  const { data, error } = await api.GET("/templates");

  if (error || !data) {
    throw new Error(extractApiErrorMessage(error, "Failed to fetch templates"));
  }

  return data;
}

/**
 * Updates branch settings or active version pointer via PUT /branches/{id}.
 *
 * @param branchId - Unique UUID identifier of the branch.
 * @param payload - Request payload containing fields to update.
 * @returns Promise resolving to the updated Branch entity.
 * @throws Error when the update fails.
 */
export async function updateBranch(
  branchId: string,
  payload: UpdateBranchRequest
): Promise<Branch> {
  const { data, error } = await api.PUT("/branches/{id}", {
    params: { path: { id: branchId } },
    body: payload,
  });

  if (error || !data) {
    throw new Error(extractApiErrorMessage(error, "Failed to update branch"));
  }

  return data;
}

/**
 * Promotes a specific version as the active version for the branch.
 *
 * @param branchId - Unique UUID identifier of the branch.
 * @param activeVersionId - UUID of the version to set as active.
 * @returns Promise resolving to the updated Branch entity.
 */
export async function updateBranchActiveVersion(
  branchId: string,
  activeVersionId: string
): Promise<Branch> {
  return updateBranch(branchId, { active_version_id: activeVersionId });
}

/**
 * Dispatches sync job for branch via POST /branches/sync.
 *
 * @param branchId - Unique UUID identifier of the branch to sync with upstream master.
 * @returns Promise resolving to the SyncBranchesResponse.
 * @throws Error when the sync job cannot be queued.
 */
export async function syncBranch(
  branchId: string
): Promise<SyncBranchesResponse> {
  const { data, error } = await api.POST("/branches/sync", {
    body: { branch_ids: [branchId] },
  });

  if (error || !data) {
    throw new Error(extractApiErrorMessage(error, "Failed to sync branch"));
  }

  return data;
}

/**
 * Hook to retrieve details for a single branch.
 *
 * @param branchId - Unique UUID identifier of the branch.
 */
export function useBranch(branchId: string) {
  return useQuery({
    queryKey: workbenchKeys.branch(branchId),
    queryFn: () => fetchBranch(branchId),
    enabled: Boolean(branchId),
  });
}

/**
 * Hook to retrieve all historical versions for a single branch.
 *
 * @param branchId - Unique UUID identifier of the branch.
 */
export function useBranchVersions(branchId: string) {
  return useQuery({
    queryKey: workbenchKeys.versions(branchId),
    queryFn: () => fetchBranchVersions(branchId),
    enabled: Boolean(branchId),
  });
}

/**
 * Hook to retrieve the available preset catalog.
 */
export function usePresets() {
  return useQuery({
    queryKey: workbenchKeys.presets(),
    queryFn: fetchPresets,
  });
}

/**
 * Hook to retrieve the available ATS templates catalog.
 */
export function useTemplates() {
  return useQuery({
    queryKey: workbenchKeys.templates(),
    queryFn: fetchTemplates,
  });
}

/**
 * Mutation hook to promote a version as the active version on a branch.
 * Automatically invalidates the branch query and versions query.
 *
 * @param branchId - Unique UUID identifier of the branch.
 */
export function useSetActiveVersion(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) =>
      updateBranchActiveVersion(branchId, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workbenchKeys.branch(branchId),
      });
      queryClient.invalidateQueries({
        queryKey: workbenchKeys.versions(branchId),
      });
    },
  });
}

/**
 * Mutation hook to update branch metadata, target requirements, instructions,
 * presets, or templates.
 * Automatically invalidates branch query on success.
 *
 * @param branchId - Unique UUID identifier of the branch.
 */
export function useUpdateBranch(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateBranchRequest) =>
      updateBranch(branchId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workbenchKeys.branch(branchId),
      });
    },
  });
}

/**
 * Mutation hook to sync a stale branch with latest master profile changes.
 * Automatically invalidates branch and versions queries on success.
 *
 * @param branchId - Unique UUID identifier of the branch.
 */
export function useSyncBranch(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => syncBranch(branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workbenchKeys.branch(branchId),
      });
      queryClient.invalidateQueries({
        queryKey: workbenchKeys.versions(branchId),
      });
    },
  });
}
