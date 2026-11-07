import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { PresetForm } from "./preset-form";
import type { TemplateSet, ModelOption } from "@/api/preset-queries";

const mockTemplates: TemplateSet[] = [
  {
    id: "builtin-standard-clean",
    user_id: "default",
    name: "Standard Clean",
    html_template: "<html></html>",
    markdown_template: "# Res",
    text_template: "Res",
  },
  {
    id: "builtin-detailed-immigration-cv",
    user_id: "default",
    name: "Detailed Immigration / CV",
    html_template: "<html></html>",
    markdown_template: "# Res",
    text_template: "Res",
  },
];

const mockAvailableModels: ModelOption[] = [
  {
    provider: "gemini",
    model: "gemini-3.8-flash",
    display_name: "Google Gemini — gemini-3.8-flash",
    is_default: true,
  },
  {
    provider: "gemini",
    model: "gemini-4-argon",
    display_name: "Google Gemini — gemini-4-argon",
    is_default: false,
  },
  {
    provider: "anthropic",
    model: "claude-3-7-sonnet-20250219",
    display_name: "Anthropic — claude-3-7-sonnet-20250219",
    is_default: false,
  },
  {
    provider: "anthropic",
    model: "claude-3-5-haiku-20241022",
    display_name: "Anthropic — claude-3-5-haiku-20241022",
    is_default: false,
  },
  {
    provider: "openai",
    model: "gpt-4o",
    display_name: "OpenAI — gpt-4o",
    is_default: false,
  },
];

