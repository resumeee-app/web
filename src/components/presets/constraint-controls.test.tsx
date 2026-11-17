import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ConstraintControls } from "./constraint-controls";

describe("ConstraintControls Component", () => {
  it("renders page constraint, bullets per role, tone selector, and section list", () => {
    render(<ConstraintControls onApplyInstructions={vi.fn()} />);

    expect(
      screen.getByRole("heading", { level: 2, name: /tailoring constraints builder/i })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/target page length/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/maximum bullets per role/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tone & focus/i)).toBeInTheDocument();

    // Verify sections list exists
    expect(screen.getByText("Experience")).toBeInTheDocument();
    expect(screen.getByText("Skills")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Education")).toBeInTheDocument();
    expect(screen.getByText("Certifications")).toBeInTheDocument();
  });

  it("allows keyboard-accessible up and down reordering of sections", async () => {
    const user = userEvent.setup();
    render(<ConstraintControls onApplyInstructions={vi.fn()} />);

    const sections = screen.getAllByRole("listitem");
    expect(sections[0]).toHaveTextContent("Experience");
    expect(sections[1]).toHaveTextContent("Skills");

    // Click "Move down" on the first section (Experience)
    const moveDownBtn = screen.getByRole("button", {
      name: /move experience down/i,
    });
    await user.click(moveDownBtn);

    // Now Skills should be first, and Experience second
    const updatedSections = screen.getAllByRole("listitem");
    expect(updatedSections[0]).toHaveTextContent("Skills");
    expect(updatedSections[1]).toHaveTextContent("Experience");

    // Move Skills down, then move it up
    const moveSkillsUp = screen.getByRole("button", {
      name: /move skills up/i,
    });
    expect(moveSkillsUp).toBeDisabled(); // Already at top
  });

  it("applies constraints into prompt instructions via onApplyInstructions callback", async () => {
    const user = userEvent.setup();
    const handleApply = vi.fn();
    render(<ConstraintControls onApplyInstructions={handleApply} />);

    // Select 1 page max
    await user.selectOptions(screen.getByLabelText(/target page length/i), "1-page");
    // Change bullets per role
    const bulletsInput = screen.getByLabelText(/maximum bullets per role/i);
    await user.clear(bulletsInput);
    await user.type(bulletsInput, "3");

    const applyButton = screen.getByRole("button", {
      name: /apply constraints to instructions/i,
    });
    await user.click(applyButton);

    expect(handleApply).toHaveBeenCalledTimes(1);
    const firstCall = handleApply.mock.calls[0];
    const appliedText = (firstCall && firstCall[0]) || "";
    expect(appliedText).toContain("Target Length: Strict 1-page max");
    expect(appliedText).toContain("Max 3 bullets per role");
    expect(appliedText).toContain("Section Priority:");
  });

  it("disables all controls and reordering buttons when disabled is true (read-only mode)", () => {
    render(<ConstraintControls disabled onApplyInstructions={vi.fn()} />);

    expect(screen.getByLabelText(/target page length/i)).toBeDisabled();
    expect(screen.getByLabelText(/maximum bullets per role/i)).toBeDisabled();
    expect(screen.getByLabelText(/tone & focus/i)).toBeDisabled();

    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      expect(btn).toBeDisabled();
    }
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = render(
      <ConstraintControls onApplyInstructions={vi.fn()} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("uses dark:text-slate-300 for step indicators to satisfy dark mode contrast requirements", () => {
    render(<ConstraintControls onApplyInstructions={vi.fn()} />);
    const stepIndicators = screen.getAllByText(/^\d+\.$/);
    expect(stepIndicators.length).toBeGreaterThan(0);
    for (const indicator of stepIndicators) {
      expect(indicator).toHaveClass("dark:text-slate-300");
      expect(indicator).not.toHaveClass("dark:text-slate-500");
    }
  });
});
