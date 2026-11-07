/**
 * @file render-queries.ts
 * @description Typed TanStack Query hooks and utilities for resume preview, versions, and exports.
 *
 * Implements client-side query hooks bound to the OpenAPI 3.1 REST contract for:
 * - Branch details and active version tracking (`/branches/{id}`).
 * - Branch version history listing (`/branches/{id}/versions`).
 * - Full version records with rendered HTML/Markdown/Text outputs (`/branches/{id}/versions/{v}`).
 * - Master profile career snapshot for tailoring baseline diffs (`/profile/full`).
 * - Pre-rendered artifact export URL construction (`/branches/{id}/versions/{v}/export`).
 *
 * Architectural Role:
 * - Pure client-side data layer leveraging `@tanstack/react-query` for automatic caching,
 *   deduplication, and background synchronization.
 * - Contract-first integration using `openapi-fetch` typed client.
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { api, API_BASE_URL } from "./client";
import type { components } from "./schema";

/**
 * Branch metadata model representing a tailored resume career line.
 */
export type Branch = components["schemas"]["Branch"];

/**
 * Immutable branch version snapshot containing tailored content and rendered outputs.
 */
export type BranchVersion = components["schemas"]["BranchVersion"];

/**
 * Render output bundle containing HTML, Markdown, and PlainText representations.
 */
export type RenderOutput = components["schemas"]["RenderOutput"];

/**
 * Complete Master Profile career graph snapshot including skills, experiences, projects, and facts.
 */
export type MasterProfileSnapshot = components["schemas"]["MasterProfileSnapshot"];

/**
 * Query key factories for predictable TanStack Query caching and cache invalidation.
 */
export const renderQueryKeys = {
  /** Root key for all resume render and preview queries */
  all: ["render"] as const,
  /** Cache key for a specific branch record */
  branch: (id: string) => ["render", "branch", id] as const,
  /** Cache key for all historical versions of a branch */
  versions: (branchId: string) => ["render", "branch", branchId, "versions"] as const,
  /** Cache key for a specific branch version payload */
  version: (branchId: string, versionId: string) =>
    ["render", "branch", branchId, "version", versionId] as const,
  /** Cache key for a specific branch version preview output */
  branchPreview: (branchId: string, versionId: string, templateSetId?: string) =>
    templateSetId
      ? (["render", "branch", branchId, "preview", versionId, templateSetId] as const)
      : (["render", "branch", branchId, "preview", versionId] as const),
  /** Cache key for the root master profile career snapshot */
  masterProfile: () => ["render", "masterProfile"] as const,
};

/**
 * Supported artifact export format parameters.
 */
export type ExportFormat = "html" | "markdown" | "text" | "jsonresume";

/**
 * Constructs the canonical direct-download URL for a rendered branch version artifact.
 *
 * @param branchId - Unique UUID identifier of the parent resume branch.
 * @param versionNumberOrId - Sequential version number (e.g. 1) or version UUID.
 * @param format - Desired export format: 'html', 'markdown', 'text', or 'jsonresume'. Defaults to 'html'.
 * @returns Fully qualified relative URL for downloading the artifact from the backend API.
 */
export function getBranchVersionExportUrl(
  branchId: string,
  versionNumberOrId: string | number,
  format: ExportFormat = "html"
): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  return `${base}/branches/${encodeURIComponent(branchId)}/versions/${encodeURIComponent(
    String(versionNumberOrId)
  )}/export?format=${encodeURIComponent(format)}`;
}

/**
 * Constructs the canonical direct-view URL for a rendered branch version preview.
 *
 * @param branchId - Unique UUID identifier of the parent resume branch.
 * @param versionNumberOrId - Sequential version number (e.g. 1) or version UUID.
 * @param format - Desired preview format: 'html', 'markdown', or 'text'. Defaults to 'html'.
 * @returns Fully qualified relative URL for previewing the rendered artifact directly.
 */
export function getBranchVersionPreviewUrl(
  branchId: string,
  versionNumberOrId: string | number,
  format: "html" | "markdown" | "text" = "html"
): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  return `${base}/branches/${encodeURIComponent(branchId)}/versions/${encodeURIComponent(
    String(versionNumberOrId)
  )}/preview?format=${encodeURIComponent(format)}`;
}

