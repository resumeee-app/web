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
 * Returns true when the application is configured to run in single-user Admin Mode.
 * Checks `ADMIN_MODE`, falling back to legacy `VITE_ADMIN_MODE`.
 */
export function isAdminMode(): boolean {
  const adminMode = import.meta.env.ADMIN_MODE;
  const legacyAdminMode = import.meta.env.VITE_ADMIN_MODE;
  return adminMode !== undefined && adminMode !== ""
    ? adminMode === "true"
    : legacyAdminMode === "true";
}

/**
 * Evaluates whether the currently authenticated user has administrative privileges.
 * Returns true if running in Admin Mode or if the active JWT bearer token contains
 * an admin claim (admin: true, role: "admin", or roles: ["admin"]).
 */
export function isUserAdmin(): boolean {
  if (isAdminMode()) {
    return true;
  }
  const token = getAuthToken();
  if (!token) {
    return false;
  }
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) {
      return false;
    }
    const payloadSegment = parts[1];
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padLength = (4 - (base64.length % 4)) % 4;
    const paddedBase64 = base64.padEnd(base64.length + padLength, "=");
    const jsonString = decodeURIComponent(
      atob(paddedBase64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload: unknown = JSON.parse(jsonString);
    if (typeof payload !== "object" || payload === null) {
      return false;
    }
    const claims = payload as {
      admin?: boolean;
      role?: unknown;
      roles?: unknown;
    };
    const isAdminRole = (val: unknown): boolean =>
      typeof val === "string" && val.trim().toLowerCase() === "admin";
    const roleMatches = isAdminRole(claims.role);
    const rolesMatch =
      Array.isArray(claims.roles) && claims.roles.some(isAdminRole);
    return Boolean(claims.admin === true || roleMatches || rolesMatch);
  } catch {
    return false;
  }
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
      const isAdmin = isAdminMode();
      if (token) {
        request.headers.set("Authorization", `Bearer ${token}`);
      } else if (isAdmin && !request.headers.has("X-User-ID")) {
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
