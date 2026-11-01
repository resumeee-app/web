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