/**
 * Query hook fetching branch metadata including active_version_id and targeting rules.
 *
 * @param branchId - Unique UUID of the target resume branch.
 * @returns UseQueryResult containing the Branch entity or query error.
 */
export function useBranch(branchId: string): UseQueryResult<Branch, Error> {
  return useQuery({
    queryKey: renderQueryKeys.branch(branchId),
    queryFn: async () => {
      const { data, error } = await api.GET("/branches/{id}", {
        params: { path: { id: branchId } },
      });
      if (error || !data) {
        const errorMsg =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: string }).message)
            : "Failed to load branch";
        throw new Error(errorMsg);
      }
      return data;
    },
    enabled: Boolean(branchId),
  });
}

/**
 * Query hook fetching all historical immutable versions generated for a branch.
 *
 * @param branchId - Unique UUID of the parent resume branch.
 * @returns UseQueryResult containing an array of BranchVersion records.
 */
export function useBranchVersions(branchId: string): UseQueryResult<BranchVersion[], Error> {
  return useQuery({
    queryKey: renderQueryKeys.versions(branchId),
    queryFn: async () => {
      const { data, error } = await api.GET("/branches/{id}/versions", {
        params: { path: { id: branchId } },
      });
      if (error || !data) {
        const errorMsg =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: string }).message)
            : "Failed to load branch versions";
        throw new Error(errorMsg);
      }
      return data;
    },
    enabled: Boolean(branchId),
  });
}

/**
 * Query hook fetching full version details including pre-rendered HTML/Markdown/Text outputs.
 *
 * @param branchId - Unique UUID of the parent resume branch.
 * @param versionNumberOrId - Sequential version number (e.g. 1) or version UUID.
 * @returns UseQueryResult containing the detailed BranchVersion record.
 */
export function useBranchVersion(
  branchId: string,
  versionNumberOrId: string | number | undefined
): UseQueryResult<BranchVersion, Error> {
  const v = versionNumberOrId !== undefined ? String(versionNumberOrId) : "";
  return useQuery({
    queryKey: renderQueryKeys.version(branchId, v),
    queryFn: async () => {
      const { data, error } = await api.GET("/branches/{id}/versions/{v}", {
        params: { path: { id: branchId, v } },
      });
      if (error || !data) {
        const errorMsg =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: string }).message)
            : "Failed to load version details";
        throw new Error(errorMsg);
      }
      return data;
    },
    enabled: Boolean(branchId && v),
  });
}

/**
 * Query hook fetching the complete Master Profile career graph snapshot.
 *
 * Used as the primary baseline for visual tailoring diffs against master facts.
 *
 * @returns UseQueryResult containing the MasterProfileSnapshot record.
 */
export function useFullProfile(): UseQueryResult<MasterProfileSnapshot, Error> {
  return useQuery({
    queryKey: renderQueryKeys.masterProfile(),
    queryFn: async () => {
      const { data, error } = await api.GET("/profile/full", {});
      if (error || !data) {
        const errorMsg =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: string }).message)
            : "Failed to load master profile snapshot";
        throw new Error(errorMsg);
      }
      return data;
    },
  });
}

/**
 * Query hook fetching rendered output (HTML, Markdown, PlainText) for a branch version using Go templating.
 *
 * @param branchId - Unique UUID of the parent resume branch.
 * @param versionNumberOrId - Sequential version number (e.g. 1) or version UUID.
 * @param templateSetId - Optional visual layout template set ID override for dynamic preview rendering.
 * @returns UseQueryResult containing the RenderOutput record.
 */
export function useBranchVersionPreview(
  branchId: string,
  versionNumberOrId: string | number | undefined,
  templateSetId?: string
): UseQueryResult<RenderOutput, Error> {
  const v = versionNumberOrId !== undefined ? String(versionNumberOrId) : "";
  return useQuery({
    queryKey: renderQueryKeys.branchPreview(branchId, v, templateSetId),
    queryFn: async () => {
      const { data, error } = await api.GET("/branches/{id}/versions/{v}/preview", {
        params: {
          path: { id: branchId, v },
          query: templateSetId ? { template_set_id: templateSetId } : undefined,
        },
      });
      if (error || !data) {
        const errorMsg =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: string }).message)
            : "Failed to load branch version preview";
        throw new Error(errorMsg);
      }
      return data as RenderOutput;
    },
    enabled: Boolean(branchId && v),
  });
}
