import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "vitest-axe";
import { PresetsPage } from "./presets-page";
import * as apiHooks from "@/api/preset-queries";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/presets"]}>
        <Routes>
          <Route path="/presets" element={ui} />
          <Route
            path="/presets/new"
            element={<h1>New Preset Route</h1>}
          />
          <Route
            path="/presets/:id"
            element={<h1>Preset Details Route</h1>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const mockPresets: apiHooks.Preset[] = [
  {
    id: "builtin-1-page-tech-resume",
    user_id: "default",
    name: "1-Page Tech Resume",
    description: "Strict 1-page max format for engineering roles.",
    system_instructions: "Focus on impact.",
    template_set_id: "builtin-standard-clean",
    is_built_in: true,
  },
  {
    id: "preset-custom-001",
    user_id: "user-1",
    name: "Custom Staff Preset",
    description: "Tailored for senior staff roles.",
    system_instructions: "Focus on technical leadership.",
    template_set_id: "builtin-standard-clean",
    is_built_in: false,
  },
];

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

describe("PresetsPage Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders page title, subtitle, and Create Tailoring Strategy button", async () => {
    vi.spyOn(apiHooks, "usePresetsQuery").mockReturnValue({
      data: mockPresets,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.usePresetsQuery>);

    vi.spyOn(apiHooks, "useTemplateSetsQuery").mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.useTemplateSetsQuery>);

    renderWithProviders(<PresetsPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /tailoring strategies/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /create tailoring strategy/i })
    ).toHaveAttribute("href", "/presets/new");

    // Both cards should be rendered
    expect(screen.getByText("1-Page Tech Resume")).toBeInTheDocument();
    expect(screen.getByText("Custom Staff Preset")).toBeInTheDocument();
  });

  it("renders empty state when no presets are available", async () => {
    vi.spyOn(apiHooks, "usePresetsQuery").mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.usePresetsQuery>);

    vi.spyOn(apiHooks, "useTemplateSetsQuery").mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.useTemplateSetsQuery>);

    renderWithProviders(<PresetsPage />);

    expect(screen.getByText(/no tailoring strategies found/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create your first strategy/i })
    ).toHaveAttribute("href", "/presets/new");
  });

  it("navigates to /presets/new?clone_from=... when duplicate is clicked", async () => {
    const user = userEvent.setup();

    vi.spyOn(apiHooks, "usePresetsQuery").mockReturnValue({
      data: mockPresets,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.usePresetsQuery>);

    vi.spyOn(apiHooks, "useTemplateSetsQuery").mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.useTemplateSetsQuery>);

    renderWithProviders(<PresetsPage />);

    const dupBtn = screen.getByRole("button", {
      name: /duplicate 1-page tech resume to custom/i,
    });
    await user.click(dupBtn);

    // After clicking duplicate, it navigates to New Preset Route
    await waitFor(() => {
      expect(screen.getByText("New Preset Route")).toBeInTheDocument();
    });
  });

  it("renders error alert when fetching presets fails", () => {
    vi.spyOn(apiHooks, "usePresetsQuery").mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error("Network offline: unable to reach presets endpoint"),
    } as unknown as ReturnType<typeof apiHooks.usePresetsQuery>);

    vi.spyOn(apiHooks, "useTemplateSetsQuery").mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.useTemplateSetsQuery>);

    renderWithProviders(<PresetsPage />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Failed to load tailoring strategies")).toBeInTheDocument();
    expect(
      screen.getByText("Network offline: unable to reach presets endpoint")
    ).toBeInTheDocument();
  });

  it("handles custom preset deletion confirmation via AlertDialog", async () => {
    const user = userEvent.setup();
    const deleteMutateAsync = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(apiHooks, "usePresetsQuery").mockReturnValue({
      data: mockPresets,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.usePresetsQuery>);

    vi.spyOn(apiHooks, "useTemplateSetsQuery").mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.useTemplateSetsQuery>);

    vi.spyOn(apiHooks, "useDeletePresetMutation").mockReturnValue({
      mutateAsync: deleteMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof apiHooks.useDeletePresetMutation>);

    renderWithProviders(<PresetsPage />);

    // Click delete trigger on custom preset
    const deleteTrigger = screen.getByRole("button", {
      name: /delete custom staff preset/i,
    });
    await user.click(deleteTrigger);

    // Confirm in AlertDialog
    const confirmButton = await screen.findByRole("button", {
      name: /confirm delete/i,
    });
    await user.click(confirmButton);

    expect(deleteMutateAsync).toHaveBeenCalledWith("preset-custom-001");
  });

  it("renders error alert when deleting a preset fails", async () => {
    const user = userEvent.setup();
    const deleteMutateAsync = vi
      .fn()
      .mockRejectedValue(new Error("Database constraint: preset in use"));

    vi.spyOn(apiHooks, "usePresetsQuery").mockReturnValue({
      data: mockPresets,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.usePresetsQuery>);

    vi.spyOn(apiHooks, "useTemplateSetsQuery").mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.useTemplateSetsQuery>);

    vi.spyOn(apiHooks, "useDeletePresetMutation").mockReturnValue({
      mutateAsync: deleteMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof apiHooks.useDeletePresetMutation>);

    renderWithProviders(<PresetsPage />);

    const deleteTrigger = screen.getByRole("button", {
      name: /delete custom staff preset/i,
    });
    await user.click(deleteTrigger);

    const confirmButton = await screen.findByRole("button", {
      name: /confirm delete/i,
    });
    await user.click(confirmButton);

    expect(deleteMutateAsync).toHaveBeenCalledWith("preset-custom-001");

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Failed to delete tailoring strategy")).toBeInTheDocument();
    expect(
      screen.getByText("Database constraint: preset in use")
    ).toBeInTheDocument();
  });

  it("has zero accessibility violations according to axe-core", async () => {
    vi.spyOn(apiHooks, "usePresetsQuery").mockReturnValue({
      data: mockPresets,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.usePresetsQuery>);

    vi.spyOn(apiHooks, "useTemplateSetsQuery").mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiHooks.useTemplateSetsQuery>);

    const { container } = renderWithProviders(<PresetsPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
