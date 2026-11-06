import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { api } from "./client";
import type { components } from "./schema";

/**
 * Canonical TanStack Query cache key for the full Master Profile career graph snapshot.
 */
export const PROFILE_FULL_QUERY_KEY = ["profile", "full"] as const;

/**
 * Hook to retrieve the complete master profile career graph snapshot via GET /profile/full.
 * Returns profile contact info, skills, experiences, projects, education, certifications, and facts.
 *
 * @returns TanStack UseQueryResult wrapping MasterProfileSnapshot
 */
export function useFullProfile(): UseQueryResult<
  components["schemas"]["MasterProfileSnapshot"],
  Error
> {
  return useQuery({
    queryKey: PROFILE_FULL_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await api.GET("/profile/full");
      if (error || !data) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to fetch master profile graph"
        );
      }
      return data;
    },
  });
}

/**
 * Mutation context for optimistic updates on MasterProfileSnapshot.
 */
interface ProfileMutationContext {
  previousSnapshot?: components["schemas"]["MasterProfileSnapshot"];
}

/**
 * Hook to update core profile contact and identity details via PUT /profile.
 * Optimistically updates the cached MasterProfileSnapshot in TanStack Query for immediate UI feedback.
 *
 * @returns TanStack UseMutationResult for updating profile
 */
export function useUpdateProfile(): UseMutationResult<
  components["schemas"]["Profile"],
  Error,
  components["schemas"]["UpdateProfileRequest"],
  ProfileMutationContext
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: components["schemas"]["UpdateProfileRequest"]) => {
      const { data, error } = await api.PUT("/profile", {
        body: payload,
      });
      if (error || !data) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to update profile"
        );
      }
      return data;
    },
    onMutate: async (newProfile) => {
      await queryClient.cancelQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
      const previousSnapshot =
        queryClient.getQueryData<components["schemas"]["MasterProfileSnapshot"]>(
          PROFILE_FULL_QUERY_KEY
        );

      if (previousSnapshot) {
        queryClient.setQueryData<components["schemas"]["MasterProfileSnapshot"]>(
          PROFILE_FULL_QUERY_KEY,
          {
            ...previousSnapshot,
            profile: {
              ...previousSnapshot.profile,
              ...newProfile,
              updated_at: new Date().toISOString(),
            },
          }
        );
      }

      return { previousSnapshot };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSnapshot) {
        queryClient.setQueryData(
          PROFILE_FULL_QUERY_KEY,
          context.previousSnapshot
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
    },
  });
}

/**
 * Hook to create a work experience entry via POST /experiences.
 */
export function useCreateExperience(): UseMutationResult<
  components["schemas"]["WorkExperience"],
  Error,
  components["schemas"]["CreateExperienceRequest"]
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: components["schemas"]["CreateExperienceRequest"]) => {
      const { data, error } = await api.POST("/experiences", {
        body: payload,
      });
      if (error || !data) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to create experience"
        );
      }
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
    },
  });
}

/**
 * Hook to update a work experience entry via PUT /experiences/{id}.
 */
export function useUpdateExperience(): UseMutationResult<
  components["schemas"]["WorkExperience"],
  Error,
  { id: string; data: components["schemas"]["UpdateExperienceRequest"] }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data: payload }) => {
      const { data, error } = await api.PUT("/experiences/{id}", {
        params: { path: { id } },
        body: payload,
      });
      if (error || !data) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to update experience"
        );
      }
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
    },
  });
}

/**
 * Hook to delete a work experience entry via DELETE /experiences/{id}.
 */
export function useDeleteExperience(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/experiences/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to delete experience"
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
    },
  });
}

/**
 * Hook to create a project entry via POST /projects.
 */
export function useCreateProject(): UseMutationResult<
  components["schemas"]["Project"],
  Error,
  components["schemas"]["CreateProjectRequest"]
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: components["schemas"]["CreateProjectRequest"]) => {
      const { data, error } = await api.POST("/projects", {
        body: payload,
      });
      if (error || !data) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to create project"
        );
      }
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
    },
  });
}

/**
 * Hook to update a project entry via PUT /projects/{id}.
 */
