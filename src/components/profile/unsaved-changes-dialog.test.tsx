import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { UnsavedChangesDialog } from "./unsaved-changes-dialog";

describe("UnsavedChangesDialog", () => {
  it("renders alert dialog with title, description, and action buttons when open", () => {
    render(
      <UnsavedChangesDialog
        open={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(
      screen.getByRole("alertdialog", { name: /Unsaved Changes/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/You have unsaved changes in your profile/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Discard Changes/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Stay on Page/i })
    ).toBeInTheDocument();
  });

  it("calls onConfirm when clicking Discard Changes", async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    render(
      <UnsavedChangesDialog
        open={true}
        onConfirm={handleConfirm}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Discard Changes/i }));
    expect(handleConfirm).toHaveBeenCalled();
  });

  it("calls onCancel when clicking Stay on Page", async () => {
    const user = userEvent.setup();
    const handleCancel = vi.fn();
    render(
      <UnsavedChangesDialog
        open={true}
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    await user.click(screen.getByRole("button", { name: /Stay on Page/i }));
    expect(handleCancel).toHaveBeenCalled();
  });

  it("passes axe-core accessibility audit", async () => {
    const { container } = render(
      <UnsavedChangesDialog
        open={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
