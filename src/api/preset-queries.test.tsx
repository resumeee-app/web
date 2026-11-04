import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  presetsQueryKey,
  presetQueryKey,
  templateSetsQueryKey,
  modelsQueryKey,
  extractApiErrorMessage,
  usePresetsQuery,
  usePresetQuery,
  useCreatePresetMutation,
  useUpdatePresetMutation,
  useDeletePresetMutation,
  useTemplateSetsQuery,
  useAvailableModelsQuery,
} from "./preset-queries";
import { api } from "./client";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("Preset Queries & Mutations", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exports consistent query keys", () => {
    expect(presetsQueryKey).toEqual(["presets"]);
    expect(presetQueryKey("p-1")).toEqual(["presets", "p-1"]);
    expect(templateSetsQueryKey).toEqual(["template-sets"]);
    expect(modelsQueryKey).toEqual(["models"]);
  });

  it("usePresetsQuery returns data when api succeeds", async () => {
    const mockPresets = [
      {
        id: "builtin-1",
        user_id: "user-1",
        name: "Builtin Tech",
        system_instructions: "Instructions",
        template_set_id: "t-1",
        is_built_in: true,
      },
    ];

    vi.spyOn(api, "GET").mockResolvedValueOnce({
      data: mockPresets,
      error: undefined,
      response: new Response(),
    } as unknown as Awaited<ReturnType<typeof api.GET>>);

    const { result } = renderHook(() => usePresetsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPresets);
  });

  it("usePresetQuery fetches single preset by ID", async () => {
    const mockPreset = {
      id: "p-123",
      user_id: "user-1",
      name: "Custom Preset",
      system_instructions: "Custom Instructions",
      template_set_id: "t-2",
      is_built_in: false,
    };

    vi.spyOn(api, "GET").mockResolvedValueOnce({
      data: mockPreset,
      error: undefined,
      response: new Response(),
    } as unknown as Awaited<ReturnType<typeof api.GET>>);

    const { result } = renderHook(() => usePresetQuery("p-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPreset);
  });

  it("useCreatePresetMutation sends create request and returns created preset", async () => {
    const newPreset = {
      name: "Brand New Preset",
      system_instructions: "Focus on metrics",
      template_set_id: "t-1",
    };
    const createdPreset = {
      id: "new-id",
      user_id: "user-1",
      ...newPreset,
      is_built_in: false,
    };

    vi.spyOn(api, "POST").mockResolvedValueOnce({
      data: createdPreset,
      error: undefined,
      response: new Response(),
    } as unknown as Awaited<ReturnType<typeof api.POST>>);

    const { result } = renderHook(() => useCreatePresetMutation(), {
      wrapper: createWrapper(),
    });

    const created = await result.current.mutateAsync(newPreset);
    expect(created).toEqual(createdPreset);
  });

  it("useUpdatePresetMutation sends update request", async () => {
    const updatedPreset = {
      id: "p-1",
      user_id: "user-1",
      name: "Updated Name",
      system_instructions: "Updated Instructions",
      template_set_id: "t-1",
      is_built_in: false,
    };

    vi.spyOn(api, "PUT").mockResolvedValueOnce({
      data: updatedPreset,
      error: undefined,
      response: new Response(),
    } as unknown as Awaited<ReturnType<typeof api.PUT>>);

    const { result } = renderHook(() => useUpdatePresetMutation(), {
      wrapper: createWrapper(),
    });

    const res = await result.current.mutateAsync({
      id: "p-1",
      data: { name: "Updated Name" },
    });
    expect(res).toEqual(updatedPreset);
  });

  it("useDeletePresetMutation sends delete request", async () => {
    vi.spyOn(api, "DELETE").mockResolvedValueOnce({
      data: undefined,
      error: undefined,
      response: new Response(null, { status: 204 }),
    } as unknown as Awaited<ReturnType<typeof api.DELETE>>);

    const { result } = renderHook(() => useDeletePresetMutation(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync("p-1")).resolves.toBeUndefined();
  });

  it("useTemplateSetsQuery fetches template sets", async () => {
    const mockTemplates = [
      {
        id: "t-1",
        user_id: "user-1",
        name: "Standard Clean",
        html_template: "<html></html>",
        markdown_template: "# Res",
        text_template: "Res",
      },
    ];

    vi.spyOn(api, "GET").mockResolvedValueOnce({
      data: mockTemplates,
      error: undefined,
      response: new Response(),
    } as unknown as Awaited<ReturnType<typeof api.GET>>);

    const { result } = renderHook(() => useTemplateSetsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockTemplates);
  });

  describe("extractApiErrorMessage helper", () => {
    it("extracts message when error has string message property", () => {
      expect(
        extractApiErrorMessage({ message: "Entity not found" }, "Default error")
      ).toBe("Entity not found");
    });

    it("returns fallback message when error is null or undefined", () => {
      expect(extractApiErrorMessage(null, "Default error")).toBe("Default error");
      expect(extractApiErrorMessage(undefined, "Default error")).toBe(
        "Default error"
      );
    });

    it("returns fallback message when error lacks a valid message", () => {
      expect(extractApiErrorMessage("string error", "Default error")).toBe(
        "Default error"
      );
      expect(extractApiErrorMessage({}, "Default error")).toBe("Default error");
      expect(extractApiErrorMessage({ message: "" }, "Default error")).toBe(
        "Default error"
      );
    });
  });

  describe("API Error Rejection paths", () => {
    it("usePresetsQuery throws error when api fails", async () => {
      vi.spyOn(api, "GET").mockResolvedValueOnce({
        data: undefined,
        error: { message: "Internal Server Error" },
        response: new Response(null, { status: 500 }),
      } as unknown as Awaited<ReturnType<typeof api.GET>>);

      const { result } = renderHook(() => usePresetsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("Internal Server Error");
    });

    it("usePresetQuery throws error when api fails", async () => {
      vi.spyOn(api, "GET").mockResolvedValueOnce({
        data: undefined,
        error: { message: "Preset not found in database" },
        response: new Response(null, { status: 404 }),
      } as unknown as Awaited<ReturnType<typeof api.GET>>);

      const { result } = renderHook(() => usePresetQuery("p-404"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe(
        "Preset not found in database"
      );
    });

    it("usePresetQuery throws error when data is missing", async () => {
      vi.spyOn(api, "GET").mockResolvedValueOnce({
        data: undefined,
        error: undefined,
        response: new Response(),
      } as unknown as Awaited<ReturnType<typeof api.GET>>);

      const { result } = renderHook(() => usePresetQuery("p-missing"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("Preset p-missing not found");
    });

    it("useCreatePresetMutation rejects when api fails", async () => {
      vi.spyOn(api, "POST").mockResolvedValueOnce({
        data: undefined,
        error: { message: "Validation error: invalid preset name" },
        response: new Response(null, { status: 400 }),
      } as unknown as Awaited<ReturnType<typeof api.POST>>);

      const { result } = renderHook(() => useCreatePresetMutation(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          name: "Invalid",
          system_instructions: "None",
          template_set_id: "t-1",
        })
      ).rejects.toThrow("Validation error: invalid preset name");
    });

    it("useCreatePresetMutation rejects when data is empty", async () => {
      vi.spyOn(api, "POST").mockResolvedValueOnce({
        data: undefined,
        error: undefined,
        response: new Response(),
      } as unknown as Awaited<ReturnType<typeof api.POST>>);

      const { result } = renderHook(() => useCreatePresetMutation(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          name: "Valid",
          system_instructions: "Instructions",
          template_set_id: "t-1",
        })
      ).rejects.toThrow("No data returned from preset creation");
    });

    it("useUpdatePresetMutation rejects when api fails", async () => {
      vi.spyOn(api, "PUT").mockResolvedValueOnce({
        data: undefined,
        error: { message: "Cannot edit built-in preset" },
        response: new Response(null, { status: 403 }),
      } as unknown as Awaited<ReturnType<typeof api.PUT>>);

      const { result } = renderHook(() => useUpdatePresetMutation(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          id: "p-builtin",
          data: { name: "New Name" },
        })
      ).rejects.toThrow("Cannot edit built-in preset");
    });

    it("useUpdatePresetMutation rejects when data is empty", async () => {
      vi.spyOn(api, "PUT").mockResolvedValueOnce({
        data: undefined,
        error: undefined,
        response: new Response(),
      } as unknown as Awaited<ReturnType<typeof api.PUT>>);

      const { result } = renderHook(() => useUpdatePresetMutation(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          id: "p-1",
          data: { name: "New Name" },
        })
      ).rejects.toThrow("No data returned when updating preset p-1");
    });

    it("useDeletePresetMutation rejects when api fails", async () => {
      vi.spyOn(api, "DELETE").mockResolvedValueOnce({
        data: undefined,
        error: { message: "Preset is locked and cannot be deleted" },
        response: new Response(null, { status: 403 }),
      } as unknown as Awaited<ReturnType<typeof api.DELETE>>);

      const { result } = renderHook(() => useDeletePresetMutation(), {
        wrapper: createWrapper(),
      });

      await expect(result.current.mutateAsync("p-locked")).rejects.toThrow(
        "Preset is locked and cannot be deleted"
      );
    });

    it("useTemplateSetsQuery throws error when api fails", async () => {
      vi.spyOn(api, "GET").mockResolvedValueOnce({
        data: undefined,
        error: { message: "Template service unreachable" },
        response: new Response(null, { status: 503 }),
      } as unknown as Awaited<ReturnType<typeof api.GET>>);

      const { result } = renderHook(() => useTemplateSetsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe(
        "Template service unreachable"
      );
    });

    it("useAvailableModelsQuery returns list of models on success", async () => {
      const mockModels = [
        {
          provider: "gemini",
          model: "gemini-3.8-flash",
          display_name: "Google Gemini — gemini-3.8-flash",
          is_default: true,
        },
      ];
      vi.spyOn(api, "GET").mockResolvedValueOnce({
        data: mockModels,
        error: undefined,
        response: new Response(JSON.stringify(mockModels), { status: 200 }),
      } as unknown as Awaited<ReturnType<typeof api.GET>>);

      const { result } = renderHook(() => useAvailableModelsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockModels);
    });

    it("useAvailableModelsQuery throws error when api fails", async () => {
      vi.spyOn(api, "GET").mockResolvedValueOnce({
        data: undefined,
        error: { message: "Models service unreachable" },
        response: new Response(null, { status: 503 }),
      } as unknown as Awaited<ReturnType<typeof api.GET>>);

      const { result } = renderHook(() => useAvailableModelsQuery(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe(
        "Models service unreachable"
      );
    });
  });
});
