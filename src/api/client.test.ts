import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createApiClient,
  api,
  API_BASE_URL,
  extractApiErrorMessage,
  setAuthToken,
  isAdminMode,
  isUserAdmin,
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

  describe("isAdminMode", () => {
    it("returns true when ADMIN_MODE is 'true'", () => {
      vi.stubEnv("ADMIN_MODE", "true");
      expect(isAdminMode()).toBe(true);
    });

    it("returns true when VITE_ADMIN_MODE is 'true' and ADMIN_MODE is unset", () => {
      vi.stubEnv("ADMIN_MODE", "");
      vi.stubEnv("VITE_ADMIN_MODE", "true");
      expect(isAdminMode()).toBe(true);
    });

    it("returns false when ADMIN_MODE is 'false'", () => {
      vi.stubEnv("ADMIN_MODE", "false");
      vi.stubEnv("VITE_ADMIN_MODE", "true");
      expect(isAdminMode()).toBe(false);
    });

    it("returns false when both are unset", () => {
      vi.stubEnv("ADMIN_MODE", "");
      vi.stubEnv("VITE_ADMIN_MODE", "");
      expect(isAdminMode()).toBe(false);
    });
  });

  describe("isUserAdmin", () => {
    function makeTestJwt(payload: unknown): string {
      const toBase64Url = (str: string) =>
        btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const body = toBase64Url(JSON.stringify(payload));
      return `${header}.${body}.mock-signature`;
    }

    it("returns true when isAdminMode is true regardless of token", () => {
      vi.stubEnv("ADMIN_MODE", "true");
      setAuthToken(null);
      expect(isUserAdmin()).toBe(true);
    });

    it("returns false when ADMIN_MODE is false and no token is present", () => {
      vi.stubEnv("ADMIN_MODE", "false");
      setAuthToken(null);
      expect(isUserAdmin()).toBe(false);
    });

    it("returns true when token contains boolean admin claim", () => {
      vi.stubEnv("ADMIN_MODE", "false");
      setAuthToken(makeTestJwt({ sub: "user-1", admin: true }));
      expect(isUserAdmin()).toBe(true);
    });

    it("returns true when token contains role 'admin'", () => {
      vi.stubEnv("ADMIN_MODE", "false");
      setAuthToken(makeTestJwt({ sub: "user-2", role: "admin" }));
      expect(isUserAdmin()).toBe(true);
    });

    it("handles case-insensitive role claims like 'Admin' and 'ADMIN'", () => {
      vi.stubEnv("ADMIN_MODE", "false");
      setAuthToken(makeTestJwt({ sub: "user-admin-title", role: "Admin" }));
      expect(isUserAdmin()).toBe(true);

      setAuthToken(makeTestJwt({ sub: "user-admin-upper", role: "ADMIN" }));
      expect(isUserAdmin()).toBe(true);

      setAuthToken(makeTestJwt({ sub: "user-roles-title", roles: ["Viewer", "Admin"] }));
      expect(isUserAdmin()).toBe(true);

      setAuthToken(makeTestJwt({ sub: "user-roles-upper", roles: ["ADMIN"] }));
      expect(isUserAdmin()).toBe(true);
    });

    it("correctly decodes unpadded Base64URL tokens requiring padding", () => {
      vi.stubEnv("ADMIN_MODE", "false");
      // Craft payloads whose base64 string length modulo 4 are 2 and 3
      const payloadPad2 = { sub: "pad2", a: "x", admin: true }; // test padding
      const tokenPad2 = makeTestJwt(payloadPad2);
      const b64Part = tokenPad2.split(".")[1]!;
      expect(b64Part.length % 4).not.toBe(0);
      setAuthToken(tokenPad2);
      expect(isUserAdmin()).toBe(true);
    });

    it("safely returns false when token payload parses to a primitive or null", () => {
      vi.stubEnv("ADMIN_MODE", "false");
      setAuthToken(makeTestJwt(null));
      expect(isUserAdmin()).toBe(false);

      setAuthToken(makeTestJwt(12345));
      expect(isUserAdmin()).toBe(false);

      setAuthToken(makeTestJwt("just-a-string"));
      expect(isUserAdmin()).toBe(false);
    });

    it("returns true when token contains roles array containing 'admin'", () => {
      vi.stubEnv("ADMIN_MODE", "false");
      setAuthToken(makeTestJwt({ sub: "user-3", roles: ["viewer", "admin"] }));
      expect(isUserAdmin()).toBe(true);
    });

    it("returns false when token contains regular user role", () => {
      vi.stubEnv("ADMIN_MODE", "false");
      setAuthToken(makeTestJwt({ sub: "user-4", role: "user" }));
      expect(isUserAdmin()).toBe(false);
    });

    it("returns false when token is malformed", () => {
      vi.stubEnv("ADMIN_MODE", "false");
      setAuthToken("not.a.valid.jwt");
      expect(isUserAdmin()).toBe(false);
    });
  });
});
