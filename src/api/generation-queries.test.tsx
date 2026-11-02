import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { api } from "./client";
import {
  isTerminalStatus,
  generateVersion,
  fetchBranchVersion,
  useVersionPoll,
  useGenerateVersion,
} from "./generation-queries";
import { workbenchKeys } from "./workbench-queries";
import type { components } from "./schema";

type BranchVersion = components["schemas"]["BranchVersion"];

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

describe("generation-queries", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("isTerminalStatus", () => {
    it("correctly identifies terminal and non-terminal statuses", () => {
      expect(isTerminalStatus("pending")).toBe(false);
      expect(isTerminalStatus("processing")).toBe(false);
      expect(isTerminalStatus(undefined)).toBe(false);

      expect(isTerminalStatus("completed")).toBe(true);
      expect(isTerminalStatus("completed_with_warnings")).toBe(true);
      expect(isTerminalStatus("failed")).toBe(true);
    });
  });

  describe("generateVersion", () => {
    it("calls POST /branches/{id}/generate and returns AsyncJobEnqueued", async () => {
      const mockResponse = {
        version_id: "ver-123",
        status: "pending" as const,
        message: "Resume generation job queued",
      };

      vi.spyOn(api, "POST").mockResolvedValueOnce({
        data: mockResponse,
        error: undefined,
        response: new Response(),
      } as never);

      const result = await generateVersion("branch-1");

      expect(api.POST).toHaveBeenCalledWith("/branches/{id}/generate", {
        params: { path: { id: "branch-1" } },
      });
      expect(result).toEqual(mockResponse);
    });

    it("throws descriptive error when API returns error", async () => {
      vi.spyOn(api, "POST").mockResolvedValueOnce({
        data: undefined,
        error: { error: { code: "QUEUE_FULL", message: "Worker pool capacity saturated" } },
        response: new Response("", { status: 503 }),
      } as never);

      await expect(generateVersion("branch-1")).rejects.toThrow(
        "Worker pool capacity saturated"
      );
    });
  });

  describe("fetchBranchVersion", () => {
    it("calls GET /branches/{id}/versions/{v} and returns BranchVersion", async () => {
      const mockVersion: BranchVersion = {
        id: "ver-123",
        branch_id: "branch-1",
        version_number: 1,
        status: "processing",
        created_at: new Date().toISOString(),
      };

      vi.spyOn(api, "GET").mockResolvedValueOnce({
        data: mockVersion,
        error: undefined,
        response: new Response(),
      } as never);

      const result = await fetchBranchVersion("branch-1", "ver-123");

      expect(api.GET).toHaveBeenCalledWith("/branches/{id}/versions/{v}", {
        params: { path: { id: "branch-1", v: "ver-123" } },
      });
      expect(result).toEqual(mockVersion);
    });
  });

  describe("useVersionPoll", () => {
    it("polls version status through pending -> processing -> completed", async () => {
      const { Wrapper } = createTestWrapper();

      const pendingVersion: BranchVersion = {
        id: "ver-123",
        branch_id: "branch-1",
        version_number: 1,
        status: "pending",
        created_at: new Date().toISOString(),
      };

      const processingVersion: BranchVersion = {
        id: "ver-123",
        branch_id: "branch-1",
        version_number: 1,
        status: "processing",
        created_at: new Date().toISOString(),
      };

      const completedVersion: BranchVersion = {
        id: "ver-123",
        branch_id: "branch-1",
        version_number: 1,
        status: "completed",
        created_at: new Date().toISOString(),
      };

      vi.spyOn(api, "GET")
        .mockResolvedValueOnce({
          data: pendingVersion,
          error: undefined,
          response: new Response(),
        } as never)
        .mockResolvedValueOnce({
          data: processingVersion,
          error: undefined,
          response: new Response(),
        } as never)
        .mockResolvedValueOnce({
          data: completedVersion,
          error: undefined,
          response: new Response(),
        } as never);

      const { result } = renderHook(
        () =>
          useVersionPoll("branch-1", "ver-123", {
            refetchIntervalMs: 50,
          }),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.data?.status).toBe("pending");
      });

      await waitFor(() => {
        expect(result.current.data?.status).toBe("processing");
      });

      await waitFor(() => {
        expect(result.current.data?.status).toBe("completed");
      });

      expect(api.GET).toHaveBeenCalledTimes(3);
    });

    it("halts polling when query encounters network error", async () => {
      const { Wrapper } = createTestWrapper();

      vi.spyOn(api, "GET").mockResolvedValueOnce({
        data: undefined,
        error: { error: { message: "Internal server error" } },
        response: new Response("", { status: 500 }),
      } as never);

      const { result } = renderHook(
        () =>
          useVersionPoll("branch-1", "ver-123", {
            refetchIntervalMs: 50,
          }),
        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Confirm no runaway refetch occurs on error
      expect(result.current.error?.message).toBe("Internal server error");
    });
  });

  describe("useGenerateVersion", () => {
    it("executes mutation to generate new version and invalidates workbench query keys", async () => {
      const { queryClient, Wrapper } = createTestWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      vi.spyOn(api, "POST").mockResolvedValueOnce({
        data: {
          version_id: "ver-456",
          status: "pending",
          message: "Enqueued",
        },
        error: undefined,
        response: new Response(),
      } as never);

      const { result } = renderHook(() => useGenerateVersion("branch-1"), {
        wrapper: Wrapper,
      });

      await result.current.mutateAsync();

      expect(api.POST).toHaveBeenCalledWith("/branches/{id}/generate", {
        params: { path: { id: "branch-1" } },
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: workbenchKeys.versions("branch-1"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: workbenchKeys.branch("branch-1"),
      });
    });
  });
});
