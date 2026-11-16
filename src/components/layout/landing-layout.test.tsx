import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { LandingLayout } from "./landing-layout";
import { LandingPage } from "@/pages/landing-page";
import { ThemeProvider } from "@/lib/theme-provider";

function renderStandaloneLanding() {
  return render(
    <ThemeProvider>
      <LandingLayout>
        <LandingPage />
      </LandingLayout>
    </ThemeProvider>
  );
}

describe("LandingLayout Standalone Shell", () => {
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

  it("renders banner, public navigation, main landmark, footer, and Get Started CTAs without login or monetization", () => {
    renderStandaloneLanding();

    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("link", { name: "Resumeee Home" })).toHaveAttribute("href", "#hero");
    expect(within(banner).getByRole("navigation", { name: "Public Navigation" })).toBeInTheDocument();
    expect(within(banner).getByRole("button", { name: /theme/i })).toBeInTheDocument();

    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();

    expect(screen.queryByRole("link", { name: /sign in|log in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /pricing/i })).not.toBeInTheDocument();

    const getStartedLinks = screen.getAllByRole("link", { name: /^get started$/i });
    expect(getStartedLinks).toHaveLength(2);
    getStartedLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "#open-source");
    });
  });

  it("supports switching theme via theme toggle dropdown", async () => {
    const user = userEvent.setup();
    renderStandaloneLanding();

    await user.click(screen.getByRole("button", { name: /theme/i }));
    await user.click(await screen.findByRole("menuitem", { name: /dark/i }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("resumeee-theme")).toBe("dark");
  });

  it("passes automated axe-core accessibility audit with zero violations", async () => {
    const { container } = renderStandaloneLanding();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
