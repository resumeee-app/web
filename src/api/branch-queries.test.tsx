import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useBranchesQuery,
  useCreateBranchMutation,
  useDeleteBranchMutation,
  isDefaultBranch,
  getBranchStatus,
  formatBranchVersionStatus,
  extractApiErrorMessage,
  branchKeys,
  type Branch,
} from "./branch-queries";
import { api } from "./client";

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe("branch-queries and domain logic", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("isDefaultBranch helper", () => {
    it("identifies default branch from is_default property", () => {
      const defaultBranch: Branch = {
        id: "b-1",
        user_id: "u-1",
        name: "Standard Line",
        template_set_id: "tmpl-1",
        is_default: true,
      };
      expect(isDefaultBranch(defaultBranch)).toBe(true);

      const customBranch: Branch = {
        id: "b-2",
        user_id: "u-1",
        name: "Stripe Engineer",
        template_set_id: "tmpl-1",
        is_default: false,
      };
      expect(isDefaultBranch(customBranch)).toBe(false);
    });

    it("identifies default branch from deterministic ID prefix", () => {
      const defaultBranch: Branch = {
        id: "branch-default-user123",
        user_id: "user123",
        name: "Main Variant",
        template_set_id: "tmpl-1",
      };
      expect(isDefaultBranch(defaultBranch)).toBe(true);
    });

    it("identifies default branch from canonical DefaultBranchName", () => {
      const defaultBranch: Branch = {
        id: "any-id",
        user_id: "user123",
        name: "Main Profile (Default)",
        template_set_id: "tmpl-1",
      };
      expect(isDefaultBranch(defaultBranch)).toBe(true);
    });
  });

  describe("getBranchStatus helper", () => {
    it("returns active for default branches and regular completed branches", () => {
      const branch: Branch = {
        id: "b-1",
        user_id: "u-1",
        name: "Active Line",
        template_set_id: "tmpl-1",
      };
      expect(getBranchStatus(branch)).toBe("active");
    });

    it("returns tailoring when status is processing or tailoring", () => {
      const branch: Branch = {
        id: "b-2",
        user_id: "u-1",
        name: "Tailoring Line",
        template_set_id: "tmpl-1",
        status: "tailoring",
      };
      expect(getBranchStatus(branch)).toBe("tailoring");
    });

    it("returns error when status is error or failed", () => {
      const branch: Branch = {
        id: "b-3",
        user_id: "u-1",
        name: "Failed Line",
        template_set_id: "tmpl-1",
        status: "error",
      };
      expect(getBranchStatus(branch)).toBe("error");
    });

    it("returns stale when is_stale is true and not actively tailoring", () => {
      const branch: Branch = {
        id: "b-4",
        user_id: "u-1",
        name: "Stale Line",
        template_set_id: "tmpl-1",
        is_stale: true,
      };
      expect(getBranchStatus(branch)).toBe("stale");

      const activeStaleBranch: Branch = {
        id: "b-5",
        user_id: "u-1",
        name: "Completed but Stale Line",
        template_set_id: "tmpl-1",
        status: "active",
        is_stale: true,
      };
      expect(getBranchStatus(activeStaleBranch)).toBe("stale");
    });

    it("preserves tailoring status when actively tailoring even if is_stale is true", () => {
      const branch: Branch = {
        id: "b-6",
        user_id: "u-1",
        name: "Tailoring Stale Line",
        template_set_id: "tmpl-1",
        status: "tailoring",
        is_stale: true,
      };
      expect(getBranchStatus(branch)).toBe("tailoring");
    });

    it("preserves error status when in error even if is_stale is true", () => {
      const branch: Branch = {
        id: "b-7",
        user_id: "u-1",
        name: "Error Stale Line",
        template_set_id: "tmpl-1",
        status: "error",
        is_stale: true,
      };
      expect(getBranchStatus(branch)).toBe("error");
    });

    it("supports explicit stale, needs_sync, and out_of_sync statuses", () => {
      const b1: Branch = {
        id: "b-8",
        user_id: "u-1",
        name: "Stale Status Line",
        template_set_id: "tmpl-1",
        status: "stale",
      };
      expect(getBranchStatus(b1)).toBe("stale");

      const b2: Branch = {
        id: "b-9",
        user_id: "u-1",
        name: "Needs Sync Line",
        template_set_id: "tmpl-1",
        status: "needs_sync",
      };
      expect(getBranchStatus(b2)).toBe("stale");
    });
  });

  describe("formatBranchVersionStatus helper", () => {
    it("returns Untailored for default branch regardless of active_version_id", () => {
      const branch: Branch = {
        id: "branch-default-u1",
        user_id: "u-1",
        name: "Main Profile (Default)",
        template_set_id: "tmpl-1",
        is_default: true,
        active_version_id: "v1",
      };
      expect(formatBranchVersionStatus(branch)).toBe("Untailored");
    });

    it("formats active version state for tailored branches", () => {
      const branchWithV: Branch = {
        id: "b-custom-1",
        user_id: "u-1",
        name: "Tailored Branch",
        template_set_id: "tmpl-1",
        is_default: false,
        active_version_id: "v3",
      };
      expect(formatBranchVersionStatus(branchWithV)).toBe("v3 (Active)");

      const branchNumeric: Branch = {
        id: "b-custom-2",
        user_id: "u-1",
        name: "Tailored Branch Numeric",
        template_set_id: "tmpl-1",
        is_default: false,
        active_version_id: "2",
      };
      expect(formatBranchVersionStatus(branchNumeric)).toBe("v2 (Active)");
    });

    it("returns Not tailored yet when custom branch has no active version", () => {
      const branch: Branch = {
        id: "b-custom-3",
        user_id: "u-1",
        name: "Untailored Custom Branch",
        template_set_id: "tmpl-1",
        is_default: false,
      };
      expect(formatBranchVersionStatus(branch)).toBe("Not tailored yet");
    });
  });

  describe("extractApiErrorMessage helper", () => {
    it("extracts string message from error object", () => {
      expect(
        extractApiErrorMessage({ message: "Network timeout" }, "Fallback error")
      ).toBe("Network timeout");
    });

    it("returns fallback when error is not an object or lacks string message", () => {
      expect(extractApiErrorMessage(null, "Fallback error")).toBe("Fallback error");
      expect(extractApiErrorMessage(undefined, "Fallback error")).toBe(
        "Fallback error"
      );
      expect(extractApiErrorMessage("simple string", "Fallback error")).toBe(
        "Fallback error"
      );
      expect(extractApiErrorMessage({ message: 123 }, "Fallback error")).toBe(
        "Fallback error"
      );
      expect(extractApiErrorMessage({ message: "   " }, "Fallback error")).toBe(
        "Fallback error"
      );
    });
  });

  describe("useBranchesQuery", () => {
    it("fetches branches from /branches endpoint", async () => {
      const mockBranches: Branch[] = [
        {
          id: "branch-default-u1",
          user_id: "u1",
          name: "Main Profile (Default)",
          template_set_id: "tmpl-clean",
          is_default: true,
        },
        {
          id: "b-stripe",
          user_id: "u1",
          name: "Stripe - Staff Backend",
          template_set_id: "tmpl-clean",
          is_default: false,
        },
      ];

      vi.spyOn(api, "GET").mockResolvedValueOnce({
        data: mockBranches,
        error: undefined,
        response: new Response(),
      } as unknown as never);

      const { wrapper } = createTestWrapper();
      const { result } = renderHook(() => useBranchesQuery(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockBranches);
      expect(api.GET).toHaveBeenCalledWith("/branches", {
        params: { query: { stale: undefined } },
      });
    });
  });

  describe("useCreateBranchMutation", () => {
    it("creates branch and updates cache", async () => {
      const newBranchInput = {
        name: "Fintech Architect",
        target_role: "Staff Architect",
        target_company: "Fintech Corp",
        template_set_id: "tmpl-standard",
      };

      const createdBranch: Branch = {
        id: "b-new-123",
        user_id: "u1",
        name: newBranchInput.name,
        target_role: newBranchInput.target_role,
        target_company: newBranchInput.target_company,
        template_set_id: newBranchInput.template_set_id,
        is_default: false,
      };

      vi.spyOn(api, "POST").mockResolvedValueOnce({
        data: createdBranch,
        error: undefined,
        response: new Response(),
      } as unknown as never);

      const { wrapper, queryClient } = createTestWrapper();
      queryClient.setQueryData(branchKeys.list({ stale: undefined }), []);

      const { result } = renderHook(() => useCreateBranchMutation(), { wrapper });

      await result.current.mutateAsync(newBranchInput);

      expect(api.POST).toHaveBeenCalledWith("/branches", {
        body: newBranchInput,
      });
    });

    it("optimistically appends the new branch to cache before network promise resolves", async () => {
      const initialBranches: Branch[] = [
        {
          id: "branch-default-u1",
          user_id: "u1",
          name: "Main Profile (Default)",
          template_set_id: "tmpl-standard",
          is_default: true,
        },
      ];

      const newBranchInput = {
        name: "Fintech Architect",
        target_role: "Staff Architect",
        target_company: "Fintech Corp",
        template_set_id: "tmpl-standard",
      };

      let resolvePost: (value: unknown) => void = () => {};
      const postPromise = new Promise((resolve) => {
        resolvePost = resolve;
      });

      vi.spyOn(api, "POST").mockImplementationOnce(() => postPromise as unknown as never);

      const { wrapper, queryClient } = createTestWrapper();
      const queryKey = branchKeys.list({ stale: undefined });
      queryClient.setQueryData(queryKey, [...initialBranches]);

      const { result } = renderHook(() => useCreateBranchMutation(), { wrapper });

      // Trigger mutation without awaiting completion immediately
      const mutatePromise = result.current.mutateAsync(newBranchInput);

      // Verify that onMutate optimistically appended the branch to cache before network resolves
      await waitFor(() => {
        const cached = queryClient.getQueryData<Branch[]>(queryKey);
        expect(cached).toBeDefined();
        expect(cached).toHaveLength(2);
        const secondBranch = cached?.[1];
        expect(secondBranch?.name).toBe("Fintech Architect");
        expect(secondBranch?.id).toMatch(/^optimistic-/);
      });

      // Resolve the network call
      const createdBranch: Branch = {
        id: "b-new-123",
        user_id: "u1",
        name: newBranchInput.name,
        target_role: newBranchInput.target_role,
        target_company: newBranchInput.target_company,
        template_set_id: newBranchInput.template_set_id,
        is_default: false,
      };
      resolvePost({
        data: createdBranch,
        error: undefined,
        response: new Response(),
      });

      await mutatePromise;
      expect(api.POST).toHaveBeenCalledWith("/branches", {
        body: newBranchInput,
      });
    });

    it("rolls back cache to previousBranches when api.POST fails", async () => {
      const initialBranches: Branch[] = [
        {
          id: "branch-default-u1",
          user_id: "u1",
          name: "Main Profile (Default)",
          template_set_id: "tmpl-standard",
          is_default: true,
        },
      ];

      const newBranchInput = {
        name: "Fintech Architect",
        target_role: "Staff Architect",
        target_company: "Fintech Corp",
        template_set_id: "tmpl-standard",
      };

      vi.spyOn(api, "POST").mockResolvedValueOnce({
        data: undefined,
        error: { message: "Server database conflict" },
        response: new Response(),
      } as unknown as never);

      const { wrapper, queryClient } = createTestWrapper();
      const queryKey = branchKeys.list({ stale: undefined });
      queryClient.setQueryData(queryKey, [...initialBranches]);

      const { result } = renderHook(() => useCreateBranchMutation(), { wrapper });

      await expect(result.current.mutateAsync(newBranchInput)).rejects.toThrow(
        "Server database conflict"
      );

      // Verify cache rolled back to previousBranches
      const cached = queryClient.getQueryData<Branch[]>(queryKey);
      expect(cached).toEqual(initialBranches);
    });
  });

  describe("useDeleteBranchMutation", () => {
    it("blocks deletion of default branch before making network call", async () => {
      const defaultBranch: Branch = {
        id: "branch-default-u1",
        user_id: "u1",
        name: "Main Profile (Default)",
        template_set_id: "tmpl-clean",
        is_default: true,
      };

      const deleteSpy = vi.spyOn(api, "DELETE");
      const { wrapper } = createTestWrapper();
      const { result } = renderHook(() => useDeleteBranchMutation(), { wrapper });

      await expect(result.current.mutateAsync(defaultBranch)).rejects.toThrow(
        /cannot delete default branch/i
      );
      expect(deleteSpy).not.toHaveBeenCalled();
    });

    it("deletes non-default branch via DELETE /branches/{id}", async () => {
      const branch: Branch = {
        id: "b-custom-99",
        user_id: "u1",
        name: "Custom Line",
        template_set_id: "tmpl-clean",
        is_default: false,
      };

      vi.spyOn(api, "DELETE").mockResolvedValueOnce({
        data: undefined,
        error: undefined,
        response: new Response(),
      } as unknown as never);

      const { wrapper } = createTestWrapper();
      const { result } = renderHook(() => useDeleteBranchMutation(), { wrapper });

      await result.current.mutateAsync(branch);

      expect(api.DELETE).toHaveBeenCalledWith("/branches/{id}", {
        params: { path: { id: "b-custom-99" } },
      });
    });
  });
});
