import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createApiClient,
  api,
  API_BASE_URL,
  extractApiErrorMessage,
  setAuthToken,
} from "./client";

describe("OpenAPI Client Configuration", () => {
  beforeEach(() => {
    setAuthToken(null);
    vi.unstubAllEnvs();
  });

  it("initializes with default API base URL", () => {
    expect(API_BASE_URL).toBeDefined();
    expect(typeof API_BASE_URL).toBe("string");
  });

  it("exports a configured singleton api client", () => {
    expect(api).toBeDefined();
    expect(typeof api.GET).toBe("function");
    expect(typeof api.POST).toBe("function");
    expect(typeof api.PUT).toBe("function");
    expect(typeof api.DELETE).toBe("function");
  });

  it("defensively merges default Content-Type header with custom options", () => {
    const customClient = createApiClient({
      baseUrl: "https://custom.api.resumeee.io/api/v1",
      headers: {
        Authorization: "Bearer test-token-123",
      },
    });

    expect(customClient).toBeDefined();
    expect(typeof customClient.GET).toBe("function");
  });

  it("allows custom overrides without mutating the default singleton", () => {
    const client1 = createApiClient({ baseUrl: "/api/test1" });
    const client2 = createApiClient({ baseUrl: "/api/test2" });

    expect(client1).not.toBe(client2);
    expect(client1).not.toBe(api);
  });

  describe("Admin Mode Authentication Interceptor", () => {
    it("attaches X-User-ID: default when ADMIN_MODE is 'true' and no bearer token exists", async () => {
      vi.stubEnv("ADMIN_MODE", "true");
      vi.stubEnv("VITE_ADMIN_MODE", "");

      let capturedRequest: Request | null = null;
      const mockFetch = vi.fn().mockImplementation((req: Request) => {
        capturedRequest = req;
        return Promise.resolve(new Response(JSON.stringify({ status: "ok" }), { status: 200 }));
      });
      const client = createApiClient({ baseUrl: "http://localhost:8080/api/v1", fetch: mockFetch });

      await client.GET("/health", {});

      expect(capturedRequest).not.toBeNull();
      expect(capturedRequest!.headers.get("X-User-ID")).toBe("default");
    });

    it("falls back to legacy VITE_ADMIN_MODE='true' when ADMIN_MODE is unset", async () => {
      vi.stubEnv("ADMIN_MODE", "");
      vi.stubEnv("VITE_ADMIN_MODE", "true");

      let capturedRequest: Request | null = null;
      const mockFetch = vi.fn().mockImplementation((req: Request) => {
        capturedRequest = req;
        return Promise.resolve(new Response(JSON.stringify({ status: "ok" }), { status: 200 }));
      });
      const client = createApiClient({ baseUrl: "http://localhost:8080/api/v1", fetch: mockFetch });

      await client.GET("/health", {});

      expect(capturedRequest).not.toBeNull();
      expect(capturedRequest!.headers.get("X-User-ID")).toBe("default");
    });

    it("prioritizes Bearer token over Admin Mode default header", async () => {
      vi.stubEnv("ADMIN_MODE", "true");
      setAuthToken("custom-jwt-token");

      let capturedRequest: Request | null = null;
      const mockFetch = vi.fn().mockImplementation((req: Request) => {
        capturedRequest = req;
        return Promise.resolve(new Response(JSON.stringify({ status: "ok" }), { status: 200 }));
      });
      const client = createApiClient({ baseUrl: "http://localhost:8080/api/v1", fetch: mockFetch });

      await client.GET("/health", {});

      expect(capturedRequest).not.toBeNull();
      expect(capturedRequest!.headers.get("Authorization")).toBe("Bearer custom-jwt-token");
      expect(capturedRequest!.headers.get("X-User-ID")).toBeNull();
    });

    it("ensures explicit ADMIN_MODE='false' takes precedence over legacy VITE_ADMIN_MODE='true'", async () => {
      vi.stubEnv("ADMIN_MODE", "false");
      vi.stubEnv("VITE_ADMIN_MODE", "true");

      let capturedRequest: Request | null = null;
      const mockFetch = vi.fn().mockImplementation((req: Request) => {
        capturedRequest = req;
        return Promise.resolve(new Response(JSON.stringify({ status: "ok" }), { status: 200 }));
      });
      const client = createApiClient({ baseUrl: "http://localhost:8080/api/v1", fetch: mockFetch });

      await client.GET("/health", {});

      expect(capturedRequest).not.toBeNull();
      expect(capturedRequest!.headers.get("X-User-ID")).toBeNull();
    });

    it("does not attach X-User-ID when ADMIN_MODE is 'false'", async () => {
      vi.stubEnv("ADMIN_MODE", "false");
      vi.stubEnv("VITE_ADMIN_MODE", "false");

      let capturedRequest: Request | null = null;
      const mockFetch = vi.fn().mockImplementation((req: Request) => {
        capturedRequest = req;
        return Promise.resolve(new Response(JSON.stringify({ status: "ok" }), { status: 200 }));
      });
      const client = createApiClient({ baseUrl: "http://localhost:8080/api/v1", fetch: mockFetch });

      await client.GET("/health", {});

      expect(capturedRequest).not.toBeNull();
      expect(capturedRequest!.headers.get("X-User-ID")).toBeNull();
    });
  });

  describe("extractApiErrorMessage", () => {
    it("extracts structured error message from OpenAPI response", () => {
      const errorObj = { error: { message: "Validation failed: invalid preset" } };
      expect(extractApiErrorMessage(errorObj, "Fallback error")).toBe(
        "Validation failed: invalid preset"
      );
    });

    it("returns fallback message when error structure is missing or empty", () => {
      expect(extractApiErrorMessage(null, "Default error")).toBe("Default error");
      expect(extractApiErrorMessage(undefined, "Default error")).toBe("Default error");
      expect(extractApiErrorMessage({}, "Default error")).toBe("Default error");
      expect(extractApiErrorMessage({ error: {} }, "Default error")).toBe("Default error");
    });
  });
});
