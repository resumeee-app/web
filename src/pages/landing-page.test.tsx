import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { LandingPage } from "./landing-page";
import { ThemeProvider } from "@/lib/theme-provider";

function renderLandingPage() {
  return render(
    <ThemeProvider>
      <LandingPage />
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

      // Main hero heading
      const heading = within(heroSection).getByRole("heading", {
        level: 1,
        name: /One resume, many variants/i,
      });
      expect(heading).toBeInTheDocument();

      // Value proposition subtitle
      expect(
        within(heroSection).getByText(/powered by your preferred AI/i)
      ).toBeInTheDocument();

      // Primary CTA: Get Started
      const getStartedBtn = within(heroSection).getByRole("link", { name: /^get started$/i });
      expect(getStartedBtn).toBeInTheDocument();
      expect(getStartedBtn).toHaveAttribute("href", "#open-source");
      expect(within(heroSection).queryByRole("link", { name: /get started free/i })).not.toBeInTheDocument();

      // Secondary CTA: Run it Locally
      const githubBtn = within(heroSection).getByRole("link", { name: /run it locally/i });
      expect(githubBtn).toBeInTheDocument();
      expect(githubBtn).toHaveAttribute("href", "https://github.com/resumeee-app/resumeee");
      expect(githubBtn).toHaveAttribute("target", "_blank");
      expect(githubBtn).toHaveAttribute("rel", "noreferrer noopener");

      // Trust guarantees
      expect(within(heroSection).getByText(/Zero telemetry/i)).toBeInTheDocument();
      expect(within(heroSection).queryByText(/Zero tracking cookies/i)).not.toBeInTheDocument();
      expect(within(heroSection).queryByText(/Runs offline with Ollama/i)).not.toBeInTheDocument();
    });

    it("renders the authentic branch workflow visualizer in the hero with mock cards, match scores, and badges", () => {
      renderLandingPage();

      const visualizer = screen.getByTestId("hero-branch-visualizer");
      expect(visualizer).toBeInTheDocument();

      // Main trunk profile card
      expect(within(visualizer).getByText(/Main Career Profile/i)).toBeInTheDocument();
      expect(within(visualizer).getByText(/Default Branch/i)).toBeInTheDocument();
      expect(within(visualizer).getByText(/Rev #14/i)).toBeInTheDocument();

      // Mock branch cards count
      const mockCards = within(visualizer).getAllByTestId("mock-branch-card");
      expect(mockCards).toHaveLength(2);
      const card1 = mockCards[0]!;
      const card2 = mockCards[1]!;

      // Card 1: Staff Platform Engineer at Stripe
      expect(
        within(card1).getByRole("heading", { level: 3, name: /Staff Platform Engineer/i })
      ).toBeInTheDocument();
      expect(within(card1).getByText(/Stripe/i)).toBeInTheDocument();
      expect(within(card1).getByText(/Infrastructure & Observability/i)).toBeInTheDocument();
      expect(within(card1).getByText(/ATS Modern Tech/i)).toBeInTheDocument();
      expect(within(card1).getByText(/Senior Staff Engineering/i)).toBeInTheDocument();
      expect(within(card1).getByText(/Match Score: 98%/i)).toBeInTheDocument();
      expect(within(card1).queryByText(/ATS Score/i)).not.toBeInTheDocument();

      // Card 2: Founding Systems Architect at Supabase
      expect(
        within(card2).getByRole("heading", { level: 3, name: /Founding Systems Architect/i })
      ).toBeInTheDocument();
      expect(within(card2).getByText(/Supabase/i)).toBeInTheDocument();
      expect(within(card2).getByText(/Cloud Core Team/i)).toBeInTheDocument();
      expect(within(card2).getByText(/Standard Clean/i)).toBeInTheDocument();
      expect(within(card2).getByText(/0-to-1 Startup Velocity/i)).toBeInTheDocument();
      expect(within(card2).getByText(/Match Score: 96%/i)).toBeInTheDocument();
      expect(within(card2).queryByText(/ATS Score/i)).not.toBeInTheDocument();

      // Active status badges count across visualizer (1 trunk + 2 branch cards = 3)
      const activeBadges = within(visualizer).getAllByText(/^Active$/i);
      expect(activeBadges).toHaveLength(3);

      // Verified facts badges
      const verifiedBadges = within(visualizer).getAllByText(/Verified Facts/i);
      expect(verifiedBadges).toHaveLength(2);

      // Non-interactive mock preview buttons: disabled, aria-hidden="true", and tabIndex="-1"
      const previewButtons = within(visualizer).getAllByRole("button", { hidden: true });
      expect(previewButtons.length).toBeGreaterThanOrEqual(4);
      previewButtons.forEach((btn) => {
        expect(btn).toBeDisabled();
        expect(btn).toHaveAttribute("aria-hidden", "true");
        expect(btn).toHaveAttribute("tabindex", "-1");
      });
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
        within(featuresSection).getByText(/anchored to real profile facts/i)
      ).toBeInTheDocument();

      // Feature 3: ATS-Optimized, JSON Resume Compatible
      expect(
        within(featuresSection).getByRole("heading", {
          level: 3,
          name: /ATS-Optimized, JSON Resume Compatible/i,
        })
      ).toBeInTheDocument();

      // Feature 4: Freedom & Local Privacy
      expect(
        within(featuresSection).getByRole("heading", {
          level: 3,
          name: /Freedom & Local Privacy/i,
        })
      ).toBeInTheDocument();

      // Feature 5: Integrated MCP Server & API
      expect(
        within(featuresSection).getByRole("heading", {
          level: 3,
          name: /Integrated MCP Server & API/i,
        })
      ).toBeInTheDocument();

      // Feature 6: Accessible by Design
      expect(
        within(featuresSection).getByRole("heading", {
          level: 3,
          name: /Accessible by Design/i,
        })
      ).toBeInTheDocument();
      expect(
        within(featuresSection).getByText(/usable by everyone/i)
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
        within(openSourceSection).getByText(/Run it Locally, Choose Your AI Provider/i)
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

      // Privacy and architecture highlights
      expect(within(openSourceSection).getByText(/Storage Agnostic \(SQLite Included\)/i)).toBeInTheDocument();
      expect(within(openSourceSection).getByText(/Zero Telemetry or Training/i)).toBeInTheDocument();
      expect(within(openSourceSection).getByText(/Bring Your Own Key \(BYOK\)/i)).toBeInTheDocument();
      expect(within(openSourceSection).getByText(/Integrated MCP Server/i)).toBeInTheDocument();
    });

    it("does not render pricing, login, sign-in, or monetization copy", () => {
      renderLandingPage();
      expect(screen.queryByRole("region", { name: /pricing/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/sign in|log in/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/get started free/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Free,\s*privacy-first/i)).not.toBeInTheDocument();

      const getStartedLinks = screen.getAllByRole("link", { name: /^get started$/i });
      expect(getStartedLinks).toHaveLength(2);
      getStartedLinks.forEach((link) => {
        expect(link).toHaveAttribute("href", "#open-source");
      });
    });
  });

  describe("Frequently Asked Questions (FAQ)", () => {
    it("renders expandable FAQ items and supports interactive accordion state transitions", async () => {
      const user = userEvent.setup();
      renderLandingPage();

      const faqSection = screen.getByRole("region", { name: /frequently asked questions/i });
      expect(faqSection).toBeInTheDocument();

      const promptQuestionBtn = within(faqSection).getByRole("button", {
        name: /Can't I do the same with a single prompt\?/i,
      });
      const hallucinationBtn = within(faqSection).getByRole("button", {
        name: /How does Resumeee prevent AI hallucinations\?/i,
      });
      const providerBtn = within(faqSection).getByRole("button", {
        name: /Can I use my preferred AI provider or run offline\?/i,
      });
      const vibeCodedBtn = within(faqSection).getByRole("button", {
        name: /Is it "vibe-coded"\?/i,
      });

      // 1. Initial collapsed state: aria-expanded="false" and answer content not in document
      expect(promptQuestionBtn).toHaveAttribute("aria-expanded", "false");
      expect(hallucinationBtn).toHaveAttribute("aria-expanded", "false");
      expect(providerBtn).toHaveAttribute("aria-expanded", "false");
      expect(vibeCodedBtn).toHaveAttribute("aria-expanded", "false");
      expect(
        within(faqSection).queryByText(/managing multiple tailored resumes is not simple/i)
      ).not.toBeInTheDocument();
      expect(
        within(faqSection).queryByText(/deterministic short identifier hash/i)
      ).not.toBeInTheDocument();
      expect(
        within(faqSection).queryByText(/total freedom over AI inference/i)
      ).not.toBeInTheDocument();
      expect(
        within(faqSection).queryByText(/Real human effort and experience/i)
      ).not.toBeInTheDocument();

      // 2. Click prompt question to expand: aria-expanded="true" and answer content becomes visible
      await user.click(promptQuestionBtn);
      expect(promptQuestionBtn).toHaveAttribute("aria-expanded", "true");
      expect(
        within(faqSection).getByText(/managing multiple tailored resumes is not simple/i)
      ).toBeInTheDocument();
      expect(
        within(faqSection).getByText(/integrated REST API and an MCP server/i)
      ).toBeInTheDocument();

      // 3. Click prompt question again to collapse
      await user.click(promptQuestionBtn);
      expect(promptQuestionBtn).toHaveAttribute("aria-expanded", "false");
      expect(
        within(faqSection).queryByText(/managing multiple tailored resumes is not simple/i)
      ).not.toBeInTheDocument();

      // 4. Opening another FAQ item expands it and collapses others
      await user.click(hallucinationBtn);
      expect(hallucinationBtn).toHaveAttribute("aria-expanded", "true");
      expect(within(faqSection).getByText(/deterministic short identifier hash/i)).toBeInTheDocument();

      await user.click(vibeCodedBtn);
      expect(hallucinationBtn).toHaveAttribute("aria-expanded", "false");
      expect(within(faqSection).queryByText(/deterministic short identifier hash/i)).not.toBeInTheDocument();
      expect(vibeCodedBtn).toHaveAttribute("aria-expanded", "true");
      expect(
        within(faqSection).getByText(/Real human effort and experience/i)
      ).toBeInTheDocument();
      expect(
        within(faqSection).getByText(/several design iterations took place/i)
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
