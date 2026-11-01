import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Button } from "./button";

describe("Button Primitive Component", () => {
  it("renders with default styles and text content", () => {
    render(<Button>Click Me</Button>);
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-indigo-600");
  });

  it("handles user click events", async () => {
    const user = userEvent.setup();
    let clicked = false;
    render(<Button onClick={() => { clicked = true; }}>Submit</Button>);

    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(clicked).toBe(true);
  });

  it("respects disabled state and prevents user interactions", async () => {
    const user = userEvent.setup();
    let clicked = false;
    render(
      <Button disabled onClick={() => { clicked = true; }}>
        Disabled Action
      </Button>
    );

    const button = screen.getByRole("button", { name: /disabled action/i });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(clicked).toBe(false);
  });

  it("renders as a polymorphic slot when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/profile">Profile Link</a>
      </Button>
    );

    const link = screen.getByRole("link", { name: /profile link/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/profile");
    expect(link).toHaveClass("bg-indigo-600");
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = render(<Button>Accessible Action</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
