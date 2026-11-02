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
    expect(screen.getByLabelText(/preset/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/template set \*/i)).toBeInTheDocument();
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
});
