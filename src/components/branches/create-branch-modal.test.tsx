import React from "react";
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
      suggested_theme_id: "tmpl-clean",
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
      template_set_id: "tmpl-clean",
      target_requirements: "",
      branch_instructions: "",
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
        suggested_theme_id: "tmpl-clean",
        is_built_in: true,
      },
      {
        id: "preset-academic",
        user_id: "system",
        name: "Academic Researcher",
        system_instructions: "Emphasize publications",
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
      template_set_id: "tmpl-clean",
      target_requirements: "",
      branch_instructions: "",
    });
  });

  it("renders step badges with dark mode contrast classes", () => {
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

    const step1Badge = screen.getByText("Step 1");
    const step2Badge = screen.getByText("Step 2");
    const step3Badge = screen.getByText("Step 3");

    expect(step1Badge).toHaveClass("dark:text-slate-400");
    expect(step1Badge).not.toHaveClass("dark:text-slate-500");
    expect(step2Badge).toHaveClass("dark:text-slate-400");
    expect(step2Badge).not.toHaveClass("dark:text-slate-500");
    expect(step3Badge).toHaveClass("dark:text-slate-400");
    expect(step3Badge).not.toHaveClass("dark:text-slate-500");
  });

  it("restores focus to trigger button upon modal dismissal via cancel button", async () => {
    const user = userEvent.setup();
    const TestComponent = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Open Branch Modal
          </button>
          <CreateBranchModal
            open={open}
            onOpenChange={setOpen}
            existingBranches={existingBranches}
            presets={presets}
            templates={templates}
            onSubmit={vi.fn()}
          />
        </div>
      );
    };

    render(<TestComponent />);

    const openBtn = screen.getByRole("button", { name: /Open Branch Modal/i });
    await user.click(openBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    await user.click(cancelBtn);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(openBtn).toHaveFocus();
  });

  it("displays non-default language indicator in option label and preset card badge", async () => {
    const user = userEvent.setup();
    const spanishPresets: Preset[] = [
      {
        id: "preset-spanish",
        user_id: "user-1",
        name: "Spanish Tech Lead",
        system_instructions: "Emphasize leadership in Spanish",
        suggested_theme_id: "tmpl-clean",
        language: "Spanish",
      },
    ];

    render(
      <CreateBranchModal
        open={true}
        onOpenChange={vi.fn()}
        existingBranches={existingBranches}
        presets={spanishPresets}
        templates={templates}
        onSubmit={vi.fn()}
      />
    );

    // Verify option label in dropdown on Step 1
    const option = screen.getByRole("option", { name: /Spanish Tech Lead \(Spanish\)/i });
    expect(option).toBeInTheDocument();

    // Fill valid branch name and advance to Step 2
    const nameInput = screen.getByLabelText(/Branch Name/i);
    await user.type(nameInput, "New Spanish Branch");

    const nextBtn = screen.getByRole("button", { name: /Next/i });
    await user.click(nextBtn);

    // Verify preset card renders language badge
    expect(screen.getByText("Spanish Tech Lead")).toBeInTheDocument();
    expect(screen.getByText("Spanish")).toBeInTheDocument();
  });
});
