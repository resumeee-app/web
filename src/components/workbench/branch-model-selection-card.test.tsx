import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { setAuthToken } from "@/api/client";
import * as presetQueries from "@/api/preset-queries";
import type { Branch } from "@/api/workbench-queries";
import { BranchModelSelectionCard } from "./branch-model-selection-card";

const mockBranch: Branch = {
  id: "b-1",
  user_id: "u-1",
  name: "Backend Engineer Branch",
  target_role: "Staff Engineer",
  target_company: "Stripe",
  target_requirements: "Go experience",
  branch_instructions: "",
  template_set_id: "standard",
  preset_id: null,
  provider_override: "gemini",
  model_override: "gemini-3.8-flash",
  reasoning_level: "high",
  pinned_entity_ids: [],
  excluded_entity_ids: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockAvailableModels: presetQueries.ModelOption[] = [
  {
    provider: "gemini",
    model: "gemini-3.8-flash",
    display_name: "Gemini 3.8 Flash",
    is_default: true,
  },
  {
    provider: "gemini",
    model: "gemini-4-argon",
    display_name: "Gemini 4 Argon",
    is_default: false,
  },
  {
    provider: "anthropic",
    model: "claude-3-7-sonnet-20250219",
    display_name: "Claude 3.7 Sonnet",
    is_default: false,
  },
  {
    provider: "openai",
    model: "gpt-4o",
    display_name: "GPT-4o",
    is_default: false,
  },
];

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, Wrapper };
}

