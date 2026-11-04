import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useFullProfile,
  useUpdateProfile,
  useParsePDFResume,
  useCommitPDFResume,
  validatePDFFile,
  MAX_PDF_SIZE_BYTES,
  PROFILE_FULL_QUERY_KEY,
  type JSONResume,
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

  describe("validatePDFFile", () => {
    it("returns null for a valid PDF file under 10MB", () => {
      const valid = new File(["%PDF-1.4 sample"], "resume.pdf", {
        type: "application/pdf",
      });
      expect(validatePDFFile(valid)).toBeNull();
    });

    it("rejects non-PDF files", () => {
      const docx = new File(["dummy"], "resume.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      expect(validatePDFFile(docx)).toBe("Only PDF files are supported");
    });

    it("rejects 0-byte empty files", () => {
      const empty = new File([], "empty.pdf", { type: "application/pdf" });
      expect(validatePDFFile(empty)).toBe("The selected PDF file is empty.");
    });

    it("rejects files exceeding MAX_PDF_SIZE_BYTES", () => {
      const large = new File(["x"], "large.pdf", { type: "application/pdf" });
      Object.defineProperty(large, "size", { value: MAX_PDF_SIZE_BYTES + 1 });
      expect(validatePDFFile(large)).toBe("File exceeds maximum allowed size (10MB)");
    });
  });

  describe("useParsePDFResume", () => {
    const mockParsedResume: JSONResume = {
      basics: {
        name: "Ada Lovelace",
        label: "First Programmer",
        email: "ada@example.com",
        phone: "555-0100",
        summary: "Pioneer in computing",
      },
      skills: [{ name: "Algorithmic Thinking" }],
      work: [
        {
          name: "Analytical Engine Lab",
          position: "Lead Analyst",
          startDate: "1843-01-01",
          highlights: ["Published first algorithm for Babbage Engine"],
        },
      ],
      education: [
        {
          institution: "University of London",
          studyType: "Mathematics",
        },
      ],
    };

    it("submits multipart PDF form and returns parsed JSONResume", async () => {
      vi.mocked(api.POST).mockResolvedValueOnce({
        data: mockParsedResume as unknown as Record<string, never>,
        error: undefined,
        response: new Response(),
      } as unknown as Awaited<ReturnType<typeof api.POST>>);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useParsePDFResume(), { wrapper });

      const file = new File(["fake pdf content"], "resume.pdf", {
        type: "application/pdf",
      });

      const parsed = await result.current.mutateAsync({ file });

      expect(parsed.basics.name).toBe("Ada Lovelace");
      expect(api.POST).toHaveBeenCalledWith(
        "/profile/pdf/parse",
        expect.objectContaining({
          headers: { "Content-Type": null },
        })
      );
    });

    it("passes provider and model options when supplied", async () => {
      vi.mocked(api.POST).mockResolvedValueOnce({
        data: mockParsedResume as unknown as Record<string, never>,
        error: undefined,
        response: new Response(),
      } as unknown as Awaited<ReturnType<typeof api.POST>>);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useParsePDFResume(), { wrapper });

      const file = new File(["fake pdf content"], "resume.pdf", {
        type: "application/pdf",
      });

      await result.current.mutateAsync({
        file,
        provider: "anthropic",
        model: "claude-3-7-sonnet",
      });

      expect(api.POST).toHaveBeenCalledWith(
        "/profile/pdf/parse",
        expect.objectContaining({
          body: expect.any(FormData),
        })
      );
    });

    it("rejects 0-byte files client-side without network request", async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useParsePDFResume(), { wrapper });

      const emptyFile = new File([], "empty.pdf", { type: "application/pdf" });

      await expect(
        result.current.mutateAsync({ file: emptyFile })
      ).rejects.toThrow("The selected PDF file is empty.");

      expect(api.POST).not.toHaveBeenCalled();
    });

    it("rejects files larger than 10MB client-side without network request", async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useParsePDFResume(), { wrapper });

      // Create dummy file > 10MB
      const largeFile = new File(["x"], "large.pdf", { type: "application/pdf" });
      Object.defineProperty(largeFile, "size", { value: 11 * 1024 * 1024 });

      await expect(
        result.current.mutateAsync({ file: largeFile })
      ).rejects.toThrow("File exceeds maximum allowed size (10MB)");

      expect(api.POST).not.toHaveBeenCalled();
    });

    it("rejects non-PDF files client-side without network request", async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useParsePDFResume(), { wrapper });

      const docxFile = new File(["fake docx"], "resume.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      await expect(
        result.current.mutateAsync({ file: docxFile })
      ).rejects.toThrow("Only PDF files are supported");

      expect(api.POST).not.toHaveBeenCalled();
    });

    it("propagates API error messages when parse backend fails", async () => {
      vi.mocked(api.POST).mockResolvedValueOnce({
        data: undefined,
        error: {
          error: {
            message: "LLM extraction service unavailable",
          },
        },
        response: new Response(null, { status: 503 }),
      } as unknown as Awaited<ReturnType<typeof api.POST>>);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useParsePDFResume(), { wrapper });

      const file = new File(["fake pdf content"], "resume.pdf", {
        type: "application/pdf",
      });

      await expect(result.current.mutateAsync({ file })).rejects.toThrow(
        "LLM extraction service unavailable"
      );
    });
  });

  describe("useCommitPDFResume", () => {
    const candidateResume: JSONResume = {
      basics: {
        name: "Ada Lovelace",
        email: "ada@example.com",
      },
      skills: [{ name: "Algorithms" }],
    };

    it("commits parsed candidate resume and updates TanStack cache with new snapshot", async () => {
      const updatedSnapshot: components["schemas"]["MasterProfileSnapshot"] = {
        ...mockSnapshot,
        profile: {
          ...mockSnapshot.profile,
          full_name: "Ada Lovelace",
          email: "ada@example.com",
        },
      };

      vi.mocked(api.POST).mockResolvedValueOnce({
        data: updatedSnapshot,
        error: undefined,
        response: new Response(),
      } as unknown as Awaited<ReturnType<typeof api.POST>>);

      const { queryClient, wrapper } = createWrapper();
      queryClient.setQueryData(PROFILE_FULL_QUERY_KEY, mockSnapshot);

      const { result } = renderHook(() => useCommitPDFResume(), { wrapper });

      const committed = await result.current.mutateAsync(candidateResume);

      expect(committed.profile.full_name).toBe("Ada Lovelace");
      expect(api.POST).toHaveBeenCalledWith("/profile/pdf/commit", {
        body: candidateResume,
      });

      const cached = queryClient.getQueryData<components["schemas"]["MasterProfileSnapshot"]>(
        PROFILE_FULL_QUERY_KEY
      );
      expect(cached?.profile.full_name).toBe("Ada Lovelace");
    });

    it("propagates API error messages when commit backend fails", async () => {
      vi.mocked(api.POST).mockResolvedValueOnce({
        data: undefined,
        error: {
          error: {
            message: "Invalid resume schema: missing name",
          },
        },
        response: new Response(null, { status: 400 }),
      } as unknown as Awaited<ReturnType<typeof api.POST>>);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCommitPDFResume(), { wrapper });

      await expect(
        result.current.mutateAsync(candidateResume)
      ).rejects.toThrow("Invalid resume schema: missing name");
    });
  });
});
