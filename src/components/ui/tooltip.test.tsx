import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

describe("Tooltip Primitive Component", () => {
  it("renders trigger button with accessible label", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Help Info</TooltipTrigger>
          <TooltipContent>Detailed help text</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    const trigger = screen.getByRole("button", { name: /help info/i });
    expect(trigger).toBeInTheDocument();
  });

  it("reveals tooltip content upon keyboard focus", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>Focusable Trigger</TooltipTrigger>
          <TooltipContent>Helpful context information</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    const trigger = screen.getByRole("button", { name: /focusable trigger/i });
    await user.tab();
    expect(trigger).toHaveFocus();

    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toBeInTheDocument();
      expect(screen.getByText("Helpful context information")).toBeInTheDocument();
    });
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>Accessible Button</TooltipTrigger>
          <TooltipContent>Accessible description</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