export function useUpdateProject(): UseMutationResult<
  components["schemas"]["Project"],
  Error,
  { id: string; data: components["schemas"]["UpdateProjectRequest"] }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data: payload }) => {
      const { data, error } = await api.PUT("/projects/{id}", {
        params: { path: { id } },
        body: payload,
      });
      if (error || !data) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to update project"
        );
      }
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
    },
  });
}

/**
 * Hook to delete a project entry via DELETE /projects/{id}.
 */
export function useDeleteProject(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/projects/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to delete project"
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
    },
  });
}

/**
 * Hook to create an education entry via POST /education.
 */
export function useCreateEducation(): UseMutationResult<
  components["schemas"]["Education"],
  Error,
  components["schemas"]["CreateEducationRequest"]
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: components["schemas"]["CreateEducationRequest"]) => {
      const { data, error } = await api.POST("/education", {
        body: payload,
      });
      if (error || !data) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to create education"
        );
      }
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
    },
  });
}

/**
 * Hook to update an education entry via PUT /education/{id}.
 */
export function useUpdateEducation(): UseMutationResult<
  components["schemas"]["Education"],
  Error,
  { id: string; data: components["schemas"]["UpdateEducationRequest"] }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data: payload }) => {
      const { data, error } = await api.PUT("/education/{id}", {
        params: { path: { id } },
        body: payload,
      });
      if (error || !data) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to update education"
        );
      }
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
    },
  });
}

/**
 * Hook to delete an education entry via DELETE /education/{id}.
 */
export function useDeleteEducation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/education/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to delete education"
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
    },
  });
}

/**
 * Hook to create a skill via POST /skills.
 */
export function useCreateSkill(): UseMutationResult<
  components["schemas"]["Skill"],
  Error,
  components["schemas"]["CreateSkillRequest"]
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: components["schemas"]["CreateSkillRequest"]) => {
      const { data, error } = await api.POST("/skills", {
        body: payload,
      });
      if (error || !data) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to create skill"
        );
      }
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
    },
  });
}

/**
 * Hook to update a skill via PUT /skills/{id}.
 */
export function useUpdateSkill(): UseMutationResult<
  components["schemas"]["Skill"],
  Error,
  { id: string; data: components["schemas"]["UpdateSkillRequest"] }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data: payload }) => {
      const { data, error } = await api.PUT("/skills/{id}", {
        params: { path: { id } },
        body: payload,
      });
      if (error || !data) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to update skill"
        );
      }
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
    },
  });
}

/**
 * Hook to delete a skill via DELETE /skills/{id}.
 */
export function useDeleteSkill(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/skills/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to delete skill"
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
    },
  });
}

/**
 * Hook to create a certification via POST /certifications.
 */
export function useCreateCertification(): UseMutationResult<
  components["schemas"]["Certification"],
  Error,
  components["schemas"]["CreateCertificationRequest"]
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: components["schemas"]["CreateCertificationRequest"]) => {
      const { data, error } = await api.POST("/certifications", {
        body: payload,
      });
      if (error || !data) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to create certification"
        );
      }
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
    },
  });
}

/**
 * Hook to update a certification via PUT /certifications/{id}.
 */
export function useUpdateCertification(): UseMutationResult<
  components["schemas"]["Certification"],
  Error,
  { id: string; data: components["schemas"]["UpdateCertificationRequest"] }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data: payload }) => {
      const { data, error } = await api.PUT("/certifications/{id}", {
        params: { path: { id } },
        body: payload,
      });
      if (error || !data) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to update certification"
        );
      }
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
    },
  });
}

/**
 * Hook to delete a certification via DELETE /certifications/{id}.
 */
export function useDeleteCertification(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/certifications/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to delete certification"
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
    },
  });
}

/**
 * Hook to create a polymorphic fact (bullet point) via POST /facts.
 */
export function useCreateFact(): UseMutationResult<
  components["schemas"]["Fact"],
  Error,
  components["schemas"]["CreateFactRequest"]
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: components["schemas"]["CreateFactRequest"]) => {
      const { data, error } = await api.POST("/facts", {
        body: payload,
      });
      if (error || !data) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to create fact"
        );
      }
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
    },
  });
}

/**
 * Hook to delete a polymorphic fact via DELETE /facts/{id}.
 */
