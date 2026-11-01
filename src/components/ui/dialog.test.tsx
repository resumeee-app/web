import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

describe("Dialog Primitive Component", () => {
  it("renders trigger and opens dialog content on user click", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open Modal</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile Details</DialogTitle>
            <DialogDescription>Update your contact information.</DialogDescription>
          </DialogHeader>
          <p>Dialog body text</p>
        </DialogContent>
      </Dialog>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /open modal/i }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Edit Profile Details")).toBeInTheDocument();
    expect(screen.getByText("Update your contact information.")).toBeInTheDocument();
  });

  it("closes when user clicks the accessible close button", async () => {
    const user = userEvent.setup();
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modal Dialog</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const closeBtn = screen.getByRole("button", { name: /close/i });
    await user.click(closeBtn);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes upon pressing the Escape key", async () => {
    const user = userEvent.setup();
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismissible Dialog</DialogTitle>
            <DialogDescription>Press Escape to dismiss</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("has zero accessibility violations when dialog is open", async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accessible Modal Window</DialogTitle>
            <DialogDescription>
              This dialog conforms to WAI-ARIA modal guidelines.
            </DialogDescription>
          </DialogHeader>
          <div>Body content inside accessible container.</div>
        </DialogContent>
      </Dialog>
    );

    const dialog = screen.getByRole("dialog");
    const results = await axe(dialog);
    expect(results).toHaveNoViolations();
  });
});
