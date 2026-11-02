import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import {
  ToastProvider,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastViewport,
} from "./workbench-toast";

describe("Toast Component", () => {
  it("renders toast with title, description, and close button", () => {
    render(
      <ToastProvider>
        <Toast open={true}>
          <ToastTitle>Tailoring Completed</ToastTitle>
          <ToastDescription>New resume version v2 created.</ToastDescription>
          <ToastClose aria-label="Close" />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );

    expect(screen.getByText("Tailoring Completed")).toBeInTheDocument();
    expect(
      screen.getByText("New resume version v2 created.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("passes accessibility audit with 0 violations", async () => {
    const { container } = render(
      <ToastProvider>
        <Toast open={true}>
          <ToastTitle>Generation Notification</ToastTitle>
          <ToastDescription>Notification content goes here.</ToastDescription>
          <ToastClose aria-label="Dismiss notification" />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