export function useDeleteFact(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/facts/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to delete fact"
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
    },
  });
}

/**
 * Standard JSON Resume v1.0.0 schema representation used for candidate resume extraction and staging.
 */
export interface JSONResume {
  /** Optional JSON Resume schema URL */
  $schema?: string;
  /** Personal contact, title, and identity details */
  basics: {
    name: string;
    label?: string;
    image?: string;
    email?: string;
    phone?: string;
    url?: string;
    summary?: string;
    location?: {
      address?: string;
      postalCode?: string;
      city?: string;
      countryCode?: string;
      region?: string;
    };
    profiles?: Array<{
      network?: string;
      username?: string;
      url?: string;
    }>;
  };
  /** Employment and work history */
  work?: Array<{
    name?: string;
    company?: string;
    position?: string;
    url?: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
    highlights?: string[];
    location?: string;
  }>;
  /** Volunteer experience entries */
  volunteer?: Array<{
    organization?: string;
    position?: string;
    url?: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
    highlights?: string[];
  }>;
  /** Academic degrees and education entries */
  education?: Array<{
    institution?: string;
    url?: string;
    area?: string;
    studyType?: string;
    startDate?: string;
    endDate?: string;
    score?: string;
    courses?: string[];
  }>;
  /** Awards and honors */
  awards?: Array<{
    title?: string;
    date?: string;
    awarder?: string;
    summary?: string;
  }>;
  /** Professional certificates */
  certificates?: Array<{
    name?: string;
    date?: string;
    issuer?: string;
    url?: string;
  }>;
  /** Publications */
  publications?: Array<{
    name?: string;
    publisher?: string;
    releaseDate?: string;
    url?: string;
    summary?: string;
  }>;
  /** Categorized skills */
  skills?: Array<{
    name?: string;
    level?: string;
    keywords?: string[];
  }>;
  /** Spoken and written languages */
  languages?: Array<{
    language?: string;
    fluency?: string;
  }>;
  /** Interests and hobbies */
  interests?: Array<{
    name?: string;
    keywords?: string[];
  }>;
  /** Professional references */
  references?: Array<{
    name?: string;
    reference?: string;
  }>;
  /** Projects and technical portfolio items */
  projects?: Array<{
    name?: string;
    description?: string;
    highlights?: string[];
    keywords?: string[];
    startDate?: string;
    endDate?: string;
    url?: string;
    roles?: string[];
    entity?: string;
    type?: string;
  }>;
  /** Arbitrary metadata */
  meta?: Record<string, unknown>;
}

/** Maximum allowed upload file size for candidate PDF resumes (10 megabytes) */
export const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Validates candidate PDF file boundary invariants prior to network dispatch.
 * Checks file type, lower-bound non-empty size, and maximum 10MB payload size.
 *
 * @param file - Candidate File object to validate.
 * @returns Human-readable validation error string if invalid, or null if valid.
 */
export function validatePDFFile(file: File): string | null {
  const isPdfExtension = file.name.toLowerCase().endsWith(".pdf");
  const isPdfMime = file.type === "application/pdf";
  if (!isPdfExtension && !isPdfMime) {
    return "Only PDF files are supported";
  }
  if (file.size <= 0) {
    return "The selected PDF file is empty.";
  }
  if (file.size > MAX_PDF_SIZE_BYTES) {
    return "File exceeds maximum allowed size (10MB)";
  }
  return null;
}

/**
 * Options for parsing a candidate PDF resume file.
 */
export interface ParsePDFResumeOptions {
  /** The binary PDF resume file to upload (maximum 10MB) */
  file: File;
  /** Optional LLM provider override */
  provider?: string;
  /** Optional LLM model override */
  model?: string;
  /** Optional AbortSignal to cancel in-flight network dispatch and polling loops */
  signal?: AbortSignal;
}

/**
 * Fetches the execution lifecycle status and candidate result of an asynchronous PDF parse job.
 *
 * @param jobId - Unique PDF parse job identifier
 * @param signal - Optional AbortSignal to cancel in-flight HTTP request
 * @returns Candidate PDFParseJob record
 */
