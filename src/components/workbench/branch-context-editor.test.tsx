import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { BranchContextEditor } from "./branch-context-editor";

describe("BranchContextEditor", () => {
  it("renders collapsed by default and allows expanding editor", async () => {
    const user = userEvent.setup();
    render(
      <BranchContextEditor
        targetRequirements="Must know Go and Raft"
        branchInstructions="Keep it concise"
        onSave={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Job Description & Context" })
    ).toBeInTheDocument();

    const toggleButton = screen.getByRole("button", {
      name: /edit job description & context/i,
    });
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");

    await user.click(toggleButton);

    expect(toggleButton).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByLabelText(/job description & target requirements/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/custom branch instructions/i)
    ).toBeInTheDocument();
  });

  it("allows editing requirements and instructions and calls onSave", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <BranchContextEditor
        defaultExpanded={true}
        targetRequirements="Original JD"
        branchInstructions="Original Instructions"
        onSave={onSave}
      />
    );

    const jdTextarea = screen.getByLabelText(
      /job description & target requirements/i
    );
    const instructionsTextarea = screen.getByLabelText(
      /custom branch instructions/i
    );

    await user.clear(jdTextarea);
    await user.type(jdTextarea, "Updated JD with Kubernetes");

    await user.clear(instructionsTextarea);
    await user.type(instructionsTextarea, "Focus on platform reliability");

    const saveButton = screen.getByRole("button", {
      name: /save context/i,
    });
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledWith({
      target_requirements: "Updated JD with Kubernetes",
      branch_instructions: "Focus on platform reliability",
    });
  });

  it("disables save button when isSaving is true", () => {
    render(
      <BranchContextEditor
        defaultExpanded={true}
        targetRequirements="JD"
        branchInstructions="Instructions"
        isSaving={true}
        onSave={vi.fn()}
      />
    );

    const saveButton = screen.getByRole("button", {
      name: /saving changes/i,
    });
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveAttribute("aria-busy", "true");
  });

  it("passes accessibility audit with 0 violations", async () => {
    const { container } = render(
      <BranchContextEditor
        defaultExpanded={true}
        targetRequirements="Staff Engineer JD"
        branchInstructions="Emphasize distributed systems"
        onSave={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
