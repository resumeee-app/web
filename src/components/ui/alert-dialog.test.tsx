import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

describe("AlertDialog Primitive Component", () => {
  it("renders trigger and opens alertdialog content on user click", async () => {
    const user = userEvent.setup();
    render(
      <AlertDialog>
        <AlertDialogTrigger>Delete Branch</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your resume branch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /delete branch/i }));

    const alertDialog = screen.getByRole("alertdialog");
    expect(alertDialog).toBeInTheDocument();
    expect(screen.getByText("Are you absolutely sure?")).toBeInTheDocument();
  });

  it("handles confirmation and cancellation button clicks", async () => {
    const user = userEvent.setup();
    let actionTriggered = false;

    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>Please confirm.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abort</AlertDialogCancel>
            <AlertDialogAction onClick={() => { actionTriggered = true; }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );

    const confirmBtn = screen.getByRole("button", { name: /confirm/i });
    await user.click(confirmBtn);
    expect(actionTriggered).toBe(true);
  });

  it("closes upon clicking Cancel", async () => {
    const user = userEvent.setup();
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelable Alert</AlertDialogTitle>
            <AlertDialogDescription>Press Cancel to abort.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelBtn);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("has zero accessibility violations according to axe-core", async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accessible Alert Dialog</AlertDialogTitle>
            <AlertDialogDescription>
              This alertdialog satisfies WAI-ARIA alertdialog requirements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Proceed</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );

    const dialog = screen.getByRole("alertdialog");
    const results = await axe(dialog);
    expect(results).toHaveNoViolations();
  });
});
