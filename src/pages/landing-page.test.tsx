import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { axe } from "vitest-axe";
import { LandingPage } from "./landing-page";
import { ThemeProvider } from "@/lib/theme-provider";

function renderLandingPage(initialRoute = "/") {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <LandingPage />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe("LandingPage Component", () => {
  beforeEach(() => {
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

  describe("Hero Section", () => {
    it("renders primary value proposition, badge, and call-to-action buttons", () => {
      renderLandingPage();

      const heroSection = screen.getByRole("region", { name: /hero/i });
      expect(heroSection).toBeInTheDocument();

      // Badge pill
      expect(within(heroSection).getByText(/Open Source Career Graph/i)).toBeInTheDocument();

      // Main hero heading
      const heading = within(heroSection).getByRole("heading", {
        level: 1,
        name: /Branch your career like Git/i,
      });
      expect(heading).toBeInTheDocument();

      // Value proposition subtitle
      expect(
        within(heroSection).getByText(/One resume to rule them all/i)
      ).toBeInTheDocument();

      // Primary CTA: Get Started Free
      const getStartedBtn = within(heroSection).getByRole("link", { name: /get started free/i });
      expect(getStartedBtn).toBeInTheDocument();
      expect(getStartedBtn).toHaveAttribute("href", "/login");

      // Secondary CTA: Run Locally on GitHub
      const githubBtn = within(heroSection).getByRole("link", { name: /run locally on github/i });
      expect(githubBtn).toBeInTheDocument();
      expect(githubBtn).toHaveAttribute("href", "https://github.com/rrivera/resumeee");
      expect(githubBtn).toHaveAttribute("target", "_blank");
      expect(githubBtn).toHaveAttribute("rel", "noreferrer noopener");
    });

    it("renders the Git-style career branch visualizer in the hero", () => {
      renderLandingPage();

      const visualizer = screen.getByTestId("hero-branch-visualizer");
      expect(visualizer).toBeInTheDocument();
      expect(within(visualizer).getByText(/main \(Single Source of Truth\)/i)).toBeInTheDocument();
      expect(within(visualizer).getByText(/feat\/lead-infra/i)).toBeInTheDocument();
      expect(within(visualizer).getByText(/feat\/founding-eng/i)).toBeInTheDocument();
      expect(within(visualizer).getByText(/100% Provenance Verified/i)).toBeInTheDocument();
    });
  });

  describe("Core Features Pillars", () => {
    it("showcases multi-branching, anti-hallucination provenance, ATS templates, and local-first privacy", () => {
      renderLandingPage();

      const featuresSection = screen.getByRole("region", { name: /features/i });
      expect(featuresSection).toBeInTheDocument();

      // Feature 1: Multi-Branch Career Graph
      expect(
        within(featuresSection).getByRole("heading", {
          level: 3,
          name: /Multi-Branch Career Graph/i,
        })
      ).toBeInTheDocument();

      // Feature 2: Anti-Hallucination & Provenance
      expect(
        within(featuresSection).getByRole("heading", {
          level: 3,
          name: /Anti-Hallucination & Provenance/i,
        })
      ).toBeInTheDocument();
      expect(
        within(featuresSection).getByText(/short identifier hashes/i)
      ).toBeInTheDocument();

      // Feature 3: ATS Optimization & Multi-Theme
      expect(
        within(featuresSection).getByRole("heading", {
          level: 3,
          name: /ATS-Optimized & Multi-Theme/i,
        })
      ).toBeInTheDocument();

      // Feature 4: Local-First & Open Source
      expect(
        within(featuresSection).getByRole("heading", {
          level: 3,
          name: /Local-First & Open Source Freedom/i,
        })
      ).toBeInTheDocument();
    });
  });

  describe("Technical & Local-Run Architecture Section", () => {
    it("renders self-hosting terminal commands and privacy architecture details", async () => {
      const user = userEvent.setup();
      renderLandingPage();

      const openSourceSection = screen.getByRole("region", { name: /open source & self-hosting/i });
      expect(openSourceSection).toBeInTheDocument();

      expect(
        within(openSourceSection).getByText(/Run 100% Offline with Docker & Local Ollama/i)
      ).toBeInTheDocument();

      // Code snippets / tabs
      expect(within(openSourceSection).getByText(/docker run/i)).toBeInTheDocument();

      // Copy terminal command button
      const copyBtn = within(openSourceSection).getByRole("button", {
        name: /copy docker command/i,
      });
      expect(copyBtn).toBeInTheDocument();

      // Click copy and verify state feedback
      await user.click(copyBtn);
      expect(await within(openSourceSection).findByText(/copied!/i)).toBeInTheDocument();

      // Privacy highlights
      expect(within(openSourceSection).getByText(/Local SQLite Persistence/i)).toBeInTheDocument();
      expect(within(openSourceSection).getByText(/Zero Telemetry or Training/i)).toBeInTheDocument();
      expect(within(openSourceSection).getByText(/Bring Your Own Key \(BYOK\)/i)).toBeInTheDocument();
    });
  });

  describe("Monetization & Pricing Tiers", () => {
    it("renders all three pricing tiers (Open Source, Cloud Hosted, Enterprise) with transparent details", () => {
      renderLandingPage();

      const pricingSection = screen.getByRole("region", { name: /pricing/i });
      expect(pricingSection).toBeInTheDocument();

      // Tier 1: Open Source
      const openSourceCard = screen.getByTestId("tier-open-source");
      expect(within(openSourceCard).getByRole("heading", { level: 3, name: /open source/i })).toBeInTheDocument();
      expect(within(openSourceCard).getByText(/\$0/)).toBeInTheDocument();
      expect(within(openSourceCard).getByText(/free forever/i)).toBeInTheDocument();
      expect(within(openSourceCard).getByRole("link", { name: /run locally free/i })).toHaveAttribute(
        "href",
        "https://github.com/rrivera/resumeee"
      );

      // Tier 2: Cloud Hosted (Pro)
      const cloudCard = screen.getByTestId("tier-cloud-hosted");
      expect(within(cloudCard).getByRole("heading", { level: 3, name: /cloud hosted/i })).toBeInTheDocument();
      expect(within(cloudCard).getByText(/\$12/)).toBeInTheDocument();
      expect(within(cloudCard).getByText(/most popular/i)).toBeInTheDocument();
      expect(within(cloudCard).getByRole("link", { name: /start 14-day trial/i })).toHaveAttribute(
        "href",
        "/login"
      );

      // Tier 3: Enterprise
      const enterpriseCard = screen.getByTestId("tier-enterprise");
      expect(within(enterpriseCard).getByRole("heading", { level: 3, name: /enterprise/i })).toBeInTheDocument();
      expect(within(enterpriseCard).getByText(/^custom$/i)).toBeInTheDocument();
      expect(within(enterpriseCard).getByText(/tailored quote/i)).toBeInTheDocument();
      expect(within(enterpriseCard).getByRole("link", { name: /contact sales/i })).toBeInTheDocument();
    });
  });

  describe("Frequently Asked Questions (FAQ)", () => {
    it("renders expandable FAQ items and supports interactive accordion state transitions", async () => {
      const user = userEvent.setup();
      renderLandingPage();

      const faqSection = screen.getByRole("region", { name: /frequently asked questions/i });
      expect(faqSection).toBeInTheDocument();

      const question1Btn = within(faqSection).getByRole("button", {
        name: /How does Resumeee prevent AI hallucinations\?/i,
      });
      const question2Btn = within(faqSection).getByRole("button", {
        name: /Can I really use Resumeee 100% offline\?/i,
      });

      // 1. Initial collapsed state: aria-expanded="false" and answer content not in document
      expect(question1Btn).toHaveAttribute("aria-expanded", "false");
      expect(question2Btn).toHaveAttribute("aria-expanded", "false");
      expect(
        within(faqSection).queryByText(/immutable relational graph/i)
      ).not.toBeInTheDocument();
      expect(
        within(faqSection).queryByText(/bare-metal binaries connected to local Ollama/i)
      ).not.toBeInTheDocument();

      // 2. Click question 1 to expand: aria-expanded="true" and answer content becomes visible
      await user.click(question1Btn);
      expect(question1Btn).toHaveAttribute("aria-expanded", "true");
      expect(
        within(faqSection).getByText(/immutable relational graph/i)
      ).toBeInTheDocument();

      // 3. Click question 1 again to collapse
      await user.click(question1Btn);
      expect(question1Btn).toHaveAttribute("aria-expanded", "false");
      expect(
        within(faqSection).queryByText(/immutable relational graph/i)
      ).not.toBeInTheDocument();

      // 4. Opening a second FAQ item collapses the first
      await user.click(question1Btn);
      expect(question1Btn).toHaveAttribute("aria-expanded", "true");
      expect(within(faqSection).getByText(/immutable relational graph/i)).toBeInTheDocument();

      await user.click(question2Btn);
      expect(question1Btn).toHaveAttribute("aria-expanded", "false");
      expect(within(faqSection).queryByText(/immutable relational graph/i)).not.toBeInTheDocument();
      expect(question2Btn).toHaveAttribute("aria-expanded", "true");
      expect(
        within(faqSection).getByText(/bare-metal binaries connected to local Ollama/i)
      ).toBeInTheDocument();
    });
  });

  describe("Accessibility & Contrast", () => {
    it("passes automated axe-core accessibility audit with zero violations", async () => {
      const { container } = renderLandingPage();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
