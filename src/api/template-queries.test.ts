import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  isBuiltInTemplate,
  BUILTIN_TEMPLATE_IDS,
  buildTemplateMutationError,
  useTemplatePreview,
  useRenderTemplatePreview,
} from "./template-queries";
import { api } from "./client";

vi.mock("./client", () => ({
  API_BASE_URL: "/api/v1",
  api: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("Template Queries & Immutability Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("recognizes all canonical built-in template IDs from renderer defaults", () => {
    expect(BUILTIN_TEMPLATE_IDS).toContain("builtin-standard-clean");
    expect(BUILTIN_TEMPLATE_IDS).toContain("builtin-detailed-immigration-cv");
    expect(BUILTIN_TEMPLATE_IDS).toContain("builtin-ats-minimal-txt");
    expect(BUILTIN_TEMPLATE_IDS).toContain("builtin-ats-hybrid-tech");
    expect(BUILTIN_TEMPLATE_IDS).toContain("builtin-ats-executive-clean");
  });

  it("determines built-in status defensively using backend fields and IDs", () => {
    // Backend is_built_in flag
    expect(
      isBuiltInTemplate({
        id: "custom-id-with-flag",
        is_built_in: true,
      })
    ).toBe(true);

    // Backend user_id = "system"
    expect(
      isBuiltInTemplate({
        id: "sys-template-1",
        user_id: "system",
      })
    ).toBe(true);

    // Canonical builtin- prefix ID
    expect(
      isBuiltInTemplate({
        id: "builtin-ats-minimal-txt",
        is_built_in: false,
      })
    ).toBe(true);

    // Regular custom user template
    expect(
      isBuiltInTemplate({
        id: "tmpl-42-custom",
        user_id: "user-123",
        is_built_in: false,
      })
    ).toBe(false);

    // Missing optional flags
    expect(
      isBuiltInTemplate({
        id: "my-custom-template",
      })
    ).toBe(false);
  });

  describe("buildTemplateMutationError", () => {
    it("extracts details and code from structured backend error response", () => {
      const apiError = {
        error: {
          code: "TEMPLATE_SYNTAX_ERROR",
          message: "Validation failed",
          details: "template: :1: function 'unknown' not defined",
        },
      };

      const err = buildTemplateMutationError(apiError, "Fallback error");
      expect(err.message).toBe("template: :1: function 'unknown' not defined");
      expect(err.code).toBe("TEMPLATE_SYNTAX_ERROR");
      expect(err.details).toBe("template: :1: function 'unknown' not defined");
    });

    it("falls back to error message if details is missing", () => {
      const apiError = {
        error: {
          code: "NOT_FOUND",
          message: "Template not found",
        },
      };

      const err = buildTemplateMutationError(apiError, "Fallback error");
      expect(err.message).toBe("Template not found");
      expect(err.code).toBe("NOT_FOUND");
      expect(err.details).toBeUndefined();
    });

    it("uses fallbackMessage when error payload is empty or invalid", () => {
      const err = buildTemplateMutationError(null, "Server communication failed");
      expect(err.message).toBe("Server communication failed");
      expect(err.code).toBeUndefined();
      expect(err.details).toBeUndefined();
    });
  });

  describe("useTemplatePreview hook", () => {
    it("fetches server-rendered template preview successfully", async () => {
      const mockPreview = {
        html: "<h1>Jane Doe</h1>",
        markdown: "# Jane Doe",
        plain_text: "Jane Doe",
      };

      vi.mocked(api.GET).mockResolvedValueOnce({
        data: mockPreview,
        error: undefined,
        response: new Response(null, { status: 200 }),
      } as unknown as Awaited<ReturnType<typeof api.GET>>);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useTemplatePreview("tmpl-123"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockPreview);
      expect(api.GET).toHaveBeenCalledWith("/templates/{id}/preview", {
        params: { path: { id: "tmpl-123" } },
      });
    });

    it("does not fetch when id is missing or equals 'new'", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useTemplatePreview("new"), { wrapper });
      expect(result.current.fetchStatus).toBe("idle");
      expect(api.GET).not.toHaveBeenCalled();
    });
  });

  describe("useRenderTemplatePreview mutation", () => {
    it("submits draft template to /templates/preview and returns rendered outputs", async () => {
      const mockResult = {
        html: "<div>Draft Output</div>",
        markdown: "Draft Output",
        plain_text: "Draft Output",
      };

      vi.mocked(api.POST).mockResolvedValueOnce({
        data: mockResult,
        error: undefined,
        response: new Response(null, { status: 200 }),
      } as unknown as Awaited<ReturnType<typeof api.POST>>);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useRenderTemplatePreview(), { wrapper });

      const payload = {
        html_template: "<div>{{.FullName}}</div>",
        css_styles: "div { color: red; }",
      };

      let mutationRes;
      await waitFor(async () => {
        mutationRes = await result.current.mutateAsync(payload);
      });

      expect(mutationRes).toEqual(mockResult);
      expect(api.POST).toHaveBeenCalledWith("/templates/preview", {
        body: payload,
      });
    });
  });
});
