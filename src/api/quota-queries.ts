import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { api } from "./client";
import type { components } from "./schema";

/**
 * TanStack Query cache key for tenant LLM quota status.
 */
export const QUOTA_QUERY_KEY = ["quota"] as const;

/**
 * Tenant quota entity representing daily request and monthly token counters.
 */
export type TenantQuota = components["schemas"]["TenantQuota"];

/**
 * Hook to retrieve the authenticated tenant's current LLM quota status via GET /quota.
 * Returns daily requests used/limit and monthly tokens used/limit with window reset timestamps.
 *
 * @returns TanStack UseQueryResult wrapping TenantQuota
 */
export function useQuota(): UseQueryResult<TenantQuota, Error> {
  return useQuery({
    queryKey: QUOTA_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await api.GET("/quota");
      if (error || !data) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to fetch tenant quota"
        );
      }
      return data;
    },
    staleTime: 30 * 1000,
  });
}