export async function fetchPDFParseJob(
  jobId: string,
  signal?: AbortSignal
): Promise<components["schemas"]["PDFParseJob"]> {
  const { data, error } = await api.GET("/profile/pdf/jobs/{id}", {
    params: {
      path: { id: jobId },
    },
    signal,
  });

  if (error || !data) {
    throw new Error(
      (error as { error?: { message?: string } })?.error?.message ||
        "Failed to fetch PDF parse job status"
    );
  }

  return data;
}

/**
 * Polls an asynchronous PDF parse job until completion or failure.
 *
 * @param jobId - Job ID to poll
 * @param pollIntervalMs - Polling interval in milliseconds (defaults to 1000ms)
 * @param signal - Optional AbortSignal to cancel polling loop early
 * @returns Completed JSONResume
 */
export async function pollPDFParseJobUntilFinished(
  jobId: string,
  pollIntervalMs = 1000,
  signal?: AbortSignal
): Promise<JSONResume> {
  const maxAttempts = 600; // 10 minutes maximum polling boundary
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }

    const job = await fetchPDFParseJob(jobId, signal);
    if (job.status === "completed") {
      if (!job.result) {
        throw new Error("PDF parse job completed without candidate resume data");
      }
      return job.result as unknown as JSONResume;
    }
    if (job.status === "failed") {
      throw new Error(job.error_message || "PDF parsing failed");
    }

    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        resolve();
      }, pollIntervalMs);

      const onAbort = () => {
        cleanup();
        reject(new DOMException("The operation was aborted", "AbortError"));
      };

      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      };

      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
  throw new Error("PDF parsing timed out waiting for extraction completion");
}

/**
 * Hook to parse an uploaded PDF resume via POST /profile/pdf/parse.
 * Uploads the file as multipart/form-data. When enqueued asynchronously, polls /profile/pdf/jobs/{id}
 * until the job reaches "completed" or "failed" status.
 * Enforces client-side file type and 10MB size boundaries prior to network dispatch.
 *
 * @returns TanStack UseMutationResult for parsing PDF resume
 */
export function useParsePDFResume(): UseMutationResult<
  JSONResume,
  Error,
  ParsePDFResumeOptions
> {
  return useMutation({
    mutationFn: async ({ file, provider, model, signal }: ParsePDFResumeOptions) => {
      const validationError = validatePDFFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      if (signal?.aborted) {
        throw new DOMException("The operation was aborted", "AbortError");
      }

      const formData = new FormData();
      formData.append("file", file);
      if (provider) {
        formData.append("provider", provider);
      }
      if (model) {
        formData.append("model", model);
      }

      const { data, error } = await api.POST("/profile/pdf/parse", {
        body: formData as unknown as { file: string },
        headers: {
          "Content-Type": null as unknown as string,
        },
        signal,
      });

      if (error || !data) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to parse PDF resume"
        );
      }

      // If response is already a full JSONResume (synchronous fallback or test mock)
      if ("basics" in (data as Record<string, unknown>)) {
        return data as unknown as JSONResume;
      }

      // If asynchronous job was queued, poll until completed or failed
      const jobResponse = data as unknown as components["schemas"]["AsyncPDFJobResponse"];
      if (jobResponse.job_id) {
        return await pollPDFParseJobUntilFinished(jobResponse.job_id, 1000, signal);
      }

      return data as unknown as JSONResume;
    },
  });
}

/**
 * Hook to commit a reviewed candidate JSON Resume into the Master Profile via POST /profile/pdf/commit.
 * Ingests the candidate resume graph, updates the Master Profile snapshot, and invalidates TanStack Query cache.
 *
 * @returns TanStack UseMutationResult for committing candidate resume
 */
export function useCommitPDFResume(): UseMutationResult<
  components["schemas"]["MasterProfileSnapshot"],
  Error,
  JSONResume
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resume: JSONResume) => {
      const { data, error } = await api.POST("/profile/pdf/commit", {
        body: resume as unknown as Record<string, never>,
      });

      if (error || !data) {
        throw new Error(
          (error as { error?: { message?: string } })?.error?.message ||
            "Failed to commit parsed resume into master profile"
        );
      }

      return data;
    },
    onSuccess: (snapshot) => {
      queryClient.setQueryData(PROFILE_FULL_QUERY_KEY, snapshot);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_FULL_QUERY_KEY });
    },
  });
}
