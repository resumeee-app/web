import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Badge } from "./badge";

describe("Badge Component", () => {
  it("renders with default styling and children text", () => {
    render(<Badge>Default Badge</Badge>);
    expect(screen.getByText("Default Badge")).toBeInTheDocument();
  });

  it("applies status-specific variants", () => {
    const { rerender } = render(<Badge variant="success">Completed</Badge>);
    expect(screen.getByText("Completed")).toHaveClass("bg-emerald-50");

    rerender(<Badge variant="warning">Warnings</Badge>);
    expect(screen.getByText("Warnings")).toHaveClass("bg-amber-50");

    rerender(<Badge variant="destructive">Failed</Badge>);
    expect(screen.getByText("Failed")).toHaveClass("bg-rose-50");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Badge variant="info">Active</Badge>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
