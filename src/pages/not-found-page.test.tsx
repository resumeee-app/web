import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { axe } from "vitest-axe";
import { NotFoundPage } from "./not-found-page";

describe("NotFoundPage Component & 404 Routing", () => {
  it("renders NotFoundPage with accessible heading and recovery link", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    // Primary 404 heading
    const heading = screen.getByRole("heading", {
      level: 1,
      name: /page not found/i,
    });
    expect(heading).toBeInTheDocument();

    // Contextual description
    expect(
      screen.getByText(/the requested page could not be located/i)
    ).toBeInTheDocument();

    // Recovery link targeting "/"
    const recoveryLink = screen.getByRole("link", {
      name: /return to dashboard/i,
    });
    expect(recoveryLink).toBeInTheDocument();
    expect(recoveryLink).toHaveAttribute("href", "/");
  });

  it("navigates to dashboard when recovery link is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/unregistered-path-404"]}>
        <Routes>
          <Route path="/" element={<h1>Resume Management</h1>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { level: 1, name: /page not found/i })
    ).toBeInTheDocument();

    const recoveryLink = screen.getByRole("link", {
      name: /return to dashboard/i,
    });
    await user.click(recoveryLink);

    // After clicking return to dashboard, home page heading should be rendered
    const homeHeading = screen.getByRole("heading", {
      level: 1,
      name: /resume management/i,
    });
    expect(homeHeading).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 1, name: /page not found/i })
    ).not.toBeInTheDocument();
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
