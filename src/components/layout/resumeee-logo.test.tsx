import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ResumeeeLogo } from "./resumeee-logo";

describe("ResumeeeLogo", () => {
  it("renders an accessible SVG with default dimensions and classNames", () => {
    const { container } = render(<ResumeeeLogo className="h-8 w-8 test-logo" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("viewBox", "0 0 64 64");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveClass("h-8", "w-8", "test-logo", "shrink-0");
  });

  it("contains both light and dark theme background rects with appropriate theme classes", () => {
    const { container } = render(<ResumeeeLogo />);
    const lightRects = container.querySelectorAll("rect.dark\\:hidden");
    const darkRects = container.querySelectorAll("rect.hidden.dark\\:block");

    expect(lightRects.length).toBe(2);
    expect(darkRects.length).toBe(2);

    // Light background uses light theme gradient URL
    const lightBg = lightRects[0];
    expect(lightBg).toHaveAttribute("fill", expect.stringMatching(/url\(#.*-gt-bg-light\)/));

    // Dark background uses dark theme gradient URL
    const darkBg = darkRects[0];
    expect(darkBg).toHaveAttribute("fill", expect.stringMatching(/url\(#.*-gt-bg-dark\)/));
  });

  it("contains both light and dark glyph groups with responsive theme classes", () => {
    const { container } = render(<ResumeeeLogo />);
    const lightGroup = container.querySelector("g.dark\\:hidden");
    const darkGroup = container.querySelector("g.hidden.dark\\:block");

    expect(lightGroup).toBeInTheDocument();
    expect(darkGroup).toBeInTheDocument();

    // Verify commit nodes and branch nodes exist in both groups
    expect(lightGroup?.querySelectorAll("circle").length).toBe(6);
    expect(darkGroup?.querySelectorAll("circle").length).toBe(6);
  });
});
