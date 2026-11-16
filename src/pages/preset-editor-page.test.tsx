import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "vitest-axe";
import { PresetEditorPage } from "./preset-editor-page";
import * as apiHooks from "@/api/preset-queries";

function renderWithRoute(route: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/presets" element={<h1>Presets Gallery</h1>} />
          <Route path="/presets/new" element={<PresetEditorPage />} />
          <Route path="/presets/:id" element={<PresetEditorPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const mockBuiltinPreset: apiHooks.Preset = {
  id: "builtin-1-page-tech-resume",
  user_id: "default",
  name: "1-Page Tech Resume",
  description: "Strict 1-page max format for engineering roles.",
  system_instructions: "Focus on impact.",
  suggested_theme_id: "builtin-standard-clean",
  language: "English",
  is_built_in: true,
};

const mockCustomPreset: apiHooks.Preset = {
  id: "preset-custom-001",
  user_id: "user-1",
  name: "Custom Staff Preset",
  description: "Tailored for senior staff roles.",
  system_instructions: "Focus on technical leadership.",
  suggested_theme_id: "builtin-standard-clean",
  language: "Spanish",
  is_built_in: false,
};

const mockTemplates: apiHooks.TemplateSet[] = [
  {
    id: "builtin-standard-clean",
    user_id: "default",
    name: "Standard Clean",
    html_template: "<html></html>",
    markdown_template: "# Res",
    text_template: "Res",
  },
];

describe("PresetEditorPage Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiHooks, "useTemplateSetsQuery").mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.useTemplateSetsQuery>);
  });

  it("renders create form on /presets/new and creates a preset", async () => {
    const user = userEvent.setup();
    const createMutateAsync = vi.fn().mockResolvedValue({ id: "new-p-1" });

    vi.spyOn(apiHooks, "useCreatePresetMutation").mockReturnValue({
      mutateAsync: createMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof apiHooks.useCreatePresetMutation>);

    renderWithRoute("/presets/new");

    expect(
      screen.getByRole("heading", { level: 1, name: /create tailoring strategy/i })
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/strategy name/i), "My New Strategy");
    await user.selectOptions(
      screen.getByLabelText(/template set/i),
      "builtin-standard-clean"
    );
    await user.type(
      screen.getByLabelText(/system instructions/i),
      "Concise metrics."
    );

    await user.click(screen.getByRole("button", { name: /save tailoring strategy/i }));

    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "My New Strategy",
        suggested_theme_id: "builtin-standard-clean",
        system_instructions: "Concise metrics.",
      })
    );

    // After success, navigates back to /presets
    await waitFor(() => {
      expect(screen.getByText("Presets Gallery")).toBeInTheDocument();
    });
  });

  it("renders read-only inspection mode on /presets/:id for system presets", () => {
    vi.spyOn(apiHooks, "usePresetQuery").mockReturnValue({
      data: mockBuiltinPreset,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.usePresetQuery>);

    renderWithRoute("/presets/builtin-1-page-tech-resume");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /1-page tech resume \(system strategy\)/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByText(/system strategy \(read-only\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/strategy name/i)).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /save tailoring strategy/i })
    ).not.toBeInTheDocument();
  });

  it("renders edit form on /presets/:id for custom presets and updates preset", async () => {
    const user = userEvent.setup();
    const updateMutateAsync = vi.fn().mockResolvedValue({ id: "preset-custom-001" });

    vi.spyOn(apiHooks, "usePresetQuery").mockReturnValue({
      data: mockCustomPreset,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.usePresetQuery>);

    vi.spyOn(apiHooks, "useUpdatePresetMutation").mockReturnValue({
      mutateAsync: updateMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof apiHooks.useUpdatePresetMutation>);

    renderWithRoute("/presets/preset-custom-001");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /edit: custom staff preset/i,
      })
    ).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/strategy name/i);
    expect(nameInput).not.toBeDisabled();
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Staff Preset");

    await user.click(screen.getByRole("button", { name: /save tailoring strategy/i }));

    expect(updateMutateAsync).toHaveBeenCalledWith({
      id: "preset-custom-001",
      data: expect.objectContaining({
        name: "Updated Staff Preset",
        language: "Spanish",
      }),
    });

    await waitFor(() => {
      expect(screen.getByText("Presets Gallery")).toBeInTheDocument();
    });
  });

  it("pre-populates cloned preset data when ?clone_from is present", () => {
    vi.spyOn(apiHooks, "usePresetQuery").mockReturnValue({
      data: mockBuiltinPreset,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.usePresetQuery>);

    renderWithRoute("/presets/new?clone_from=builtin-1-page-tech-resume");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /duplicate tailoring strategy/i,
      })
    ).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/strategy name/i) as HTMLInputElement;
    expect(nameInput.value).toBe("Copy of 1-Page Tech Resume");
    const languageSelect = screen.getByLabelText(/^language/i) as HTMLSelectElement;
    expect(languageSelect.value).toBe("English");
  });

  it("renders error alert when preset fails to load", () => {
    vi.spyOn(apiHooks, "usePresetQuery").mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Server error: Preset 999 does not exist"),
    } as unknown as ReturnType<typeof apiHooks.usePresetQuery>);

    renderWithRoute("/presets/preset-999");

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Failed to load tailoring strategy")).toBeInTheDocument();
    expect(
      screen.getByText("Server error: Preset 999 does not exist")
    ).toBeInTheDocument();
  });

  it("renders alert message when create preset mutation rejects", async () => {
    const user = userEvent.setup();
    const createMutateAsync = vi
      .fn()
      .mockRejectedValue(new Error("Database write failure"));

    vi.spyOn(apiHooks, "useCreatePresetMutation").mockReturnValue({
      mutateAsync: createMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof apiHooks.useCreatePresetMutation>);

    renderWithRoute("/presets/new");

    await user.type(screen.getByLabelText(/strategy name/i), "Faulty Preset");
    await user.selectOptions(
      screen.getByLabelText(/template set/i),
      "builtin-standard-clean"
    );
    await user.type(
      screen.getByLabelText(/system instructions/i),
      "Some instructions."
    );

    await user.click(screen.getByRole("button", { name: /save tailoring strategy/i }));

    expect(createMutateAsync).toHaveBeenCalled();
    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Failed to save tailoring strategy")).toBeInTheDocument();
    expect(screen.getByText("Database write failure")).toBeInTheDocument();
    // Does not navigate away on error
    expect(screen.queryByText("Presets Gallery")).not.toBeInTheDocument();
  });

  it("renders alert message when update preset mutation rejects", async () => {
    const user = userEvent.setup();
    const updateMutateAsync = vi
      .fn()
      .mockRejectedValue(new Error("Network timeout during update"));

    vi.spyOn(apiHooks, "usePresetQuery").mockReturnValue({
      data: mockCustomPreset,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.usePresetQuery>);

    vi.spyOn(apiHooks, "useUpdatePresetMutation").mockReturnValue({
      mutateAsync: updateMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof apiHooks.useUpdatePresetMutation>);

    renderWithRoute("/presets/preset-custom-001");

    await user.click(screen.getByRole("button", { name: /save tailoring strategy/i }));

    expect(updateMutateAsync).toHaveBeenCalled();
    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Failed to save tailoring strategy")).toBeInTheDocument();
    expect(
      screen.getByText("Network timeout during update")
    ).toBeInTheDocument();
    expect(screen.queryByText("Presets Gallery")).not.toBeInTheDocument();
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = renderWithRoute("/presets/new");
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
