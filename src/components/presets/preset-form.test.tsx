import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { PresetForm } from "./preset-form";
import type { TemplateSet } from "@/api/preset-queries";

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

describe("PresetForm Component", () => {
  it("renders form fields for creating a custom preset with constrained selects", () => {
    render(
      <PresetForm
        templateSets={mockTemplates}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/strategy name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/template set/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/system instructions/i)).toBeInTheDocument();

    const languageSelect = screen.getByLabelText(/^language/i);
    expect(languageSelect.tagName).toBe("SELECT");
    expect(languageSelect).toHaveValue("English");

    // Provider, Model, and Reasoning Level are moved to Branch Tailoring and omitted from PresetForm
    expect(screen.queryByLabelText(/provider override/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/model override/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/reasoning level/i)).not.toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /save tailoring strategy/i })
    ).toBeInTheDocument();
  });

  it("does not render model or reasoning overrides in preset form", () => {
    render(
      <PresetForm
        templateSets={mockTemplates}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.queryByText(/model overrides & invariant options/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/provider override/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/model override/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/reasoning level/i)).not.toBeInTheDocument();
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

  it("submits valid form values successfully", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(
      <PresetForm
        templateSets={mockTemplates}
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

    const submitBtn = screen.getByRole("button", { name: /save tailoring strategy/i });
    await user.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({
      name: "My Custom Tech Preset",
      description: "Optimized for high-growth tech start-ups.",
      template_set_id: "builtin-standard-clean",
      system_instructions: "Focus on impact and distributed systems.",
      language: "English",
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
          is_built_in: true,
        }}
        templateSets={mockTemplates}
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
    expect(screen.getByLabelText(/^language/i)).toBeDisabled();
    expect(screen.getByLabelText(/system instructions/i)).toBeDisabled();

    // Save button must not be rendered
    expect(
      screen.queryByRole("button", { name: /save tailoring strategy/i })
    ).not.toBeInTheDocument();

    // Duplicate action is offered
    expect(
      screen.getByRole("button", { name: /duplicate as custom/i })
    ).toBeInTheDocument();
  });

  it("submits edited fields without model or reasoning overrides", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <PresetForm
        initialValues={{
          id: "preset-custom-001",
          name: "Existing Custom Preset",
          template_set_id: "builtin-standard-clean",
          system_instructions: "Existing instructions.",
        }}
        templateSets={mockTemplates}
        onSubmit={handleSubmit}
      />
    );

    const nameInput = screen.getByLabelText(/strategy name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Renamed Custom Preset");

    const submitBtn = screen.getByRole("button", { name: /save tailoring strategy/i });
    await user.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Renamed Custom Preset",
      })
    );
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = render(
      <PresetForm
        templateSets={mockTemplates}
        onSubmit={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("allows selecting a supported language and submits it", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <PresetForm
        templateSets={mockTemplates}
        onSubmit={handleSubmit}
      />
    );

    await user.type(screen.getByLabelText(/strategy name/i), "Multilingual Strategy");
    await user.type(screen.getByLabelText(/system instructions/i), "Instructions in Spanish.");

    const languageSelect = screen.getByLabelText(/^language/i);
    await user.selectOptions(languageSelect, "Spanish");
    expect(languageSelect).toHaveValue("Spanish");

    await user.click(screen.getByRole("button", { name: /save tailoring strategy/i }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Multilingual Strategy",
        language: "Spanish",
      })
    );
  });
});