describe("BranchModelSelectionCard", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("ADMIN_MODE", "true");
    setAuthToken(null);

    vi.spyOn(presetQueries, "useAvailableModelsQuery").mockReturnValue({
      data: mockAvailableModels,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof presetQueries.useAvailableModelsQuery>);
  });

  it("renders null and does not mount card when isAdmin is false", () => {
    vi.stubEnv("ADMIN_MODE", "false");
    vi.stubEnv("VITE_ADMIN_MODE", "false");
    setAuthToken(null);
    const { Wrapper } = createTestWrapper();

    const { container } = render(
      <Wrapper>
        <BranchModelSelectionCard
          branch={mockBranch}
          onUpdate={vi.fn()}
          defaultExpanded={true}
        />
      </Wrapper>
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(/llm model & reasoning/i)).not.toBeInTheDocument();
  });

  it("renders null when explicit isAdmin prop is false even if admin mode is true", () => {
    const { Wrapper } = createTestWrapper();

    const { container } = render(
      <Wrapper>
        <BranchModelSelectionCard
          branch={mockBranch}
          isAdmin={false}
          onUpdate={vi.fn()}
        />
      </Wrapper>
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders header landmark, title, description, and active badges when admin", () => {
    const { Wrapper } = createTestWrapper();

    render(
      <Wrapper>
        <BranchModelSelectionCard
          branch={mockBranch}
          onUpdate={vi.fn()}
        />
      </Wrapper>
    );

    expect(screen.getByRole("heading", { name: /llm model & reasoning/i })).toBeInTheDocument();
    expect(screen.getByText(/google gemini/i)).toBeInTheDocument();
    expect(screen.getByText(/gemini-3.8-flash/i)).toBeInTheDocument();
    expect(screen.getByText(/reasoning: high/i)).toBeInTheDocument();

    const toggleButton = screen.getByRole("button", { name: /configure model & reasoning/i });
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");
  });

  it("expands controls when disclosure button is clicked and displays populated selects", async () => {
    const user = userEvent.setup();
    const { Wrapper } = createTestWrapper();

    render(
      <Wrapper>
        <BranchModelSelectionCard
          branch={mockBranch}
          onUpdate={vi.fn()}
        />
      </Wrapper>
    );

    const toggleButton = screen.getByRole("button", { name: /configure model & reasoning/i });
    await user.click(toggleButton);

    expect(toggleButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /hide model settings/i })).toBeInTheDocument();

    const providerSelect = screen.getByLabelText(/provider override/i);
    const modelSelect = screen.getByLabelText(/model override/i);
    const reasoningSelect = screen.getByLabelText(/reasoning level/i);

    expect(providerSelect).toHaveValue("gemini");
    expect(modelSelect).toHaveValue("gemini-3.8-flash");
    expect(reasoningSelect).toHaveValue("high");
  });

  it("filters model options when provider selection changes", async () => {
    const user = userEvent.setup();
    const { Wrapper } = createTestWrapper();

    render(
      <Wrapper>
        <BranchModelSelectionCard
          branch={mockBranch}
          defaultExpanded={true}
          onUpdate={vi.fn()}
        />
      </Wrapper>
    );

    const providerSelect = screen.getByLabelText(/provider override/i);
    await user.selectOptions(providerSelect, "anthropic");

    const modelSelect = screen.getByLabelText(/model override/i);
    expect(modelSelect).toHaveValue("");

    const options = Array.from((modelSelect as HTMLSelectElement).options).map((o) => o.value);
    expect(options).toContain("claude-3-7-sonnet-20250219");
    expect(options).not.toContain("gpt-4o");
  });

  it("submits updated model configuration when save button is clicked", async () => {
    const user = userEvent.setup();
    const handleUpdate = vi.fn().mockResolvedValue(undefined);
    const { Wrapper } = createTestWrapper();

    render(
      <Wrapper>
        <BranchModelSelectionCard
          branch={mockBranch}
          defaultExpanded={true}
          onUpdate={handleUpdate}
        />
      </Wrapper>
    );

    const providerSelect = screen.getByLabelText(/provider override/i);
    await user.selectOptions(providerSelect, "anthropic");

    const modelSelect = screen.getByLabelText(/model override/i);
    await user.selectOptions(modelSelect, "claude-3-7-sonnet-20250219");

    const reasoningSelect = screen.getByLabelText(/reasoning level/i);
    await user.selectOptions(reasoningSelect, "medium");

    const saveButton = screen.getByRole("button", { name: /save model settings/i });
    await user.click(saveButton);

    expect(handleUpdate).toHaveBeenCalledTimes(1);
    expect(handleUpdate).toHaveBeenCalledWith({
      provider_override: "anthropic",
      model_override: "claude-3-7-sonnet-20250219",
      reasoning_level: "medium",
    });
  });

  it("disables inputs and button when isUpdating is true", () => {
    const { Wrapper } = createTestWrapper();

    render(
      <Wrapper>
        <BranchModelSelectionCard
          branch={mockBranch}
          defaultExpanded={true}
          isUpdating={true}
          onUpdate={vi.fn()}
        />
      </Wrapper>
    );

    expect(screen.getByLabelText(/provider override/i)).toBeDisabled();
    expect(screen.getByLabelText(/model override/i)).toBeDisabled();
    expect(screen.getByLabelText(/reasoning level/i)).toBeDisabled();
    const saveButton = screen.getByRole("button", { name: /saving\.\.\./i });
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveAttribute("aria-busy", "true");
  });

  it("resets changes to current branch values when reset button is clicked", async () => {
    const user = userEvent.setup();
    const { Wrapper } = createTestWrapper();

    render(
      <Wrapper>
        <BranchModelSelectionCard
          branch={mockBranch}
          defaultExpanded={true}
          onUpdate={vi.fn()}
        />
      </Wrapper>
    );

    const reasoningSelect = screen.getByLabelText(/reasoning level/i);
    await user.selectOptions(reasoningSelect, "low");
    expect(reasoningSelect).toHaveValue("low");

    const resetButton = screen.getByRole("button", { name: /reset/i });
    await user.click(resetButton);

    expect(screen.getByLabelText(/reasoning level/i)).toHaveValue("high");
  });

  it("resets model override when provider is switched back to system default (empty)", async () => {
    const user = userEvent.setup();
    const { Wrapper } = createTestWrapper();

    render(
      <Wrapper>
        <BranchModelSelectionCard
          branch={{
            ...mockBranch,
            provider_override: "anthropic",
            model_override: "claude-3-7-sonnet-20250219",
          }}
          defaultExpanded={true}
          onUpdate={vi.fn()}
        />
      </Wrapper>
    );

    const providerSelect = screen.getByLabelText(/provider override/i);
    const modelSelect = screen.getByLabelText(/model override/i);
    expect(providerSelect).toHaveValue("anthropic");
    expect(modelSelect).toHaveValue("claude-3-7-sonnet-20250219");

    // Switch provider back to system default (empty string)
    await user.selectOptions(providerSelect, "");
    expect(providerSelect).toHaveValue("");
    expect(modelSelect).toHaveValue("");
  });

  it("passes axe-core accessibility audit in both collapsed and expanded states", async () => {
    const { Wrapper } = createTestWrapper();

    const { container, rerender } = render(
      <Wrapper>
        <BranchModelSelectionCard
          branch={mockBranch}
          defaultExpanded={false}
          onUpdate={vi.fn()}
        />
      </Wrapper>
    );

    let results = await axe(container);
    expect(results).toHaveNoViolations();

    rerender(
      <Wrapper>
        <BranchModelSelectionCard
          branch={mockBranch}
          defaultExpanded={true}
          onUpdate={vi.fn()}
        />
      </Wrapper>
    );

    results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
