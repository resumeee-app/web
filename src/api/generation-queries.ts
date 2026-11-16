import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, extractApiErrorMessage } from "./client";
import { workbenchKeys } from "./workbench-queries";
import type { components } from "./schema";

/**
 * VersionStatus represents the asynchronous lifecycle stages of a tailored resume version.
 */
export type VersionStatus = components["schemas"]["VersionStatus"];

/**
 * AsyncJobEnqueued is the 202 Accepted response payload from the LLM worker pool.
 */
export type AsyncJobEnqueued = components["schemas"]["AsyncJobEnqueued"];

/**
 * BranchVersion represents an immutable historical resume version entity.
 */
export type BranchVersion = components["schemas"]["BranchVersion"];

/**
 * Canonical list of terminal statuses where active generation polling should halt.
 */
export const TERMINAL_STATUSES: readonly VersionStatus[] = [
  "completed",
  "completed_with_warnings",
  "failed",
  "cancelled",
] as const;

/**
 * Checks whether a given version status is in a terminal state.
 *
 * @param status - The candidate version status to evaluate.
 * @returns `true` if status is completed, completed_with_warnings, failed, or cancelled; otherwise `false`.
 */
export function isTerminalStatus(status?: string | null): boolean {
  if (!status) return false;
  return TERMINAL_STATUSES.includes(status as VersionStatus);
}

/**
 * TanStack Query key factory for resume generation and polling queries.
 */
export const generationKeys = {
  all: ["generation"] as const,
  poll: (branchId: string, versionId: string) =>
    [...generationKeys.all, "poll", branchId, versionId] as const,
};

/**
 * Enqueues asynchronous resume generation via POST /branches/{id}/generate.
 *
 * @param branchId - Unique UUID identifier of the resume branch.
 * @returns Promise resolving to the AsyncJobEnqueued payload containing the generated version UUID.
 * @throws Error when the backend returns an error or when worker capacity is saturated (503).
 */
export async function generateVersion(
  branchId: string
): Promise<AsyncJobEnqueued> {
  const { data, error } = await api.POST("/branches/{id}/generate", {
    params: { path: { id: branchId } },
  });

  if (error || !data) {
    throw new Error(
      extractApiErrorMessage(error, "Failed to trigger resume generation")
    );
  }

  return data;
}

/**
 * Retrieves version details and status via GET /branches/{id}/versions/{v}.
 *
 * @param branchId - Unique UUID identifier of the branch.
 * @param versionId - Sequential version number or version UUID.
 * @returns Promise resolving to the BranchVersion detail entity.
 * @throws Error when the version cannot be retrieved.
 */
export async function fetchBranchVersion(
  branchId: string,
  versionId: string
): Promise<BranchVersion> {
  const { data, error } = await api.GET("/branches/{id}/versions/{v}", {
    params: { path: { id: branchId, v: versionId } },
  });

  if (error || !data) {
    throw new Error(
      extractApiErrorMessage(error, "Failed to fetch branch version details")
    );
  }

  return data;
}

/**
 * Options for configuring the version polling query hook.
 */
export interface UseVersionPollOptions {
  /** Flag to toggle polling active state. Defaults to true. */
  enabled?: boolean;
  /** Polling interval in milliseconds while non-terminal. Defaults to 2000ms. */
  refetchIntervalMs?: number;
}

/**
 * Polling query hook for active branch version generation.
 *
 * Architectural Role:
 * - Polls GET /branches/{id}/versions/{v} at a configured interval (default 2000ms).
 * - Utilizes TanStack Query's dynamic `refetchInterval` function to automatically
 *   terminate polling once the status reaches a terminal state (`completed`,
 *   `completed_with_warnings`, or `failed`), or when a query error occurs.
 *
 * @param branchId - Unique UUID identifier of the branch.
 * @param versionId - Version identifier currently undergoing generation.
 * @param options - Polling options controlling enabled status and interval.
 */
export function useVersionPoll(
  branchId: string,
  versionId?: string | null,
  options?: UseVersionPollOptions
) {
  const interval = options?.refetchIntervalMs ?? 2000;

  return useQuery({
    queryKey: generationKeys.poll(branchId, versionId || ""),
    queryFn: () => fetchBranchVersion(branchId, versionId!),
    enabled: Boolean(branchId && versionId && options?.enabled !== false),
    refetchInterval: (query) => {
      if (query.state.error) return false;
      const status = query.state.data?.status;
      if (!status || !isTerminalStatus(status)) {
        return interval;
      }
      return false;
    },
  });
}

/**
 * Mutation hook for triggering resume generation.
 *
 * Architectural Role:
 * - Dispatches POST /branches/{id}/generate.
 * - On success, invalidates the cached versions list and branch metadata.
 *
 * @param branchId - Unique UUID identifier of the target resume branch.
 */
export function useGenerateVersion(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateVersion(branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workbenchKeys.versions(branchId),
      });
      queryClient.invalidateQueries({
        queryKey: workbenchKeys.branch(branchId),
      });
    },
  });
}
