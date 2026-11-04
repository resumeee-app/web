/**
 * @file template-queries.ts
 * @description Strongly-typed TanStack Query hooks, API mutations, and domain immutability
 * helpers for Resumeee Template Sets. Consumes canonical REST endpoints defined in the
 * OpenAPI 3.1 specification (`/api/v1/templates` and `/api/v1/templates/{id}`).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { components } from "./schema";

/**
 * Full TemplateSet entity definition returned by the Resumeee API.
 * Encapsulates multi-format Go templates (HTML, CSS, Markdown, Plain Text) and system ownership.
 */
export type TemplateSet = components["schemas"]["TemplateSet"];

/**
 * Request payload for creating a new custom TemplateSet entity.
 */
export type CreateTemplateRequest = components["schemas"]["CreateTemplateRequest"];

/**
 * Request payload for modifying an existing custom TemplateSet entity.
 */
export type UpdateTemplateRequest = components["schemas"]["UpdateTemplateRequest"];

/**
 * Pre-rendered multi-format resume outputs returned by the Go server template engine.
 */
export type RenderOutput = components["schemas"]["RenderOutput"];

/**
 * Request payload for server-side preview generation of in-progress or stored templates.
 */
export type RenderTemplatePreviewRequest = components["schemas"]["RenderTemplatePreviewRequest"];

/**
 * Structured API error response returned by the backend on validation or server errors.
 */
export type ErrorResponse = components["schemas"]["ErrorResponse"];

/**
 * Canonical built-in template IDs defined in `internal/renderer/defaults.go`.
 * These represent core ATS-friendly and professional resume formats shipped with Resumeee.
 */
export const BUILTIN_TEMPLATE_IDS = [
  "builtin-standard-clean",
  "builtin-detailed-immigration-cv",
  "builtin-ats-minimal-txt",
  "builtin-ats-hybrid-tech",
  "builtin-ats-executive-clean",
] as const;

/**
 * Defensively determines whether a template set is an immutable built-in system template.
 *
 * Immutability Invariant:
 * System templates cannot be modified or deleted by users. Built-in status is verified
 * dynamically against multiple defense layers:
 * 1. Backend `is_built_in` boolean attribute.
 * 2. System ownership (`user_id === "system"`).
 * 3. Canonical `builtin-` prefix convention.
 * 4. Inclusion in `BUILTIN_TEMPLATE_IDS` from `internal/renderer/defaults.go`.
 *
 * @param template - The template object to inspect (or null/undefined).
 * @returns True if the template is an immutable built-in template, false otherwise.
 */
export function isBuiltInTemplate(
  template?: { id: string; is_built_in?: boolean; user_id?: string } | null
): boolean {
  if (!template || !template.id) return false;

  if (template.is_built_in === true) return true;
  if (template.user_id === "system") return true;
  if (template.id.startsWith("builtin-")) return true;
  return BUILTIN_TEMPLATE_IDS.includes(template.id as (typeof BUILTIN_TEMPLATE_IDS)[number]);
}

/**
 * Query key factory for TanStack Query template cache operations.
 * Facilitates deterministic cache invalidation upon create, update, and delete mutations.
 */
export const templateKeys = {
  all: ["templates"] as const,
  detail: (id: string) => ["templates", id] as const,
  preview: (id: string) => ["templates", id, "preview"] as const,
};

/**
 * TanStack Query hook to retrieve all available template sets (both system built-ins and custom).
 *
 * Architectural Role:
 * Fetches the complete catalog from `GET /api/v1/templates`.
 *
 * @returns TanStack Query result containing array of TemplateSet items.
 */
export function useTemplates() {
  return useQuery({
    queryKey: templateKeys.all,
    queryFn: async (): Promise<TemplateSet[]> => {
      const { data, error } = await api.GET("/templates");
      if (error) {
        throw new Error((error as { error?: { message?: string } })?.error?.message || "Failed to load templates");
      }
      return data || [];
    },
  });
}

/**
 * TanStack Query hook to retrieve a single template set by its identifier.
 *
 * Architectural Role:
 * Fetches entity details from `GET /api/v1/templates/{id}`. Automatically disabled
 * when the id is undefined or equals the sentinel `"new"` routing value.
 *
 * @param id - The unique identifier of the template set to retrieve.
 * @returns TanStack Query result containing the specific TemplateSet.
 */
export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: templateKeys.detail(id || ""),
    queryFn: async (): Promise<TemplateSet> => {
      if (!id || id === "new") {
        throw new Error("Invalid template ID");
      }
      const { data, error } = await api.GET("/templates/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw new Error((error as { error?: { message?: string } })?.error?.message || "Failed to load template");
      }
      if (!data) {
        throw new Error("Template not found");
      }
      return data;
    },
    enabled: Boolean(id && id !== "new"),
  });
}

