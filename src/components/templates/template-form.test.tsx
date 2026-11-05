/**
 * @file template-form.test.tsx
 * @description Comprehensive unit and accessibility test suite for the composite TemplateForm component.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { TemplateForm, type TemplateFormData } from "./template-form";

const mockInitialData: TemplateFormData = {
  name: "Executive Clean",
  description: "Senior engineering resume format",
  htmlTemplate: "<h1>{{.FullName}}</h1>",
  cssStyles: "h1 { color: #1e3a8a; }",
  markdownTemplate: "# {{.FullName}}",
  textTemplate: "{{.FullName}}",
};

describe("TemplateForm Component", () => {
  it("renders both TemplateMetadataCard and TemplateCodeEditor with initial field values", () => {
    const { container } = render(
      <TemplateForm
        data={mockInitialData}
        onChange={vi.fn()}
      />
    );

    // Metadata card
    expect(screen.getByTestId("template-metadata-card")).toBeInTheDocument();
    expect(screen.getByLabelText(/template name/i)).toHaveValue("Executive Clean");
    expect(screen.getByLabelText(/description/i)).toHaveValue("Senior engineering resume format");

    // Code editor tabs
    expect(screen.getByRole("tab", { name: /html/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /css/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /markdown/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /plain text/i })).toBeInTheDocument();

    // Container width
    const rootDiv = container.firstElementChild as HTMLElement;
    expect(rootDiv).toHaveClass("w-full");
  });

  it("forwards metadata changes to onChange handler", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <TemplateForm
        data={mockInitialData}
        onChange={handleChange}
      />
    );

    const nameInput = screen.getByLabelText(/template name/i);
    await user.type(nameInput, " Plus");
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.any(String) })
    );

    const descInput = screen.getByLabelText(/description/i);
    await user.type(descInput, " Updated");
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.any(String) })
    );
  });

  it("forwards template code changes to onChange handler", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <TemplateForm
        data={mockInitialData}
        onChange={handleChange}
      />
    );

    const htmlEditor = screen.getByLabelText(/html template code/i);
    await user.type(htmlEditor, "<div>New</div>");
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ htmlTemplate: expect.any(String) })
    );
  });

  it("enforces readOnly state across metadata inputs and code editor textareas", () => {
    render(
      <TemplateForm
        data={mockInitialData}
        onChange={vi.fn()}
        readOnly={true}
      />
    );

    expect(screen.getByLabelText(/template name/i)).toBeDisabled();
    expect(screen.getByLabelText(/description/i)).toBeDisabled();
    expect(screen.getByLabelText(/html template code/i)).toHaveAttribute("readonly");
  });

  it("displays server error diagnostics when serverError prop is passed", () => {
    render(
      <TemplateForm
        data={mockInitialData}
        onChange={vi.fn()}
        serverError={{
          message: "Parse error on line 4",
          details: "Unexpected end of template action",
        }}
      />
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/unexpected end of template action/i);
  });

  it("merges custom className onto root container", () => {
    const { container } = render(
      <TemplateForm
        data={mockInitialData}
        onChange={vi.fn()}
        className="custom-form-class"
      />
    );

    const rootDiv = container.firstElementChild as HTMLElement;
    expect(rootDiv).toHaveClass("custom-form-class");
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = render(
      <TemplateForm
        data={mockInitialData}
        onChange={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
