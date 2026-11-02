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
  it("renders form fields for creating a custom preset", () => {
    render(
      <PresetForm
        templateSets={mockTemplates}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/preset name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/template set/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/system instructions/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/provider override/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/model override/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/include administrative & immigration fields/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /save preset/i })
    ).toBeInTheDocument();
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

    const submitBtn = screen.getByRole("button", { name: /save preset/i });
    await user.click(submitBtn);

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/preset name is required/i)).toBeInTheDocument();
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

    await user.type(screen.getByLabelText(/preset name/i), "My Custom Tech Preset");
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
    await user.click(
      screen.getByLabelText(/include administrative & immigration fields/i)
    );

    const submitBtn = screen.getByRole("button", { name: /save preset/i });
    await user.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({
      name: "My Custom Tech Preset",
      description: "Optimized for high-growth tech start-ups.",
      template_set_id: "builtin-standard-clean",
      system_instructions: "Focus on impact and distributed systems.",
      provider_override: undefined,
      model_override: undefined,
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
          is_built_in: true,
        }}
        templateSets={mockTemplates}
        onSubmit={vi.fn()}
        onDuplicate={vi.fn()}
      />
    );

    // Read-only banner is displayed
    expect(screen.getByText(/system preset \(read-only\)/i)).toBeInTheDocument();

    // Inputs must be disabled
    expect(screen.getByLabelText(/preset name/i)).toBeDisabled();
    expect(screen.getByLabelText(/^description/i)).toBeDisabled();
    expect(screen.getByLabelText(/template set/i)).toBeDisabled();
    expect(screen.getByLabelText(/system instructions/i)).toBeDisabled();

    // Save button must not be rendered or is disabled
    expect(
      screen.queryByRole("button", { name: /save preset/i })
    ).not.toBeInTheDocument();

    // Duplicate action is offered
    expect(
      screen.getByRole("button", { name: /duplicate as custom/i })
    ).toBeInTheDocument();
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
});
