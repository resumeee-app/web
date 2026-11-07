import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useBranch,
  useBranchVersions,
  useBranchVersion,
  useBranchVersionPreview,
  useFullProfile,
  getBranchVersionExportUrl,
  getBranchVersionPreviewUrl,
} from "./render-queries";
import { api } from "./client";

vi.mock("./client", () => ({
  API_BASE_URL: "/api/v1",
  api: {
    GET: vi.fn(),
  },
}));

function mockApiResponse<T>(data?: T, error?: unknown, status = 200) {
  return {
    data,
    error,
    response: new Response(null, { status }),
  } as unknown as Awaited<ReturnType<typeof api.GET>>;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("render-queries API hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getBranchVersionExportUrl", () => {
    it("constructs valid export URL with default html format", () => {
      const url = getBranchVersionExportUrl("branch-123", "v1");
      expect(url).toBe("/api/v1/branches/branch-123/versions/v1/export?format=html");
    });

    it("constructs export URL with specified format", () => {
      const urlText = getBranchVersionExportUrl("branch-123", "v2", "text");
      expect(urlText).toBe("/api/v1/branches/branch-123/versions/v2/export?format=text");

      const urlMarkdown = getBranchVersionExportUrl("branch-123", "v2", "markdown");
      expect(urlMarkdown).toBe("/api/v1/branches/branch-123/versions/v2/export?format=markdown");
    });
  });

  describe("getBranchVersionPreviewUrl", () => {
    it("constructs valid preview URL with default html format", () => {
      const url = getBranchVersionPreviewUrl("branch-123", "v1");
      expect(url).toBe("/api/v1/branches/branch-123/versions/v1/preview?format=html");
    });

    it("constructs preview URL with specified format", () => {
      const urlText = getBranchVersionPreviewUrl("branch-123", "v2", "text");
      expect(urlText).toBe("/api/v1/branches/branch-123/versions/v2/preview?format=text");

      const urlMarkdown = getBranchVersionPreviewUrl("branch-123", "v2", "markdown");
      expect(urlMarkdown).toBe("/api/v1/branches/branch-123/versions/v2/preview?format=markdown");
    });
  });

  describe("useBranch", () => {
    it("fetches branch details successfully", async () => {
      const mockBranch = {
        id: "branch-1",
        user_id: "user-1",
        name: "Frontend Engineer",
        template_set_id: "tmpl-1",
        active_version_id: "ver-1",
      };

      vi.mocked(api.GET).mockResolvedValueOnce(mockApiResponse(mockBranch));

      const { result } = renderHook(() => useBranch("branch-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockBranch);
      expect(api.GET).toHaveBeenCalledWith("/branches/{id}", {
        params: { path: { id: "branch-1" } },
      });
    });

    it("handles error when branch fetch fails", async () => {
      vi.mocked(api.GET).mockResolvedValueOnce(
        mockApiResponse(undefined, { message: "Branch not found" }, 404)
      );

      const { result } = renderHook(() => useBranch("invalid-id"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toMatch(/Branch not found/);
    });
  });

  describe("useBranchVersions", () => {
    it("fetches versions list for a branch", async () => {
      const mockVersions = [
        { id: "ver-1", branch_id: "b-1", version_number: 1, status: "completed" as const },
        { id: "ver-2", branch_id: "b-1", version_number: 2, status: "completed" as const },
      ];

      vi.mocked(api.GET).mockResolvedValueOnce(mockApiResponse(mockVersions));

      const { result } = renderHook(() => useBranchVersions("b-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockVersions);
      expect(api.GET).toHaveBeenCalledWith("/branches/{id}/versions", {
        params: { path: { id: "b-1" } },
      });
    });
  });

  describe("useBranchVersion", () => {
    it("fetches specific version details with outputs", async () => {
      const mockVersion = {
        id: "ver-1",
        branch_id: "b-1",
        version_number: 1,
        status: "completed" as const,
        html_output: "<html>Resume</html>",
        plain_text_output: "Resume text",
      };

      vi.mocked(api.GET).mockResolvedValueOnce(mockApiResponse(mockVersion));

      const { result } = renderHook(() => useBranchVersion("b-1", "1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockVersion);
      expect(api.GET).toHaveBeenCalledWith("/branches/{id}/versions/{v}", {
        params: { path: { id: "b-1", v: "1" } },
      });
    });
  });

  describe("useFullProfile", () => {
    it("fetches full master profile snapshot", async () => {
      const mockSnapshot = {
        profile: {
          id: "p-1",
          user_id: "u-1",
          full_name: "Jane Doe",
          master_revision: 5,
          default_provider: "anthropic",
          default_model: "claude-3-5-sonnet",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        master_revision: 5,
        exported_at: "2026-11-01T00:00:00Z",
        skills: [{ id: "s-1", user_id: "u-1", name: "TypeScript" }],
        experiences: [],
      };

      vi.mocked(api.GET).mockResolvedValueOnce(mockApiResponse(mockSnapshot));

      const { result } = renderHook(() => useFullProfile(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockSnapshot);
      expect(api.GET).toHaveBeenCalledWith("/profile/full", {});
    });
  });

  describe("useBranchVersionPreview", () => {
    it("fetches rendered resume output for a specific branch version", async () => {
      const mockRender = {
        html: "<h1>Branch Resume</h1>",
        markdown: "# Branch Resume",
        plain_text: "Branch Resume",
      };

      vi.mocked(api.GET).mockResolvedValueOnce(mockApiResponse(mockRender));

      const { result } = renderHook(
        () => useBranchVersionPreview("branch-123", 2),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockRender);
      expect(api.GET).toHaveBeenCalledWith("/branches/{id}/versions/{v}/preview", {
        params: { path: { id: "branch-123", v: "2" } },
      });
    });

    it("fetches rendered resume output with templateSetId override", async () => {
      const mockRender = {
        html: "<h1>Dynamic Resume</h1>",
        markdown: "# Dynamic Resume",
        plain_text: "Dynamic Resume",
      };

      vi.mocked(api.GET).mockResolvedValueOnce(mockApiResponse(mockRender));

      const { result } = renderHook(
        () => useBranchVersionPreview("branch-123", 2, "tmpl-modern"),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockRender);
      expect(api.GET).toHaveBeenCalledWith("/branches/{id}/versions/{v}/preview", {
        params: {
          path: { id: "branch-123", v: "2" },
          query: { template_set_id: "tmpl-modern" },
        },
      });
    });
  });
});
