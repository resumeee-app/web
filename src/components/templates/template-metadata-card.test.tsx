/**
 * @file template-metadata-card.test.tsx
 * @description Unit and accessibility tests for the full-width TemplateMetadataCard component.
 */

import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { TemplateMetadataCard, METADATA_INPUT_CLASS } from "./template-metadata-card";

/**
 * Stateful test harness ensuring controlled input mutations reflect across all keystrokes.
 */
const StatefulTestHarness: React.FC<{
  initialName?: string;
  initialDescription?: string;
  readOnly?: boolean;
  onChangeSpy?: (updates: { name?: string; description?: string }) => void;
}> = ({ initialName = "", initialDescription = "", readOnly, onChangeSpy }) => {
  const [data, setData] = React.useState({
    name: initialName,
    description: initialDescription,
  });

  return (
    <TemplateMetadataCard
      name={data.name}
      description={data.description}
      readOnly={readOnly}
      onChange={(updates) => {
        onChangeSpy?.(updates);
        setData((prev) => ({ ...prev, ...updates }));
      }}
    />
  );
};

describe("TemplateMetadataCard Component", () => {
  it("renders with a 100% full-width container class", () => {
    const { container } = render(
      <TemplateMetadataCard
        name="Executive Clean"
        description="A modern executive layout."
        onChange={vi.fn()}
      />
    );

    const card = container.firstElementChild as HTMLElement;
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass("w-full");
    expect(card).toHaveAttribute("data-testid", "template-metadata-card");
  });

  it("applies the METADATA_INPUT_CLASS constant to both name and description inputs", () => {
    render(
      <TemplateMetadataCard
        name="Test"
        description="Test description"
        onChange={vi.fn()}
      />
    );

    const nameInput = screen.getByLabelText(/template name/i);
    const descInput = screen.getByLabelText(/description/i);

    expect(nameInput.className).toBe(METADATA_INPUT_CLASS);
    expect(descInput.className).toBe(METADATA_INPUT_CLASS);
  });

  it("renders accessible label associations and required indicators", () => {
    render(
      <TemplateMetadataCard
        name=""
        description=""
        onChange={vi.fn()}
      />
    );

    const nameInput = screen.getByLabelText(/template name/i);
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeRequired();
    expect(nameInput).toHaveAttribute("id", "template-name");

    const descInput = screen.getByLabelText(/description/i);
    expect(descInput).toBeInTheDocument();
    expect(descInput).not.toBeRequired();
    expect(descInput).toHaveAttribute("id", "template-description");
  });

  it("triggers onChange when user edits template name or description with full value updates", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <StatefulTestHarness
        initialName="Tech"
        initialDescription="Initial"
        onChangeSpy={handleChange}
      />
    );

    const nameInput = screen.getByLabelText(/template name/i);
    await user.type(nameInput, " Modern");
    expect(nameInput).toHaveValue("Tech Modern");
    expect(handleChange).toHaveBeenLastCalledWith({ name: "Tech Modern" });

    const descInput = screen.getByLabelText(/description/i);
    await user.type(descInput, " Description");
    expect(descInput).toHaveValue("Initial Description");
    expect(handleChange).toHaveBeenLastCalledWith({ description: "Initial Description" });

    // Test clearing inputs
    await user.clear(nameInput);
    expect(nameInput).toHaveValue("");
    expect(handleChange).toHaveBeenLastCalledWith({ name: "" });

    await user.clear(descInput);
    expect(descInput).toHaveValue("");
    expect(handleChange).toHaveBeenLastCalledWith({ description: "" });
  });

  it("disables inputs when readOnly is true", () => {
    render(
      <TemplateMetadataCard
        name="Builtin Standard"
        description="Immutable system template."
        onChange={vi.fn()}
        readOnly={true}
      />
    );

    const nameInput = screen.getByLabelText(/template name/i);
    expect(nameInput).toBeDisabled();

    const descInput = screen.getByLabelText(/description/i);
    expect(descInput).toBeDisabled();
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = render(
      <TemplateMetadataCard
        name="Accessible Template"
        description="Testing accessibility conformance."
        onChange={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
