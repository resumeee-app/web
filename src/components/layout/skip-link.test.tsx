import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { SkipLink } from "./skip-link";

describe("SkipLink component", () => {
  it("renders an accessible link targeting #main-content by default", () => {
    render(<SkipLink />);
    const link = screen.getByRole("link", { name: /skip to main content/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "#main-content");
  });

  it("supports custom targetId and custom label", () => {
    render(<SkipLink targetId="custom-target">Skip to navigation</SkipLink>);
    const link = screen.getByRole("link", { name: /skip to navigation/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "#custom-target");
  });

  it("includes screen-reader-only styling by default and focus visibility classes", () => {
    render(<SkipLink />);
    const link = screen.getByRole("link", { name: /skip to main content/i });
    expect(link.className).toContain("sr-only");
    expect(link.className).toContain("focus:not-sr-only");
  });

  it("passes automated accessibility audit with 0 violations", async () => {
    const { container } = render(
      <div>
        <SkipLink />
        <main id="main-content">
          <h1>Main Content Area</h1>
        </main>
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
