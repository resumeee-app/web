import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { axe } from "vitest-axe";
import { Header } from "./header";
import { ThemeProvider } from "@/lib/theme-provider";
import { mainNavItems } from "./nav-config";

function renderHeader(initialRoute = "/") {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Header />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe("Header and Navigation", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("renders semantic header and main navigation landmarks", () => {
    renderHeader();

    expect(screen.getByRole("banner")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Main Navigation" });
    expect(nav).toBeInTheDocument();
  });

  it("renders all data-driven navigation items", () => {
    renderHeader();

    for (const item of mainNavItems) {
      const links = screen.getAllByRole("link", { name: new RegExp(item.title, "i") });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute("href", item.href);
    }
  });

  it("marks active route link correctly", () => {
    renderHeader("/profile");

    const profileLinks = screen.getAllByRole("link", { name: /master profile/i });
    expect(profileLinks[0]).toHaveAttribute("aria-current", "page");

    const dashboardLinks = screen.getAllByRole("link", { name: /dashboard/i });
    expect(dashboardLinks[0]).not.toHaveAttribute("aria-current", "page");
  });

  it("allows switching theme via theme toggle dropdown", async () => {
    const user = userEvent.setup();
    renderHeader();

    const themeButton = screen.getByRole("button", { name: /theme/i });
    await user.click(themeButton);

    const darkOption = await screen.findByRole("menuitem", { name: /dark/i });
    await user.click(darkOption);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("resumeee-theme")).toBe("dark");
  });

  it("opens mobile navigation drawer on trigger click and closes on Escape", async () => {
    const user = userEvent.setup();
    renderHeader();

    const menuButton = screen.getByRole("button", { name: /open navigation menu/i });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(menuButton);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("passes automated axe accessibility check in default and mobile-open states", async () => {
    const user = userEvent.setup();
    const { container } = renderHeader();

    let results = await axe(container);
    expect(results).toHaveNoViolations();

    const menuButton = screen.getByRole("button", { name: /open navigation menu/i });
    await user.click(menuButton);
    await screen.findByRole("dialog");

    results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
