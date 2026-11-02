import createClient, { type ClientOptions } from "openapi-fetch";
import type { paths } from "./schema";

/**
 * Default API base URL for development and production SPA deployments.
 * Defaults to '/api/v1' for relative same-origin or reverse-proxy deployments.
 */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || "/api/v1";

/**
 * Creates a strongly typed OpenAPI client bound to the Resumeee API schema.
 * Defensively merges default headers with custom options to preserve Content-Type.
 */
export function createApiClient(options?: Partial<ClientOptions>) {
  const { headers: customHeaders, ...restOptions } = options || {};
  return createClient<paths>({
    baseUrl: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
      ...customHeaders,
    },
    ...restOptions,
  });
}

/**
 * Shared singleton API client instance.
 */
export const api = createApiClient();

/**
 * Extracts a user-facing error message from an OpenAPI client error response
 * or returns a fallback string if no structured error message is present.
 *
 * @param error - The raw error response returned by openapi-fetch.
 * @param fallback - Default fallback error message.
 * @returns Clean, user-safe error message string.
 */
export function extractApiErrorMessage(error: unknown, fallback: string): string {
  const errorDetails = error as { error?: { message?: string } } | undefined;
  return errorDetails?.error?.message || fallback;
}
