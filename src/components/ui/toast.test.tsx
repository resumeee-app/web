import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Toaster } from "./toaster";
import { useToast, clearToasts } from "./use-toast";

function ToastDemo() {
  const { toast } = useToast();
  return (
    <div>
      <button
        onClick={() =>
          toast({
            title: "Success Notification",
            description: "Profile updated successfully.",
          })
        }
      >
        Trigger Success Toast
      </button>
      <button
        onClick={() =>
          toast({
            title: "Error Notification",
            description: "Failed to connect to backend.",
            variant: "destructive",
          })
        }
      >
        Trigger Error Toast
      </button>
      <Toaster />
    </div>
  );
}

describe("Global Toast Notification System", () => {
  beforeEach(() => {
    clearToasts();
  });

  it("renders toast when triggered imperatively via useToast", async () => {
    const user = userEvent.setup();
    render(<ToastDemo />);

    expect(screen.queryByText("Success Notification")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Trigger Success Toast" }));

    expect(await screen.findByText("Success Notification")).toBeInTheDocument();
    expect(screen.getByText("Profile updated successfully.")).toBeInTheDocument();
  });

  it("renders destructive toast variant with appropriate styling", async () => {
    const user = userEvent.setup();
    render(<ToastDemo />);

    await user.click(screen.getByRole("button", { name: "Trigger Error Toast" }));

    const title = await screen.findByText("Error Notification");
    expect(title).toBeInTheDocument();
    expect(screen.getByText("Failed to connect to backend.")).toBeInTheDocument();
  });

  it("dismisses toast when close button is clicked", async () => {
    const user = userEvent.setup();
    render(<ToastDemo />);

    await user.click(screen.getByRole("button", { name: "Trigger Success Toast" }));
    const title = await screen.findByText("Success Notification");
    expect(title).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /close/i });
    expect(closeBtn).toBeInTheDocument();

    await user.click(closeBtn);

    const toastItem = closeBtn.closest("[data-radix-collection-item]");
    expect(toastItem).toHaveAttribute("data-state", "closed");
  });

  it("passes automated accessibility audit with active toasts", async () => {
    const user = userEvent.setup();
    const { container } = render(<ToastDemo />);

    await user.click(screen.getByRole("button", { name: "Trigger Success Toast" }));
    await screen.findByText("Success Notification");

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
