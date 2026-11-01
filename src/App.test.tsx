import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import App from "./App";

describe("Application Root Component", () => {
  it("renders header landmark, skip-to-content link, and dashboard title", () => {
    render(<App />);

    // Accessible skip link
    const skipLink = screen.getByRole("link", { name: /skip to main content/i });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");

    // Landmark header navigation
    const nav = screen.getByRole("navigation", { name: /main navigation/i });
    expect(nav).toBeInTheDocument();

    // Primary page heading
    const heading = screen.getByRole("heading", { level: 1, name: /resume management/i });
    expect(heading).toBeInTheDocument();
  });

  it("verifies main landmark exists with id main-content", () => {
    const { container } = render(<App />);
    const main = container.querySelector("main#main-content");
    expect(main).toBeInTheDocument();
  });

  it("passes axe-core accessibility audit on initial page render", async () => {
    const { container } = render(<App />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