/**
 * TanStack Query hook to retrieve pre-rendered HTML, Markdown, and text outputs for a template set.
 *
 * Architectural Role:
 * Fetches server-rendered outputs from `GET /api/v1/templates/{id}/preview`.
 *
 * @param id - The unique identifier of the template set.
 * @returns TanStack Query result containing the multi-format RenderOutput.
 */
export function useTemplatePreview(id: string | undefined) {
  return useQuery({
    queryKey: templateKeys.preview(id || ""),
    queryFn: async (): Promise<RenderOutput> => {
      if (!id || id === "new") {
        throw new Error("Invalid template ID");
      }
      const { data, error } = await api.GET("/templates/{id}/preview", {
        params: { path: { id } },
      });
      if (error) {
        throw new Error((error as { error?: { message?: string } })?.error?.message || "Failed to load template preview");
      }
      if (!data) {
        throw new Error("Template preview returned empty output");
      }
      return data as RenderOutput;
    },
    enabled: Boolean(id && id !== "new"),
  });
}

/**
 * TanStack Mutation hook to render draft Go templates on the server using Go templating and server values.
 *
 * Architectural Role:
 * Submits draft template snippets to `POST /api/v1/templates/preview` for real-time live previewing.
 *
 * @returns TanStack Mutation result that compiles and returns rendered outputs from the Go server.
 */
export function useRenderTemplatePreview() {
  return useMutation({
    mutationFn: async (payload: RenderTemplatePreviewRequest): Promise<RenderOutput> => {
      const { data, error, response } = await api.POST("/templates/preview", {
        body: payload,
      });

      if (error || !data) {
        throw buildTemplateMutationError(
          error,
          `Failed to render template preview (status ${response?.status})`
        );
      }
      return data as RenderOutput;
    },
  });
}

/**
 * Error type returned by template mutation helpers, augmented with backend error metadata.
 */
export interface TemplateMutationError extends Error {
  code?: string;
  details?: string;
}

/**
 * Constructs a structured Error from a template mutation failure response.
 * Parses backend error payloads, populates optional `code` and `details` fields,
 * and falls back to a descriptive default message if no technical details exist.
 *
 * @param error - The raw error payload from the OpenAPI client.
 * @param fallbackMessage - Default error message if the error body lacks message details.
 * @returns A structured TemplateMutationError instance.
 */
export function buildTemplateMutationError(
  error: unknown,
  fallbackMessage: string
): TemplateMutationError {
  const errorBody = error as ErrorResponse | undefined;
  const msg =
    errorBody?.error?.details ||
    errorBody?.error?.message ||
    fallbackMessage;
  const customErr = new Error(msg) as TemplateMutationError;
  customErr.code = errorBody?.error?.code;
  customErr.details = errorBody?.error?.details;
  return customErr;
}

/**
 * TanStack Mutation hook to create a new custom template set.
 *
 * Architectural Role:
 * Dispatches payload to `POST /api/v1/templates`. On success, automatically invalidates
 * the `templates` collection cache so all gallery views reflect the new template immediately.
 * On 422 validation failure, parses backend Go template syntax error diagnostics.
 *
 * @returns TanStack Mutation result for creating a template set.
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTemplateRequest): Promise<TemplateSet> => {
      const { data, error, response } = await api.POST("/templates", {
        body: payload,
      });

      if (error || !data) {
        throw buildTemplateMutationError(
          error,
          `Failed to create template (status ${response?.status})`
        );
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

/**
 * TanStack Mutation hook to update an existing custom template set.
 *
 * Architectural Role:
 * Dispatches payload to `PUT /api/v1/templates/{id}`. On success, invalidates both the
 * templates list cache and the specific template detail cache.
 *
 * @returns TanStack Mutation result for updating a template set.
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateTemplateRequest;
    }): Promise<TemplateSet> => {
      const { data, error, response } = await api.PUT("/templates/{id}", {
        params: { path: { id } },
        body: payload,
      });

      if (error || !data) {
        throw buildTemplateMutationError(
          error,
          `Failed to update template (status ${response?.status})`
        );
      }
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(variables.id) });
    },
  });
}

/**
 * TanStack Mutation hook to delete a custom template set.
 *
 * Architectural Role:
 * Dispatches request to `DELETE /api/v1/templates/{id}`. Upon success, invalidates the
 * templates catalog query cache.
 *
 * @returns TanStack Mutation result for deleting a template set.
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error, response } = await api.DELETE("/templates/{id}", {
        params: { path: { id } },
      });

      if (error) {
        throw buildTemplateMutationError(
          error,
          `Failed to delete template (status ${response?.status})`
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}
