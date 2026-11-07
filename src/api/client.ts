import createClient, { type ClientOptions } from "openapi-fetch";
import type { paths } from "./schema";

/**
 * Default API base URL for development and production SPA deployments.
 * Defaults to '/api/v1' for relative same-origin or reverse-proxy deployments.
 */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || "/api/v1";

let currentAuthToken: string | null = null;

/**
 * Sets the active authentication bearer token for outgoing API requests.
 */
export function setAuthToken(token: string | null) {
  currentAuthToken = token;
}

/**
 * Retrieves the currently active authentication bearer token.
 */
export function getAuthToken(): string | null {
  return currentAuthToken;
}

/**
 * Creates a strongly typed OpenAPI client bound to the Resumeee API schema.
 * Defensively merges default headers with custom options to preserve Content-Type.
 */
export function createApiClient(options?: Partial<ClientOptions>) {
  const { headers: customHeaders, ...restOptions } = options || {};
  const client = createClient<paths>({
    baseUrl: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
      ...customHeaders,
    },
    ...restOptions,
  });

  client.use({
    async onRequest({ request }) {
      const token = getAuthToken();
      const adminMode = import.meta.env.ADMIN_MODE;
      const legacyAdminMode = import.meta.env.VITE_ADMIN_MODE;
      const isAdminMode =
        adminMode !== undefined && adminMode !== ""
          ? adminMode === "true"
          : legacyAdminMode === "true";
      if (token) {
        request.headers.set("Authorization", `Bearer ${token}`);
      } else if (isAdminMode && !request.headers.has("X-User-ID")) {
        request.headers.set("X-User-ID", "default");
      }
      return request;
    },
    async onResponse({ response }) {
      if (response.status === 401 && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("resumeee:unauthorized"));
      } else if (response.status === 429 && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("resumeee:quota-exceeded"));
      }
      return response;
    },
  });

  return client;
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
