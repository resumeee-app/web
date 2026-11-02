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
