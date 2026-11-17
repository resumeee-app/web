import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import App from "./App";
import { createAppRouter } from "./router";

describe("Application Root Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  describe("Admin Mode (Single-User)", () => {
    beforeEach(() => {
      vi.stubEnv("ADMIN_MODE", "true");
    });

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

  describe("Multi-Tenant Mode (Unauthenticated)", () => {
    beforeEach(() => {
      vi.stubEnv("ADMIN_MODE", "false");
    });

    it("renders public landing page and hides header navigation links and quota meter when unauthenticated on root", async () => {
      render(<App />);

      // Hero heading and value proposition
      expect(await screen.findByRole("heading", { level: 1, name: /One resume, many variants/i })).toBeInTheDocument();
      expect(screen.getAllByText(/one resume to rule them all/i).length).toBeGreaterThan(0);

      // Primary CTA targets self-hosting quickstart
      const getStartedLinks = screen.getAllByRole("link", { name: /^get started$/i });
      expect(getStartedLinks.length).toBeGreaterThan(0);
      expect(getStartedLinks[0]).toHaveAttribute("href", "#open-source");

      const banner = screen.getByRole("banner");
      expect(banner).toBeInTheDocument();
      expect(within(banner).getByRole("link", { name: "Resumeee Home" })).toBeInTheDocument();
      expect(within(banner).getByRole("button", { name: /theme/i })).toBeInTheDocument();
      expect(within(banner).queryByRole("navigation", { name: "Main Navigation" })).not.toBeInTheDocument();
      expect(within(banner).queryByLabelText(/quota/i)).not.toBeInTheDocument();
    });

    it("renders login screen when routed to /login directly", async () => {
      const testRouter = createAppRouter(["/login"]);
      render(<App router={testRouter} />);

      expect(await screen.findByRole("heading", { name: /sign in to resumeee/i })).toBeInTheDocument();
      expect(screen.getByText(/multi-tenant resume tailoring/i)).toBeInTheDocument();
    });

    it("passes axe-core accessibility audit on unauthenticated landing page render", async () => {
      const { container } = render(<App />);
      await screen.findByRole("heading", { level: 1, name: /One resume, many variants/i });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Multi-Tenant Mode (Authenticated)", () => {
    beforeEach(() => {
      vi.stubEnv("ADMIN_MODE", "false");
    });

    it("renders the dashboard (HomePage) instead of LandingPage when authenticated on root", () => {
      render(
        <App
          initialUser={{
            uid: "user-123",
            email: "engineer@resumeee.io",
            displayName: "Jane Engineer",
          }}
          initialAdminMode={false}
        />
      );

      // Verify dashboard heading is rendered, not landing page hero
      expect(screen.getByRole("heading", { level: 1, name: /resume management/i })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /One resume, many variants/i })).not.toBeInTheDocument();

      // Verify authenticated navigation and user info
      expect(screen.getByRole("navigation", { name: /main navigation/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    });
  });
});
