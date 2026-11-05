import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { axe } from "vitest-axe";
import { HomePage } from "./home-page";

/**
 * Unit test suite for the HomePage component and its modal dialog interactions.
 */
describe("HomePage Component", () => {
  it("renders page header and navigation cards correctly", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { level: 1, name: /resume management/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create resume/i })
    ).toBeInTheDocument();
  });

  it("opens create branch dialog with at least 720px width and mobile responsive sizing", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const createBtn = screen.getByRole("button", { name: /create resume/i });
    await user.click(createBtn);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /create new resume branch/i })
    ).toBeInTheDocument();

    // Verify 720px responsive modal sizing classes
    expect(dialog).toHaveClass("sm:max-w-[720px]");
    expect(dialog).toHaveClass("w-full");
    expect(dialog).toHaveClass("max-h-[90vh]");
    expect(dialog).toHaveClass("overflow-y-auto");

    // Negative assertions ensuring narrow constraints are not applied
    expect(dialog).not.toHaveClass("max-w-md");
    expect(dialog).not.toHaveClass("sm:max-w-[500px]");

    // Verify dialog can be dismissed
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelBtn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("passes axe-core accessibility audit with dialog closed and open", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    let results = await axe(container);
    expect(results).toHaveNoViolations();

    // Open modal dialog and audit accessibility
    await user.click(screen.getByRole("button", { name: /create resume/i }));
    const dialog = screen.getByRole("dialog");
    results = await axe(dialog);
    expect(results).toHaveNoViolations();
  });
});
