import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { api } from "./client";
import type { components } from "./schema";

/** Canonical Preset entity from OpenAPI schema */
export type Preset = components["schemas"]["Preset"];

/** Request body payload for creating a custom Preset */
export type CreatePresetRequest = components["schemas"]["CreatePresetRequest"];

/** Request body payload for updating an existing Preset */
export type UpdatePresetRequest = components["schemas"]["UpdatePresetRequest"];

/** Database-stored template set entity from OpenAPI schema */
export type TemplateSet = components["schemas"]["TemplateSet"];

/** TanStack Query cache key for all presets */
export const presetsQueryKey = ["presets"] as const;

/**
 * Generates the TanStack Query cache key for an individual preset.
 * @param id Preset entity UUID or built-in ID
 */
export const presetQueryKey = (id: string) => ["presets", id] as const;

/** TanStack Query cache key for all available template sets */
export const templateSetsQueryKey = ["template-sets"] as const;

/**
 * Safely extracts a descriptive error message from an unknown API error payload or returns a fallback message.
 *
 * @param error Raw error payload returned from the OpenAPI fetch client
 * @param fallbackMessage Default message to return if the error structure lacks a valid message property
 * @returns Formatted error message string
 */
export function extractApiErrorMessage(
  error: unknown,
  fallbackMessage: string
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    Boolean((error as { message: unknown }).message)
  ) {
    return String((error as { message: unknown }).message);
  }
  return fallbackMessage;
}

/**
 * Hook to fetch all presets (system-provided built-in presets and user custom presets).
 *
 * @param options Optional TanStack useQuery configuration overrides
 * @returns Query result containing the array of Preset entities
 */
export function usePresetsQuery(
  options?: Omit<UseQueryOptions<Preset[], Error>, "queryKey" | "queryFn">
) {
  return useQuery<Preset[], Error>({
    queryKey: presetsQueryKey,
    queryFn: async () => {
      const { data, error } = await api.GET("/presets");
      if (error) {
        throw new Error(
          extractApiErrorMessage(error, "Failed to fetch presets")
        );
      }
      return data ?? [];
    },
    ...options,
  });
}

/**
 * Hook to fetch a single preset by ID from `/api/v1/presets/{id}`.
 * Automatically disabled if ID is falsy or set to "new".
 *
 * @param id Preset identifier (built-in ID or custom UUID)
 * @param options Optional TanStack useQuery configuration overrides
 * @returns Query result containing the single Preset entity
 */
export function usePresetQuery(
  id?: string,
  options?: Omit<UseQueryOptions<Preset, Error>, "queryKey" | "queryFn">
) {
  return useQuery<Preset, Error>({
    queryKey: presetQueryKey(id ?? ""),
    queryFn: async () => {
      if (!id) {
        throw new Error("Preset ID is required");
      }
      const { data, error } = await api.GET("/presets/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw new Error(
          extractApiErrorMessage(error, `Failed to fetch preset ${id}`)
        );
      }
      if (!data) {
        throw new Error(`Preset ${id} not found`);
      }
      return data;
    },
    enabled: Boolean(id && id !== "new"),
    ...options,
  });
}

/**
 * Hook to create a new custom preset via `POST /api/v1/presets`.
 * Automatically invalidates the `["presets"]` query cache upon success.
 *
 * @returns TanStack Mutation hook for creating presets
 */
export function useCreatePresetMutation() {
  const queryClient = useQueryClient();

  return useMutation<Preset, Error, CreatePresetRequest>({
    mutationFn: async (body) => {
      const { data, error } = await api.POST("/presets", {
        body,
      });
      if (error) {
        throw new Error(
          extractApiErrorMessage(error, "Failed to create preset")
        );
      }
      if (!data) {
        throw new Error("No data returned from preset creation");
      }
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: presetsQueryKey });
    },
  });
}

/**
 * Hook to update an existing custom preset via `PUT /api/v1/presets/{id}`.
 * Automatically invalidates both `["presets"]` and `["presets", id]` caches upon success.
 *
 * @returns TanStack Mutation hook for updating presets
 */
export function useUpdatePresetMutation() {
  const queryClient = useQueryClient();

  return useMutation<Preset, Error, { id: string; data: UpdatePresetRequest }>({
    mutationFn: async ({ id, data: body }) => {
      const { data, error } = await api.PUT("/presets/{id}", {
        params: { path: { id } },
        body,
      });
      if (error) {
        throw new Error(
          extractApiErrorMessage(error, `Failed to update preset ${id}`)
        );
      }
      if (!data) {
        throw new Error(`No data returned when updating preset ${id}`);
      }
      return data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: presetsQueryKey });
      void queryClient.invalidateQueries({
        queryKey: presetQueryKey(variables.id),
      });
    },
  });
}

/**
 * Hook to delete a custom preset via `DELETE /api/v1/presets/{id}`.
 * Automatically invalidates the `["presets"]` cache upon success.
 *
 * @returns TanStack Mutation hook for deleting presets
 */
export function useDeletePresetMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/presets/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw new Error(
          extractApiErrorMessage(error, `Failed to delete preset ${id}`)
        );
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: presetsQueryKey });
    },
  });
}

/**
 * Hook to list available template sets from `/api/v1/templates` for associating presets.
 *
 * @param options Optional TanStack useQuery configuration overrides
 * @returns Query result containing the list of template sets
 */
export function useTemplateSetsQuery(
  options?: Omit<UseQueryOptions<TemplateSet[], Error>, "queryKey" | "queryFn">
) {
  return useQuery<TemplateSet[], Error>({
    queryKey: templateSetsQueryKey,
    queryFn: async () => {
      const { data, error } = await api.GET("/templates");
      if (error) {
        throw new Error(
          extractApiErrorMessage(error, "Failed to fetch template sets")
        );
      }
      return data ?? [];
    },
    ...options,
  });
}