describe("PresetForm Component", () => {
  it("renders form fields for creating a custom preset with constrained selects", () => {
    render(
      <PresetForm
        templateSets={mockTemplates}
        availableModels={mockAvailableModels}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/strategy name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/template set/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/system instructions/i)).toBeInTheDocument();

    // Provider, Model, and Reasoning Level must be constrained <select> dropdowns, not text inputs
    const providerSelect = screen.getByLabelText(/provider override/i);
    expect(providerSelect.tagName).toBe("SELECT");

    const modelSelect = screen.getByLabelText(/model override/i);
    expect(modelSelect.tagName).toBe("SELECT");

    const reasoningSelect = screen.getByLabelText(/reasoning level/i);
    expect(reasoningSelect.tagName).toBe("SELECT");

    expect(
      screen.getByLabelText(/include administrative & immigration fields/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /save tailoring strategy/i })
    ).toBeInTheDocument();
  });

  it("filters model options when a specific provider is selected", async () => {
    const user = userEvent.setup();
    render(
      <PresetForm
        templateSets={mockTemplates}
        availableModels={mockAvailableModels}
        onSubmit={vi.fn()}
      />
    );

    const providerSelect = screen.getByLabelText(/provider override/i);
    await user.selectOptions(providerSelect, "anthropic");

    const modelSelect = screen.getByLabelText(/model override/i) as HTMLSelectElement;
    const optionTexts = Array.from(modelSelect.options).map((o) => o.text);

    // Should only contain inherit default and anthropic models
    expect(optionTexts.some((t) => t.includes("claude-3-7-sonnet"))).toBe(true);
    expect(optionTexts.some((t) => t.includes("claude-3-5-haiku"))).toBe(true);
    // Should NOT contain gemini or openai models
    expect(optionTexts.some((t) => t.includes("gemini"))).toBe(false);
    expect(optionTexts.some((t) => t.includes("gpt-4o"))).toBe(false);
  });

  it("resets model override when switching to an incompatible provider", async () => {
    const user = userEvent.setup();
    render(
      <PresetForm
        templateSets={mockTemplates}
        availableModels={mockAvailableModels}
        onSubmit={vi.fn()}
      />
    );

    const providerSelect = screen.getByLabelText(/provider override/i);
    const modelSelect = screen.getByLabelText(/model override/i) as HTMLSelectElement;

    // 1. Select anthropic and its model
    await user.selectOptions(providerSelect, "anthropic");
    await user.selectOptions(modelSelect, "claude-3-7-sonnet-20250219");
    expect(modelSelect.value).toBe("claude-3-7-sonnet-20250219");

    // 2. Switch provider to openai
    await user.selectOptions(providerSelect, "openai");
    // Model selection must be cleared because claude is not an openai model
    expect(modelSelect.value).toBe("");
  });

  it("validates required fields on submission", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(
      <PresetForm
        templateSets={mockTemplates}
        onSubmit={handleSubmit}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /save tailoring strategy/i });
    await user.click(submitBtn);

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/strategy name is required/i)).toBeInTheDocument();
  });

  it("submits valid form values successfully with provider, model, and reasoning level", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(
      <PresetForm
        templateSets={mockTemplates}
        availableModels={mockAvailableModels}
        onSubmit={handleSubmit}
      />
    );

    await user.type(screen.getByLabelText(/strategy name/i), "My Custom Tech Preset");
    await user.type(
      screen.getByLabelText(/^description/i),
      "Optimized for high-growth tech start-ups."
    );
    await user.selectOptions(
      screen.getByLabelText(/template set/i),
      "builtin-standard-clean"
    );
    await user.type(
      screen.getByLabelText(/system instructions/i),
      "Focus on impact and distributed systems."
    );
    await user.selectOptions(
      screen.getByLabelText(/provider override/i),
      "anthropic"
    );
    await user.selectOptions(
      screen.getByLabelText(/model override/i),
      "claude-3-7-sonnet-20250219"
    );
    await user.selectOptions(
      screen.getByLabelText(/reasoning level/i),
      "high"
    );
    await user.click(
      screen.getByLabelText(/include administrative & immigration fields/i)
    );

    const submitBtn = screen.getByRole("button", { name: /save tailoring strategy/i });
    await user.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({
      name: "My Custom Tech Preset",
      description: "Optimized for high-growth tech start-ups.",
      template_set_id: "builtin-standard-clean",
      system_instructions: "Focus on impact and distributed systems.",
      provider_override: "anthropic",
      model_override: "claude-3-7-sonnet-20250219",
      reasoning_level: "high",
      include_admin_fields: true,
    });
  });

  it("appends constraints builder output into system instructions", async () => {
    const user = userEvent.setup();
    render(
      <PresetForm
        templateSets={mockTemplates}
        onSubmit={vi.fn()}
      />
    );

    const instructionsTextarea = screen.getByLabelText(/system instructions/i);
    await user.type(instructionsTextarea, "Base instructions.");

    const applyConstraintsBtn = screen.getByRole("button", {
      name: /apply constraints to instructions/i,
    });
    await user.click(applyConstraintsBtn);

    expect((instructionsTextarea as HTMLTextAreaElement).value).toContain(
      "Base instructions."
    );
    expect((instructionsTextarea as HTMLTextAreaElement).value).toContain(
      "Target Length: Strict 1-page max"
    );
  });

  it("enforces immutability guard in read-only mode for built-in system presets", () => {
    render(
      <PresetForm
        isBuiltIn={true}
        initialValues={{
          id: "builtin-1-page-tech-resume",
          name: "1-Page Tech Resume",
          description: "Strict 1-page max format",
          system_instructions: "Focus on impact",
          template_set_id: "builtin-standard-clean",
          provider_override: "gemini",
          model_override: "gemini-3.8-flash",
          reasoning_level: "medium",
          is_built_in: true,
        }}
        templateSets={mockTemplates}
        availableModels={mockAvailableModels}
        onSubmit={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );

    // Read-only banner is displayed
    expect(screen.getByText(/system strategy \(read-only\)/i)).toBeInTheDocument();

    // Inputs and selects must be disabled
    expect(screen.getByLabelText(/strategy name/i)).toBeDisabled();
    expect(screen.getByLabelText(/^description/i)).toBeDisabled();
    expect(screen.getByLabelText(/template set/i)).toBeDisabled();
    expect(screen.getByLabelText(/system instructions/i)).toBeDisabled();
    expect(screen.getByLabelText(/provider override/i)).toBeDisabled();
    expect(screen.getByLabelText(/model override/i)).toBeDisabled();
    expect(screen.getByLabelText(/reasoning level/i)).toBeDisabled();

    // Save button must not be rendered
    expect(
      screen.queryByRole("button", { name: /save tailoring strategy/i })
    ).not.toBeInTheDocument();

    // Duplicate action is offered
    expect(
      screen.getByRole("button", { name: /duplicate as custom/i })
    ).toBeInTheDocument();
  });

  it("submits empty strings to reset overrides when editing an existing preset", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <PresetForm
        initialValues={{
          id: "preset-custom-001",
          name: "Existing Custom Preset",
          template_set_id: "builtin-standard-clean",
          system_instructions: "Existing instructions.",
          provider_override: "anthropic",
          model_override: "claude-3-7-sonnet-20250219",
          reasoning_level: "high",
        }}
        templateSets={mockTemplates}
        availableModels={mockAvailableModels}
        onSubmit={handleSubmit}
      />
    );

    const providerSelect = screen.getByLabelText(/provider override/i);
    const modelSelect = screen.getByLabelText(/model override/i);
    const reasoningSelect = screen.getByLabelText(/reasoning level/i);

    // Reset all overrides to inherit/default ("")
    await user.selectOptions(providerSelect, "");
    await user.selectOptions(modelSelect, "");
    await user.selectOptions(reasoningSelect, "");

    const submitBtn = screen.getByRole("button", { name: /save tailoring strategy/i });
    await user.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Existing Custom Preset",
        provider_override: "",
        model_override: "",
        reasoning_level: "",
      })
    );
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = render(
      <PresetForm
        templateSets={mockTemplates}
        availableModels={mockAvailableModels}
        onSubmit={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
