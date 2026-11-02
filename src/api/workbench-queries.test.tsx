import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { api } from "./client";
import {
  fetchBranch,
  fetchBranchVersions,
  fetchPresets,
  fetchTemplates,
  updateBranch,
  updateBranchActiveVersion,
  syncBranch,
  useBranch,
  useUpdateBranch,
} from "./workbench-queries";
import type { components } from "./schema";

type Branch = components["schemas"]["Branch"];
type BranchVersion = components["schemas"]["BranchVersion"];
type Preset = components["schemas"]["Preset"];
type TemplateSet = components["schemas"]["TemplateSet"];

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, Wrapper };
}

describe("workbench-queries", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchBranch", () => {
    it("calls GET /branches/{id} and returns branch data", async () => {
      const mockBranch: Branch = {
        id: "b-1",
        user_id: "u-1",
        name: "Backend Engineer",
        target_role: "Staff Engineer",
        target_company: "Stripe",
        template_set_id: "tpl-default",
        is_stale: false,
      };

      vi.spyOn(api, "GET").mockResolvedValueOnce({
        data: mockBranch,
        error: undefined,
        response: new Response(),
      } as never);

      const result = await fetchBranch("b-1");

      expect(api.GET).toHaveBeenCalledWith("/branches/{id}", {
        params: { path: { id: "b-1" } },
      });
      expect(result).toEqual(mockBranch);
    });

    it("throws an error when branch not found", async () => {
      vi.spyOn(api, "GET").mockResolvedValueOnce({
        data: undefined,
        error: { error: { code: "NOT_FOUND", message: "Branch not found" } },
        response: new Response("", { status: 404 }),
      } as never);

      await expect(fetchBranch("b-missing")).rejects.toThrow("Branch not found");
    });
  });

  describe("fetchBranchVersions", () => {
    it("calls GET /branches/{id}/versions and returns array", async () => {
      const mockVersions: BranchVersion[] = [
        {
          id: "v-1",
          branch_id: "b-1",
          version_number: 1,
          status: "completed",
        },
      ];

      vi.spyOn(api, "GET").mockResolvedValueOnce({
        data: mockVersions,
        error: undefined,
        response: new Response(),
      } as never);

      const result = await fetchBranchVersions("b-1");

      expect(api.GET).toHaveBeenCalledWith("/branches/{id}/versions", {
        params: { path: { id: "b-1" } },
      });
      expect(result).toEqual(mockVersions);
    });
  });

  describe("fetchPresets and fetchTemplates", () => {
    it("calls GET /presets", async () => {
      const mockPresets: Preset[] = [
        {
          id: "p-1",
          user_id: "u-1",
          name: "Standard ATS",
          system_instructions: "ATS focus",
          template_set_id: "tpl-1",
        },
      ];

      vi.spyOn(api, "GET").mockResolvedValueOnce({
        data: mockPresets,
        error: undefined,
        response: new Response(),
      } as never);

      const result = await fetchPresets();
      expect(api.GET).toHaveBeenCalledWith("/presets");
      expect(result).toEqual(mockPresets);
    });

    it("calls GET /templates", async () => {
      const mockTemplates: TemplateSet[] = [
        {
          id: "tpl-1",
          user_id: "u-1",
          name: "Modern Executive",
          description: "Clean modern design",
          html_template: "<div></div>",
          markdown_template: "# Resume",
          text_template: "Resume",
        },
      ];

      vi.spyOn(api, "GET").mockResolvedValueOnce({
        data: mockTemplates,
        error: undefined,
        response: new Response(),
      } as never);

      const result = await fetchTemplates();
      expect(api.GET).toHaveBeenCalledWith("/templates");
      expect(result).toEqual(mockTemplates);
    });
  });

  describe("updateBranch and updateBranchActiveVersion", () => {
    it("calls PUT /branches/{id} with general payload", async () => {
      const mockUpdated: Branch = {
        id: "b-1",
        user_id: "u-1",
        name: "Backend",
        template_set_id: "tpl-custom",
        preset_id: "preset-custom",
        target_requirements: "Expert in Go and React",
        branch_instructions: "Focus on distributed systems",
      };

      vi.spyOn(api, "PUT").mockResolvedValueOnce({
        data: mockUpdated,
        error: undefined,
        response: new Response(),
      } as never);

      const result = await updateBranch("b-1", {
        preset_id: "preset-custom",
        template_set_id: "tpl-custom",
        target_requirements: "Expert in Go and React",
        branch_instructions: "Focus on distributed systems",
      });

      expect(api.PUT).toHaveBeenCalledWith("/branches/{id}", {
        params: { path: { id: "b-1" } },
        body: {
          preset_id: "preset-custom",
          template_set_id: "tpl-custom",
          target_requirements: "Expert in Go and React",
          branch_instructions: "Focus on distributed systems",
        },
      });
      expect(result).toEqual(mockUpdated);
    });

    it("calls PUT /branches/{id} with active_version_id", async () => {
      const mockUpdated: Branch = {
        id: "b-1",
        user_id: "u-1",
        name: "Backend",
        template_set_id: "tpl-1",
        active_version_id: "v-2",
      };

      vi.spyOn(api, "PUT").mockResolvedValueOnce({
        data: mockUpdated,
        error: undefined,
        response: new Response(),
      } as never);

      const result = await updateBranchActiveVersion("b-1", "v-2");

      expect(api.PUT).toHaveBeenCalledWith("/branches/{id}", {
        params: { path: { id: "b-1" } },
        body: { active_version_id: "v-2" },
      });
      expect(result).toEqual(mockUpdated);
    });
  });

  describe("syncBranch", () => {
    it("calls POST /branches/sync with branch_ids", async () => {
      const mockResponse = {
        enqueued_count: 1,
        version_ids: ["v-new"],
      };

      vi.spyOn(api, "POST").mockResolvedValueOnce({
        data: mockResponse,
        error: undefined,
        response: new Response(),
      } as never);

      const result = await syncBranch("b-1");

      expect(api.POST).toHaveBeenCalledWith("/branches/sync", {
        body: { branch_ids: ["b-1"] },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("Hooks integration", () => {
    it("useBranch fetches branch data", async () => {
      const { Wrapper } = createTestWrapper();

      const mockBranch: Branch = {
        id: "b-1",
        user_id: "u-1",
        name: "Backend Engineer",
        template_set_id: "tpl-1",
      };

      vi.spyOn(api, "GET").mockResolvedValueOnce({
        data: mockBranch,
        error: undefined,
        response: new Response(),
      } as never);

      const { result } = renderHook(() => useBranch("b-1"), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.name).toBe("Backend Engineer");
    });
    it("useUpdateBranch updates branch state", async () => {
      const { Wrapper } = createTestWrapper();

      const mockBranch: Branch = {
        id: "b-1",
        user_id: "u-1",
        name: "Backend Engineer",
        template_set_id: "tpl-custom",
        preset_id: "preset-custom",
      };

      vi.spyOn(api, "PUT").mockResolvedValueOnce({
        data: mockBranch,
        error: undefined,
        response: new Response(),
      } as never);

      const { result } = renderHook(() => useUpdateBranch("b-1"), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync({ preset_id: "preset-custom" });

      expect(api.PUT).toHaveBeenCalledWith("/branches/{id}", {
        params: { path: { id: "b-1" } },
        body: { preset_id: "preset-custom" },
      });
    });
  });
});
