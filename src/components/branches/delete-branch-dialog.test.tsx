import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { DeleteBranchDialog } from "./delete-branch-dialog";
import type { Branch } from "@/api/branch-queries";

describe("DeleteBranchDialog Component", () => {
  const branchToDelete: Branch = {
    id: "branch-test-1",
    user_id: "u1",
    name: "Amazon SDE III",
    template_set_id: "tmpl-standard",
    is_default: false,
  };

  const defaultBranch: Branch = {
    id: "branch-default-u1",
    user_id: "u1",
    name: "Master Profile (Default)",
    template_set_id: "tmpl-standard",
    is_default: true,
  };

  it("renders alert dialog with destructive confirmation for non-default branch", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <DeleteBranchDialog
        branch={branchToDelete}
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    );

    // Dialog elements
    expect(
      screen.getByRole("alertdialog", { name: /delete branch/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/are you sure you want to delete branch 'amazon sde iii'\?/i)
    ).toBeInTheDocument();

    // Cancel action
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    expect(cancelBtn).toBeInTheDocument();

    // Confirm action
    const confirmBtn = screen.getByRole("button", { name: /confirm delete/i });
    expect(confirmBtn).toBeInTheDocument();

    await user.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledWith(branchToDelete);
  });

  it("blocks deletion confirmation if default branch is accidentally passed", () => {
    const onConfirm = vi.fn();
    render(
      <DeleteBranchDialog
        branch={defaultBranch}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    expect(
      screen.getByText(/default branch cannot be deleted/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /confirm delete/i })
    ).not.toBeInTheDocument();
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = render(
      <DeleteBranchDialog
        branch={branchToDelete}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
