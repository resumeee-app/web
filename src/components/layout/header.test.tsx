import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "vitest-axe";
import { Header } from "./header";
import { ThemeProvider } from "@/lib/theme-provider";
import { AuthProvider, type AuthUser } from "@/context/auth-context";
import { mainNavItems } from "./nav-config";

function renderHeader(
  initialRoute = "/",
  authOptions?: { initialUser?: AuthUser | null; initialAdminMode?: boolean }
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider
        initialUser={authOptions?.initialUser}
        initialAdminMode={authOptions?.initialAdminMode}
      >
        <ThemeProvider>
          <MemoryRouter initialEntries={[initialRoute]}>
            <Header />
          </MemoryRouter>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
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

  describe("Multi-Tenant Authentication & Sign Out", () => {
    const mockUser: AuthUser = {
      uid: "tenant-user-123",
      email: "engineer@resumeee.io",
      displayName: "Jane Engineer",
    };

    it("renders user identity and Sign Out button in non-admin mode when user is authenticated", () => {
      renderHeader("/", {
        initialUser: mockUser,
        initialAdminMode: false,
      });

      expect(screen.getByText("engineer@resumeee.io")).toBeInTheDocument();
      const signOutButton = screen.getByRole("button", { name: /sign out/i });
      expect(signOutButton).toBeInTheDocument();
    });

    it("does not render Sign Out button when in single-user admin mode", () => {
      renderHeader("/", {
        initialUser: { uid: "default", email: "admin@resumeee.local", displayName: "Admin" },
        initialAdminMode: true,
      });

      expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
    });

    it("handles sign out flow when user clicks desktop Sign Out button", async () => {
      const user = userEvent.setup();
      renderHeader("/", {
        initialUser: mockUser,
        initialAdminMode: false,
      });

      const signOutButton = screen.getByRole("button", { name: /sign out/i });
      await user.click(signOutButton);

      expect(screen.queryByText("engineer@resumeee.io")).not.toBeInTheDocument();
    });

    it("renders Sign Out button in mobile drawer and triggers sign out", async () => {
      const user = userEvent.setup();
      renderHeader("/", {
        initialUser: mockUser,
        initialAdminMode: false,
      });

      const menuButton = screen.getByRole("button", { name: /open navigation menu/i });
      await user.click(menuButton);

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toBeInTheDocument();

      const mobileSignOut = await within(dialog).findByRole("button", { name: /sign out/i });
      expect(mobileSignOut).toBeInTheDocument();

      await user.click(mobileSignOut);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
