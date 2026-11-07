import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { CreateBranchModal } from "./create-branch-modal";
import type { Branch, Preset, TemplateSet } from "@/api/branch-queries";

describe("CreateBranchModal Component", () => {
  const existingBranches: Branch[] = [
    {
      id: "b-1",
      user_id: "u1",
      name: "Existing Tech Lead",
      template_set_id: "tmpl-1",
    },
  ];

  const presets: Preset[] = [
    {
      id: "preset-staff",
      user_id: "system",
      name: "Staff Engineer (System Default)",
      system_instructions: "Emphasize leadership",
      template_set_id: "tmpl-clean",
      is_built_in: true,
    },
  ];

  const templates: TemplateSet[] = [
    {
      id: "tmpl-clean",
      user_id: "system",
      name: "Clean Modern ATS",
      html_template: "<div></div>",
      markdown_template: "# Res",
      text_template: "Res",
    },
    {
      id: "tmpl-academic",
      user_id: "system",
      name: "Detailed Academic CV",
      html_template: "<div></div>",
      markdown_template: "# Res",
      text_template: "Res",
    },
  ];

  it("renders accessible creation dialog with preset and template options", () => {
    render(
      <CreateBranchModal
        open={true}
        onOpenChange={vi.fn()}
        existingBranches={existingBranches}
        presets={presets}
        templates={templates}
        onSubmit={vi.fn()}
      />
    );

    expect(
      screen.getByRole("dialog", { name: /create new resume branch/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /create new resume branch/i })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/branch name \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/target company/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/target role/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tailoring strategy/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/template set \*/i)).toBeInTheDocument();
  });

  it("renders with at least 720px width and mobile responsive sizing classes", () => {
    render(
      <CreateBranchModal
        open={true}
        onOpenChange={vi.fn()}
        existingBranches={existingBranches}
        presets={presets}
        templates={templates}
        onSubmit={vi.fn()}
      />
    );

    const dialog = screen.getByRole("dialog", { name: /create new resume branch/i });
    expect(dialog).toHaveClass("sm:max-w-[720px]");
    expect(dialog).not.toHaveClass("sm:max-w-xl");
    expect(dialog).toHaveClass("w-full");
    expect(dialog).toHaveClass("max-h-[90vh]");
    expect(dialog).toHaveClass("overflow-y-auto");
  });

  it("validates required name field before submission", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <CreateBranchModal
        open={true}
        onOpenChange={vi.fn()}
        existingBranches={existingBranches}
        presets={presets}
        templates={templates}
        onSubmit={onSubmit}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /create branch/i });
    await user.click(submitBtn);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/branch name is required/i)).toBeInTheDocument();
  });

  it("validates name uniqueness against existing branches", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <CreateBranchModal
        open={true}
        onOpenChange={vi.fn()}
        existingBranches={existingBranches}
        presets={presets}
        templates={templates}
        onSubmit={onSubmit}
      />
    );

    const nameInput = screen.getByLabelText(/branch name \*/i);
    await user.type(nameInput, "Existing Tech Lead");

    const submitBtn = screen.getByRole("button", { name: /create branch/i });
    await user.click(submitBtn);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText(/a branch with this name already exists/i)
    ).toBeInTheDocument();
  });

  it("submits valid form inputs with selected preset and template", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <CreateBranchModal
        open={true}
        onOpenChange={vi.fn()}
        existingBranches={existingBranches}
        presets={presets}
        templates={templates}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText(/branch name \*/i), "Google Staff SWE");
    await user.type(screen.getByLabelText(/target company/i), "Google");
    await user.type(screen.getByLabelText(/target role/i), "Staff Software Engineer");

    const submitBtn = screen.getByRole("button", { name: /create branch/i });
    await user.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Google Staff SWE",
      target_company: "Google",
      target_role: "Staff Software Engineer",
      preset_id: "preset-staff",
      tailoring_strategy_id: "preset-staff",
      template_set_id: "tmpl-clean",
      target_requirements: "",
      branch_instructions: "",
      custom_directives: "",
    });
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = render(
      <CreateBranchModal
        open={true}
        onOpenChange={vi.fn()}
        existingBranches={existingBranches}
        presets={presets}
        templates={templates}
        onSubmit={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("handles 3-step progressive wizard flow and theme auto-suggestion without clobbering manual choice", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    const multiPresets: Preset[] = [
      {
        id: "preset-staff",
        user_id: "system",
        name: "Staff Engineer",
        system_instructions: "Emphasize leadership",
        template_set_id: "tmpl-clean",
        suggested_theme_id: "tmpl-clean",
        is_built_in: true,
      },
      {
        id: "preset-academic",
        user_id: "system",
        name: "Academic Researcher",
        system_instructions: "Emphasize publications",
        template_set_id: "tmpl-academic",
        suggested_theme_id: "tmpl-academic",
        is_built_in: false,
      },
    ];

    render(
      <CreateBranchModal
        open={true}
        onOpenChange={vi.fn()}
        existingBranches={existingBranches}
        presets={multiPresets}
        templates={templates}
        onSubmit={onSubmit}
      />
    );

    // Step 1: Fill opportunity context
    await user.type(screen.getByLabelText(/branch name \*/i), "Meta Research Scientist");
    await user.type(screen.getByLabelText(/target company/i), "Meta");
    await user.type(screen.getByLabelText(/target role/i), "Research Scientist");

    // Click Next to advance to Step 2: AI Tailoring
    const nextBtn = screen.getByRole("button", { name: /next: ai tailoring/i });
    await user.click(nextBtn);

    expect(screen.getByText(/step 2: ai tailoring strategy/i)).toBeInTheDocument();

    // Select Academic Researcher strategy which suggests tmpl-academic
    const academicStrategyCard = screen.getByLabelText(/academic researcher/i);
    await user.click(academicStrategyCard);

    // Click Next to advance to Step 3: Visual Design
    const nextDesignBtn = screen.getByRole("button", { name: /next: visual design/i });
    await user.click(nextDesignBtn);

    expect(screen.getByText(/step 3: visual layout & design/i)).toBeInTheDocument();

    // Verify template was auto-suggested to tmpl-academic
    const templateSelect = screen.getByLabelText(/template set \*/i) as HTMLSelectElement;
    expect(templateSelect.value).toBe("tmpl-academic");

    // User explicitly changes template to tmpl-clean (manual selection)
    const cleanThemeCard = screen.getByLabelText(/clean modern ats/i);
    await user.click(cleanThemeCard);
    expect(templateSelect.value).toBe("tmpl-clean");

    // User navigates back to Step 2
    const backBtn = screen.getByRole("button", { name: /back/i });
    await user.click(backBtn);
    expect(screen.getByText(/step 2: ai tailoring strategy/i)).toBeInTheDocument();

    // User selects Staff Engineer strategy (which suggests tmpl-clean, but manual choice should be preserved)
    const staffStrategyCard = screen.getByLabelText(/staff engineer/i);
    await user.click(staffStrategyCard);

    // Advance to Step 3 again
    await user.click(screen.getByRole("button", { name: /next: visual design/i }));

    // User manual choice tmpl-clean was preserved
    expect(templateSelect.value).toBe("tmpl-clean");

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /create branch/i });
    await user.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Meta Research Scientist",
      target_company: "Meta",
      target_role: "Research Scientist",
      preset_id: "preset-staff",
      tailoring_strategy_id: "preset-staff",
      template_set_id: "tmpl-clean",
      target_requirements: "",
      branch_instructions: "",
      custom_directives: "",
    });
  });
});
