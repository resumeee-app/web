import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useFullProfile,
  useUpdateProfile,
  PROFILE_FULL_QUERY_KEY,
} from "./profile-queries";
import { api } from "./client";
import type { components } from "./schema";

vi.mock("./client", () => ({
  api: {
    GET: vi.fn(),
    PUT: vi.fn(),
    POST: vi.fn(),
    DELETE: vi.fn(),
  },
}));

const mockSnapshot: components["schemas"]["MasterProfileSnapshot"] = {
  profile: {
    id: "profile-1",
    user_id: "user-1",
    full_name: "Grace Hopper",
    headline: "Computer Scientist",
    default_provider: "gemini",
    default_model: "gemini-3.8-flash",
    master_revision: 1,
  },
  master_revision: 1,
  skills: [],
  experiences: [],
  projects: [],
  education: [],
  certifications: [],
  facts: [],
  exported_at: "2026-11-01T00:00:00Z",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

describe("profile-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches full master profile snapshot", async () => {
    vi.mocked(api.GET).mockResolvedValueOnce({
      data: mockSnapshot,
      error: undefined,
      response: new Response(),
    } as unknown as Awaited<ReturnType<typeof api.GET>>);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFullProfile(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.profile.full_name).toBe("Grace Hopper");
  });

  it("optimistically updates profile in TanStack cache during mutation", async () => {
    vi.mocked(api.PUT).mockResolvedValueOnce({
      data: {
        ...mockSnapshot.profile,
        full_name: "Rear Admiral Grace Hopper",
      },
      error: undefined,
      response: new Response(),
    } as unknown as Awaited<ReturnType<typeof api.PUT>>);

    const { queryClient, wrapper } = createWrapper();
    // Pre-populate query cache
    queryClient.setQueryData(PROFILE_FULL_QUERY_KEY, mockSnapshot);

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await result.current.mutateAsync({
      full_name: "Rear Admiral Grace Hopper",
    });

    // Check optimistic update in cache
    const cached = queryClient.getQueryData<components["schemas"]["MasterProfileSnapshot"]>(
      PROFILE_FULL_QUERY_KEY
    );
    expect(cached?.profile.full_name).toBe("Rear Admiral Grace Hopper");
  });

  it("rolls back TanStack cache to previous snapshot on mutation failure", async () => {
    vi.mocked(api.PUT).mockResolvedValueOnce({
      data: undefined,
      error: {
        code: "INTERNAL_ERROR",
        message: "Database connection failed",
      },
      response: new Response(null, { status: 500 }),
    } as unknown as Awaited<ReturnType<typeof api.PUT>>);

    const { queryClient, wrapper } = createWrapper();
    // Pre-populate query cache with initial snapshot
    queryClient.setQueryData(PROFILE_FULL_QUERY_KEY, mockSnapshot);

    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await expect(
      result.current.mutateAsync({
        full_name: "Failed Mutation Name",
      })
    ).rejects.toThrow();

    // Verify cache was rolled back to initial snapshot
    const cached = queryClient.getQueryData<components["schemas"]["MasterProfileSnapshot"]>(
      PROFILE_FULL_QUERY_KEY
    );
    expect(cached?.profile.full_name).toBe("Grace Hopper");
  });
});
