import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useFullProfile,
  useUpdateProfile,
  useParsePDFResume,
  useCommitPDFResume,
  useImportJSONResume,
  validatePDFFile,
  validateJSONResumeFile,
  parseJSONResumeText,
  pollPDFParseJobUntilFinished,
  fetchPDFParseJob,
  MAX_PDF_SIZE_BYTES,
  MAX_JSON_RESUME_SIZE_BYTES,
  PROFILE_FULL_QUERY_KEY,
  SKILLS_QUERY_KEY,
  useSkills,
  useCreateSkill,
  useUpdateSkill,
  useDeleteSkill,
  type JSONResume,
} from "./profile-queries";
import { branchKeys } from "./branch-queries";
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

const mockSnapshot: components["schemas"]["MainProfileSnapshot"] = {
  profile: {
    id: "profile-1",
    user_id: "user-1",
    full_name: "Grace Hopper",
    headline: "Computer Scientist",
    main_revision: 1,
  },
  main_revision: 1,
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

  it("fetches full main profile snapshot", async () => {
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
    const cached = queryClient.getQueryData<components["schemas"]["MainProfileSnapshot"]>(
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
    const cached = queryClient.getQueryData<components["schemas"]["MainProfileSnapshot"]>(
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

    it("polls asynchronous job until completed and returns extracted candidate resume", async () => {
      vi.mocked(api.POST).mockResolvedValueOnce({
        data: {
          job_id: "pdf-job-abc-123",
          status: "pending",
          message: "PDF parsing job queued",
        } as unknown as Record<string, never>,
        error: undefined,
        response: new Response(null, { status: 202 }),
      } as unknown as Awaited<ReturnType<typeof api.POST>>);

      // First poll: processing
      vi.mocked(api.GET).mockResolvedValueOnce({
        data: {
          id: "pdf-job-abc-123",
          user_id: "default",
          status: "processing",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: undefined,
        response: new Response(),
      } as unknown as Awaited<ReturnType<typeof api.GET>>);

      // Second poll: completed
      vi.mocked(api.GET).mockResolvedValueOnce({
        data: {
          id: "pdf-job-abc-123",
          user_id: "default",
          status: "completed",
          result: mockParsedResume,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: undefined,
        response: new Response(),
      } as unknown as Awaited<ReturnType<typeof api.GET>>);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useParsePDFResume(), { wrapper });

      const file = new File(["fake pdf content"], "resume.pdf", {
        type: "application/pdf",
      });

      const parsed = await result.current.mutateAsync({ file });

      expect(parsed.basics.name).toBe("Ada Lovelace");
      expect(api.GET).toHaveBeenCalledWith(
        "/profile/pdf/jobs/{id}",
        expect.objectContaining({
          params: { path: { id: "pdf-job-abc-123" } },
        })
      );
    });

    it("throws error when asynchronous job status is failed", async () => {
      vi.mocked(api.POST).mockResolvedValueOnce({
        data: {
          job_id: "pdf-job-fail-456",
          status: "pending",
          message: "PDF parsing job queued",
        } as unknown as Record<string, never>,
        error: undefined,
        response: new Response(null, { status: 202 }),
      } as unknown as Awaited<ReturnType<typeof api.POST>>);

      vi.mocked(api.GET).mockResolvedValueOnce({
        data: {
          id: "pdf-job-fail-456",
          user_id: "default",
          status: "failed",
          error_message: "Corrupted PDF stream syntax",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: undefined,
        response: new Response(),
      } as unknown as Awaited<ReturnType<typeof api.GET>>);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useParsePDFResume(), { wrapper });

      const file = new File(["bad pdf"], "resume.pdf", {
        type: "application/pdf",
      });

      await expect(result.current.mutateAsync({ file })).rejects.toThrow(
        "Corrupted PDF stream syntax"
      );
    });

    it("aborts parsing immediately if AbortSignal is already cancelled", async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useParsePDFResume(), { wrapper });

      const file = new File(["valid pdf content"], "resume.pdf", {
        type: "application/pdf",
      });

      const controller = new AbortController();
      controller.abort();

      await expect(
        result.current.mutateAsync({ file, signal: controller.signal })
      ).rejects.toThrow(/aborted/i);

      expect(api.POST).not.toHaveBeenCalled();
    });

    it("aborts polling loop when AbortSignal fires during interval", async () => {
      vi.mocked(api.POST).mockResolvedValueOnce({
        data: {
          job_id: "pdf-job-abort-789",
          status: "pending",
          message: "PDF parsing job queued",
        } as unknown as Record<string, never>,
        error: undefined,
        response: new Response(null, { status: 202 }),
      } as unknown as Awaited<ReturnType<typeof api.POST>>);

      // First poll returns processing
      vi.mocked(api.GET).mockResolvedValueOnce({
        data: {
          id: "pdf-job-abort-789",
          user_id: "default",
          status: "processing",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: undefined,
        response: new Response(),
      } as unknown as Awaited<ReturnType<typeof api.GET>>);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useParsePDFResume(), { wrapper });

      const file = new File(["pdf content"], "resume.pdf", {
        type: "application/pdf",
      });

      const controller = new AbortController();
      // Abort after 50ms (during polling wait interval)
      setTimeout(() => controller.abort(), 50);

      await expect(
        result.current.mutateAsync({ file, signal: controller.signal })
      ).rejects.toThrow(/aborted/i);
    });

    it("fetchPDFParseJob passes AbortSignal to GET call", async () => {
      vi.mocked(api.GET).mockResolvedValueOnce({
        data: {
          id: "pdf-job-fetch-1",
          user_id: "default",
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: undefined,
        response: new Response(),
      } as unknown as Awaited<ReturnType<typeof api.GET>>);

      const controller = new AbortController();
      const job = await fetchPDFParseJob("pdf-job-fetch-1", controller.signal);
      expect(job.id).toBe("pdf-job-fetch-1");
      expect(api.GET).toHaveBeenCalledWith("/profile/pdf/jobs/{id}", {
        params: { path: { id: "pdf-job-fetch-1" } },
        signal: controller.signal,
      });
    });

    it("pollPDFParseJobUntilFinished rejects immediately when signal is aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        pollPDFParseJobUntilFinished("pdf-job-fetch-1", 10, controller.signal)
      ).rejects.toThrow(/aborted/i);
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
      const updatedSnapshot: components["schemas"]["MainProfileSnapshot"] = {
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

      const cached = queryClient.getQueryData<components["schemas"]["MainProfileSnapshot"]>(
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

  describe("validateJSONResumeFile", () => {
    it("accepts valid .json files with application/json, empty, or text/plain MIME", () => {
      expect(
        validateJSONResumeFile(
          new File(['{"basics":{"name":"Ada"}}'], "resume.json", {
            type: "application/json",
          })
        )
      ).toBeNull();
      expect(
        validateJSONResumeFile(
          new File(['{"basics":{"name":"Ada"}}'], "resume.json", { type: "" })
        )
      ).toBeNull();
      expect(
        validateJSONResumeFile(
          new File(['{"basics":{"name":"Ada"}}'], "resume.json", {
            type: "text/plain",
          })
        )
      ).toBeNull();
    });

    it("rejects non-JSON file types", () => {
      expect(
        validateJSONResumeFile(
          new File(["%PDF-1.4"], "resume.pdf", { type: "application/pdf" })
        )
      ).toBe("Only JSON (.json) files are supported");
      expect(
        validateJSONResumeFile(
          new File(["hello"], "notes.txt", { type: "text/plain" })
        )
      ).toBe("Only JSON (.json) files are supported");
    });

    it("rejects empty 0-byte JSON files", () => {
      expect(
        validateJSONResumeFile(
          new File([], "empty.json", { type: "application/json" })
        )
      ).toBe("The selected JSON file is empty.");
    });

    it("rejects JSON files larger than 10MB", () => {
      const oversizedFile = new File(["{}"], "huge.json", {
        type: "application/json",
      });
      Object.defineProperty(oversizedFile, "size", {
        value: MAX_JSON_RESUME_SIZE_BYTES + 1,
      });

      expect(validateJSONResumeFile(oversizedFile)).toBe(
        "File exceeds maximum allowed size (10MB)"
      );
    });
  });

  describe("parseJSONResumeText", () => {
    it("parses valid JSON Resume including highlights, work.company fallback, extended sections, and custom keys", () => {
      const raw = JSON.stringify({
        $schema: "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
        basics: { name: "Ada Lovelace", email: "ada@example.com" },
        work: [{ company: "Analytical Engine Lab", position: "Lead" }],
        education: [
          {
            institution: "University of London",
            studyType: "BS",
            highlights: ["Graduated with honors"],
          },
        ],
        volunteer: [{ organization: "Math Society", position: "Mentor" }],
        awards: [{ title: "Royal Medal" }],
        x_custom_key: { flag: true },
      });

      const result = parseJSONResumeText(raw);
      expect(result.error).toBeUndefined();
      expect(result.data?.basics.name).toBe("Ada Lovelace");
      expect(result.data?.work?.[0]?.company).toBe("Analytical Engine Lab");
      expect(result.data?.education?.[0]?.highlights).toEqual([
        "Graduated with honors",
      ]);
      expect(
        (result.data as unknown as Record<string, unknown>).x_custom_key
      ).toEqual({ flag: true });
    });

    it("rejects empty or whitespace-only text", () => {
      expect(parseJSONResumeText("   \n\t ").error).toBe(
        "JSON Resume content is empty."
      );
    });

    it("rejects content exceeding 10MB UTF-8 bytes", () => {
      const largeString = "a".repeat(MAX_JSON_RESUME_SIZE_BYTES + 1);
      expect(parseJSONResumeText(largeString).error).toBe(
        "JSON content exceeds maximum allowed size (10MB)"
      );
    });

    it("rejects malformed JSON syntax", () => {
      expect(parseJSONResumeText("{invalid json").error).toBe(
        "Invalid JSON syntax. Please upload or paste a valid JSON Resume (.json) document."
      );
    });

    it("rejects null, arrays, and primitive JSON roots", () => {
      expect(parseJSONResumeText("null").error).toBe(
        "JSON Resume root must be a JSON object."
      );
      expect(parseJSONResumeText("[]").error).toBe(
        "JSON Resume root must be a JSON object."
      );
      expect(parseJSONResumeText('"string"').error).toBe(
        "JSON Resume root must be a JSON object."
      );
    });

    it("rejects empty JSON objects", () => {
      expect(parseJSONResumeText("{}").error).toBe(
        "JSON Resume object cannot be empty."
      );
    });

    it("rejects non-object basics or meta fields", () => {
      expect(parseJSONResumeText('{"basics":"invalid"}').error).toBe(
        'Invalid JSON Resume: "basics" must be an object.'
      );
      expect(parseJSONResumeText('{"meta":[]}').error).toBe(
        'Invalid JSON Resume: "meta" must be an object.'
      );
    });

    it("rejects non-array standard list sections", () => {
      const arraySections = [
        "work",
        "volunteer",
        "education",
        "awards",
        "certificates",
        "publications",
        "skills",
        "languages",
        "interests",
        "references",
        "projects",
      ] as const;

      for (const section of arraySections) {
        const res = parseJSONResumeText(
          JSON.stringify({ [section]: "not-an-array" })
        );
        expect(res.error).toBe(
          `Invalid JSON Resume: "${section}" must be an array.`
        );
      }
    });
  });

  describe("useImportJSONResume", () => {
    const candidateResume: JSONResume = {
      basics: {
        name: "Grace Hopper",
        email: "grace@navy.mil",
      },
      education: [
        {
          institution: "Yale University",
          studyType: "PhD",
          highlights: ["Wilbur Cross Medal"],
        },
      ],
      skills: [{ name: "COBOL" }],
    };

    it("posts JSON Resume to /profile/jsonresume/import, updates snapshot cache, and invalidates profile, skills, and branches caches", async () => {
      const importedSnapshot: components["schemas"]["MainProfileSnapshot"] = {
        ...mockSnapshot,
        main_revision: 2,
        profile: {
          ...mockSnapshot.profile,
          full_name: "Grace Hopper",
          email: "grace@navy.mil",
          main_revision: 2,
        },
      };

      vi.mocked(api.POST).mockResolvedValueOnce({
        data: importedSnapshot,
        error: undefined,
        response: new Response(),
      } as unknown as Awaited<ReturnType<typeof api.POST>>);

      const { queryClient, wrapper } = createWrapper();
      queryClient.setQueryData(PROFILE_FULL_QUERY_KEY, mockSnapshot);
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useImportJSONResume(), { wrapper });
      const returned = await result.current.mutateAsync(candidateResume);

      expect(returned.main_revision).toBe(2);
      expect(api.POST).toHaveBeenCalledWith("/profile/jsonresume/import", {
        body: candidateResume,
      });

      const cached =
        queryClient.getQueryData<components["schemas"]["MainProfileSnapshot"]>(
          PROFILE_FULL_QUERY_KEY
        );
      expect(cached?.profile.email).toBe("grace@navy.mil");
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: PROFILE_FULL_QUERY_KEY,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: SKILLS_QUERY_KEY,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: branchKeys.all,
      });
    });

    it("propagates backend error messages and falls back to a default message when missing", async () => {
      vi.mocked(api.POST).mockResolvedValueOnce({
        data: undefined,
        error: {
          error: {
            message: "Payload exceeds 10MB limit",
          },
        },
        response: new Response(null, { status: 413 }),
      } as unknown as Awaited<ReturnType<typeof api.POST>>);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useImportJSONResume(), { wrapper });

      await expect(
        result.current.mutateAsync(candidateResume)
      ).rejects.toThrow("Payload exceeds 10MB limit");

      vi.mocked(api.POST).mockResolvedValueOnce({
        data: undefined,
        error: {},
        response: new Response(null, { status: 500 }),
      } as unknown as Awaited<ReturnType<typeof api.POST>>);

      await expect(
        result.current.mutateAsync(candidateResume)
      ).rejects.toThrow("Failed to import JSON Resume into main profile");
    });
  });

  describe("skills hooks", () => {
    it("fetches skills list via useSkills", async () => {
      const mockSkillList: components["schemas"]["Skill"][] = [
        { id: "s-1", user_id: "user-1", name: "TypeScript", category: "Languages" },
        { id: "s-2", user_id: "system", name: "Rust", is_global: true },
      ];

      vi.mocked(api.GET).mockResolvedValueOnce({
        data: mockSkillList,
        error: undefined,
        response: new Response(),
      } as unknown as Awaited<ReturnType<typeof api.GET>>);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSkills("global"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(2);
      expect(api.GET).toHaveBeenCalledWith("/skills", {
        params: { query: { type: "global" } },
      });
    });

    it("creates a skill and invalidates snapshot cache", async () => {
      const createdSkill: components["schemas"]["Skill"] = {
        id: "s-new",
        user_id: "user-1",
        name: "Go",
        category: "Languages",
      };

      vi.mocked(api.POST).mockResolvedValueOnce({
        data: createdSkill,
        error: undefined,
        response: new Response(),
      } as unknown as Awaited<ReturnType<typeof api.POST>>);

      const { queryClient, wrapper } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useCreateSkill(), { wrapper });
      const created = await result.current.mutateAsync({
        name: "Go",
        category: "Languages",
      });

      expect(created.id).toBe("s-new");
      expect(api.POST).toHaveBeenCalledWith("/skills", {
        body: { name: "Go", category: "Languages" },
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: PROFILE_FULL_QUERY_KEY,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: SKILLS_QUERY_KEY,
      });
    });

    it("updates a skill via useUpdateSkill", async () => {
      const updatedSkill: components["schemas"]["Skill"] = {
        id: "s-1",
        user_id: "user-1",
        name: "TypeScript 5",
        category: "Languages",
      };

      vi.mocked(api.PUT).mockResolvedValueOnce({
        data: updatedSkill,
        error: undefined,
        response: new Response(),
      } as unknown as Awaited<ReturnType<typeof api.PUT>>);

      const { queryClient, wrapper } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useUpdateSkill(), { wrapper });
      const updated = await result.current.mutateAsync({
        id: "s-1",
        data: { name: "TypeScript 5" },
      });

      expect(updated.name).toBe("TypeScript 5");
      expect(api.PUT).toHaveBeenCalledWith("/skills/{id}", {
        params: { path: { id: "s-1" } },
        body: { name: "TypeScript 5" },
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: PROFILE_FULL_QUERY_KEY,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: SKILLS_QUERY_KEY,
      });
    });

    it("deletes a skill via useDeleteSkill", async () => {
      vi.mocked(api.DELETE).mockResolvedValueOnce({
        data: undefined,
        error: undefined,
        response: new Response(null, { status: 204 }),
      } as unknown as Awaited<ReturnType<typeof api.DELETE>>);

      const { queryClient, wrapper } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useDeleteSkill(), { wrapper });
      await result.current.mutateAsync("s-1");

      expect(api.DELETE).toHaveBeenCalledWith("/skills/{id}", {
        params: { path: { id: "s-1" } },
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: PROFILE_FULL_QUERY_KEY,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: SKILLS_QUERY_KEY,
      });
    });
  });
});
