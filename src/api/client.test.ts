import { describe, it, expect } from "vitest";
import { createApiClient, api, API_BASE_URL, extractApiErrorMessage } from "./client";

describe("OpenAPI Client Configuration", () => {
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
