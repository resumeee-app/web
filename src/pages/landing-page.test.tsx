import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, within, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { LandingPage } from "./landing-page";
import { ThemeProvider } from "@/lib/theme-provider";

function renderLandingPage(tourTimingMs = { modalStepMs: 15, generationStepMs: 15 }) {
  return render(
    <ThemeProvider>
      <LandingPage tourTimingMs={tourTimingMs} />
    </ThemeProvider>
  );
}

describe("LandingPage Component", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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
      expect(heading.textContent).not.toContain(".");

      // Value proposition subtitle
      expect(
        within(heroSection).getByText(/powered by your preferred AI/i)
      ).toBeInTheDocument();

      // Primary CTA: Get Started
      const getStartedBtn = within(heroSection).getByRole("link", { name: /^get started$/i });
      expect(getStartedBtn).toBeInTheDocument();
      expect(getStartedBtn).toHaveAttribute("href", "#open-source");
      expect(within(heroSection).queryByRole("link", { name: /get started free/i })).not.toBeInTheDocument();

      // Secondary CTA: GitHub
      const githubBtn = within(heroSection).getByRole("link", { name: /^github$/i });
      expect(githubBtn).toBeInTheDocument();
      expect(githubBtn).toHaveAttribute("href", "https://github.com/resumeee-app/resumeee");
      expect(githubBtn).toHaveAttribute("target", "_blank");
      expect(githubBtn).toHaveAttribute("rel", "noreferrer noopener");

      // Trust guarantees
      expect(within(heroSection).getByText(/Zero telemetry/i)).toBeInTheDocument();
      expect(within(heroSection).queryByText(/Zero tracking cookies/i)).not.toBeInTheDocument();
      expect(within(heroSection).queryByText(/Runs offline with Ollama/i)).not.toBeInTheDocument();
    });

    it("replaces the static preview with an interactive 4-step guided tour stepper, free tab jumps, and Previous navigation", async () => {
      const user = userEvent.setup();
      renderLandingPage();

      expect(
        screen.queryByRole("heading", { name: /resume branch workflow preview/i })
      ).not.toBeInTheDocument();

      const tourRegion = screen.getByRole("region", { name: /guided tour/i });
      expect(tourRegion).toBeInTheDocument();

      const stepperNav = within(tourRegion).getByRole("navigation", {
        name: /guided tour steps/i,
      });

      const step1Btn = within(stepperNav).getByRole("button", { name: /curate main profile/i });
      const step2Btn = within(stepperNav).getByRole("button", { name: /branch for a role/i });
      const step3Btn = within(stepperNav).getByRole("button", { name: /tailor & analyze/i });
      const step4Btn = within(stepperNav).getByRole("button", { name: /diff, preview & export/i });

      expect(step1Btn).toHaveAttribute("aria-current", "step");
      expect(step2Btn).not.toHaveAttribute("aria-current", "step");

      // Idle state has only "Try it" (no duplicate Next button before running the step)
      expect(within(tourRegion).queryByRole("button", { name: /^next/i })).not.toBeInTheDocument();

      // Free navigation: jump straight to Step 4 via stepper tabs
      await user.click(step4Btn);
      expect(step4Btn).toHaveAttribute("aria-current", "step");
      expect(
        within(tourRegion).getByRole("region", { name: /tailored resume diff viewer/i })
      ).toBeInTheDocument();

      // Previous button steps backward sequentially
      const prevBtn = within(tourRegion).getByRole("button", { name: /previous step/i });
      expect(prevBtn).toBeEnabled();

      await user.click(prevBtn);
      expect(step3Btn).toHaveAttribute("aria-current", "step");

      await user.click(within(tourRegion).getByRole("button", { name: /previous step/i }));
      expect(step2Btn).toHaveAttribute("aria-current", "step");

      await user.click(within(tourRegion).getByRole("button", { name: /previous step/i }));
      expect(step1Btn).toHaveAttribute("aria-current", "step");
      expect(within(tourRegion).getByRole("button", { name: /previous step/i })).toBeDisabled();
    });

    it("positions Try it and Reset Demo in the bottom wizard footer and transforms Try it into Next", async () => {
      const user = userEvent.setup();
      renderLandingPage();

      const tourRegion = screen.getByRole("region", { name: /guided tour/i });
      const previewRegion = within(tourRegion).getByRole("region", { name: /step 1 preview/i });

      // Essential ExperienceList content present; SkillsManager omitted
      expect(
        within(previewRegion).getByRole("heading", { name: /work experience/i })
      ).toBeInTheDocument();
      expect(
        within(previewRegion).getByRole("heading", { name: /senior growth product manager/i })
      ).toBeInTheDocument();
      expect(within(previewRegion).getByText("Northstar Goods")).toBeInTheDocument();
      expect(within(previewRegion).getByText(/go-to-market launch/i)).toBeInTheDocument();
      expect(within(previewRegion).getByText(/Rev #14/i)).toBeInTheDocument();
      expect(
        within(previewRegion).queryByRole("heading", { name: /skills & competencies/i })
      ).not.toBeInTheDocument();

      // Zero non-actionable buttons, inputs, links, or selects inside preview canvas
      expect(within(previewRegion).queryAllByRole("button")).toHaveLength(0);
      expect(within(previewRegion).queryAllByRole("textbox")).toHaveLength(0);
      expect(within(previewRegion).queryAllByRole("searchbox")).toHaveLength(0);
      expect(within(previewRegion).queryAllByRole("combobox")).toHaveLength(0);
      expect(within(previewRegion).queryAllByRole("link")).toHaveLength(0);

      // Try it sits in the bottom wizard footer (after the preview region and Previous button)
      const prevBtn = within(tourRegion).getByRole("button", { name: /previous step/i });
      const tryBtn = within(tourRegion).getByRole("button", {
        name: /try it: add verified fact/i,
      });
      expect(
        previewRegion.compareDocumentPosition(tryBtn) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        prevBtn.compareDocumentPosition(tryBtn) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();

      // Trigger Step 1 Try it
      await user.click(tryBtn);

      expect(
        within(previewRegion).getByText(/presented quarterly pricing experiments to executive board/i)
      ).toBeInTheDocument();
      expect(within(previewRegion).getByText(/Rev #15/i)).toBeInTheDocument();
      expect(within(previewRegion).getByText(/\+1 verified fact/i)).toBeInTheDocument();
      expect(within(previewRegion).getByText(/^New$/i)).toBeInTheDocument();

      // Completion indicator is non-interactive text, while Try it transforms into Next with Reset Demo on its left
      expect(
        within(tourRegion).queryByRole("button", { name: /try it: add verified fact/i })
      ).not.toBeInTheDocument();
      expect(
        within(tourRegion).queryByRole("button", { name: /verified fact added/i })
      ).not.toBeInTheDocument();
      expect(within(tourRegion).getByText(/verified fact added \(rev #15\)/i)).toBeInTheDocument();

      const resetBtn = within(tourRegion).getByRole("button", { name: /reset demo/i });
      const nextBtn = within(tourRegion).getByRole("button", { name: /^next$/i });
      expect(nextBtn).toBeEnabled();
      expect(
        previewRegion.compareDocumentPosition(resetBtn) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        prevBtn.compareDocumentPosition(resetBtn) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        resetBtn.compareDocumentPosition(nextBtn) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();

      // Reset Step restores initial state and brings back Try it
      await user.click(resetBtn);
      expect(
        within(previewRegion).queryByText(/presented quarterly pricing experiments to executive board/i)
      ).not.toBeInTheDocument();
      expect(within(previewRegion).getByText(/Rev #14/i)).toBeInTheDocument();
      expect(within(previewRegion).queryByText(/^New$/i)).not.toBeInTheDocument();
      expect(within(tourRegion).queryByRole("button", { name: /reset demo/i })).not.toBeInTheDocument();
      expect(within(tourRegion).queryByRole("button", { name: /^next$/i })).not.toBeInTheDocument();

      // Re-run Try it and advance via transformed Next button to Step 2
      await user.click(
        within(tourRegion).getByRole("button", { name: /try it: add verified fact/i })
      );
      await user.click(within(tourRegion).getByRole("button", { name: /^next$/i }));
      expect(
        within(tourRegion).getByRole("button", { name: /branch for a role/i })
      ).toHaveAttribute("aria-current", "step");
      expect(
        within(tourRegion).getByRole("button", { name: /try it: create role branch/i })
      ).toBeInTheDocument();
    });

    it("Step 2 opens CreateBranchModal, auto-walks all 3 modal steps, and appends the new BranchCard", async () => {
      const user = userEvent.setup();
      renderLandingPage({ modalStepMs: 250, generationStepMs: 15 });

      const tourRegion = screen.getByRole("region", { name: /guided tour/i });
      await user.click(within(tourRegion).getByRole("button", { name: /branch for a role/i }));

      const previewRegion = within(tourRegion).getByRole("region", { name: /step 2 preview/i });

      // Main Career Profile + initial Patagonia branch without dead action buttons
      expect(
        within(previewRegion).getByRole("heading", { name: /main career profile/i })
      ).toBeInTheDocument();
      expect(
        within(previewRegion).getByRole("heading", { name: /patagonia - director of brand/i })
      ).toBeInTheDocument();
      expect(
        within(previewRegion).queryByRole("heading", { name: /spotify - lead product strategist/i })
      ).not.toBeInTheDocument();
      expect(within(previewRegion).queryAllByRole("button")).toHaveLength(0);
      expect(within(previewRegion).queryAllByRole("link")).toHaveLength(0);

      // Timer progress bar is hidden before launching the modal demo
      expect(
        within(tourRegion).queryByRole("progressbar", { name: /auto-advance timer/i })
      ).not.toBeInTheDocument();

      // Try it opens real CreateBranchModal inside the Step 2 demo frame on Step 1
      await user.click(
        within(tourRegion).getByRole("button", { name: /try it: create role branch/i })
      );

      const dialog = await within(tourRegion).findByRole("dialog", {
        name: /create new resume branch/i,
      });
      const step1Timer = within(tourRegion).getByRole("progressbar", {
        name: /modal step 1 of 3 auto-advance timer/i,
      });
      expect(step1Timer).toHaveAttribute("aria-valuenow", "33");
      expect(
        step1Timer.compareDocumentPosition(dialog) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();

      expect(within(dialog).getByLabelText(/branch name/i)).toHaveValue(
        "Spotify - Lead Product Strategist"
      );
      expect(
        within(dialog).getByRole("button", { name: /step 1.*the opportunity/i })
      ).toHaveAttribute("aria-current", "step");

      // Auto-walkthrough visits Step 2, Step 3, then closes and spawns BranchCard
      await waitFor(() => {
        expect(
          within(dialog).getByRole("button", { name: /step 2.*ai tailoring/i })
        ).toHaveAttribute("aria-current", "step");
      });
      expect(
        within(tourRegion).getByRole("progressbar", {
          name: /modal step 2 of 3 auto-advance timer/i,
        })
      ).toHaveAttribute("aria-valuenow", "67");

      await waitFor(() => {
        expect(
          within(dialog).getByRole("button", { name: /step 3.*visual design/i })
        ).toHaveAttribute("aria-current", "step");
      });
      expect(
        within(tourRegion).getByRole("progressbar", {
          name: /modal step 3 of 3 auto-advance timer/i,
        })
      ).toHaveAttribute("aria-valuenow", "100");

      await expect(
        within(previewRegion).findByRole("heading", { name: /spotify - lead product strategist/i })
      ).resolves.toBeInTheDocument();
      expect(within(previewRegion).getAllByText(/match score:\s*n\/a/i)).toHaveLength(2);
      expect(within(previewRegion).queryByText(/match score:\s*97%/i)).not.toBeInTheDocument();
      expect(within(tourRegion).queryByRole("dialog")).not.toBeInTheDocument();
      expect(
        within(tourRegion).queryByRole("progressbar", { name: /auto-advance timer/i })
      ).not.toBeInTheDocument();
      expect(within(tourRegion).getByRole("button", { name: /reset demo/i })).toBeInTheDocument();
      expect(within(tourRegion).getByRole("button", { name: /^next$/i })).toBeEnabled();
    });

    it("Step 2 defaults to 2500ms between modal steps when tourTimingMs is omitted", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <ThemeProvider>
          <LandingPage />
        </ThemeProvider>
      );

      const tourRegion = screen.getByRole("region", { name: /guided tour/i });
      await user.click(within(tourRegion).getByRole("button", { name: /branch for a role/i }));
      await user.click(
        within(tourRegion).getByRole("button", { name: /try it: create role branch/i })
      );

      const dialog = within(tourRegion).getByRole("dialog", {
        name: /create new resume branch/i,
      });
      const timerBar = within(tourRegion).getByRole("progressbar", {
        name: /auto-advance timer/i,
      });
      expect(timerBar.style.getPropertyValue("--tour-timer-duration")).toBe("2500ms");

      // After 2000ms (past the old 1500ms), modal must still be on Step 1
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
      expect(
        within(dialog).getByRole("button", { name: /step 1.*the opportunity/i })
      ).toHaveAttribute("aria-current", "step");

      // Reaching 2500ms advances to Step 2
      await act(async () => {
        vi.advanceTimersByTime(550);
      });
      expect(
        within(dialog).getByRole("button", { name: /step 2.*ai tailoring/i })
      ).toHaveAttribute("aria-current", "step");

      // Clean cancel restores real timers cleanly and removes timer indicator
      await user.click(within(dialog).getByRole("button", { name: /cancel/i }));
      expect(
        within(tourRegion).queryByRole("progressbar", { name: /auto-advance timer/i })
      ).not.toBeInTheDocument();
    });

    it("Step 2 allows cancelling CreateBranchModal without appending a new BranchCard", async () => {
      const user = userEvent.setup();
      renderLandingPage({ modalStepMs: 2000, generationStepMs: 15 });

      const tourRegion = screen.getByRole("region", { name: /guided tour/i });
      await user.click(within(tourRegion).getByRole("button", { name: /branch for a role/i }));

      await user.click(
        within(tourRegion).getByRole("button", { name: /try it: create role branch/i })
      );

      const dialog = await within(tourRegion).findByRole("dialog", {
        name: /create new resume branch/i,
      });
      await user.click(within(dialog).getByRole("button", { name: /cancel/i }));

      expect(within(tourRegion).queryByRole("dialog")).not.toBeInTheDocument();
      expect(
        within(tourRegion).queryByRole("heading", { name: /spotify - lead product strategist/i })
      ).not.toBeInTheDocument();
    });

    it("Step 3 runs simulated tailoring via TailorActionBar, GenerationProgress, and GapAnalysisCard", async () => {
      const user = userEvent.setup();
      renderLandingPage();

      const tourRegion = screen.getByRole("region", { name: /guided tour/i });
      await user.click(within(tourRegion).getByRole("button", { name: /tailor & analyze/i }));

      const previewRegion = within(tourRegion).getByRole("region", { name: /step 3 preview/i });

      // Freshly branched Spotify role starts synced & untailored (all 3 ATS/Match scores Not evaluated)
      expect(within(previewRegion).getByText(/main in sync/i)).toBeInTheDocument();
      expect(
        within(previewRegion).queryByText(/upstream main profile revisions available/i)
      ).not.toBeInTheDocument();
      expect(within(previewRegion).getAllByText(/not evaluated/i)).toHaveLength(3);
      expect(within(previewRegion).queryAllByRole("meter")).toHaveLength(0);
      expect(
        within(previewRegion).getByText(/no gap analysis report available/i)
      ).toBeInTheDocument();

      // TailorActionBar renders full app Content & AI Strategy + Document Appearance cards
      expect(
        within(previewRegion).getByRole("heading", { name: /content & ai strategy/i })
      ).toBeInTheDocument();
      expect(
        within(previewRegion).getByRole("heading", { name: /document appearance/i })
      ).toBeInTheDocument();

      const strategySelect = within(previewRegion).getByRole("combobox", {
        name: /tailoring strategy/i,
      });
      expect(strategySelect).toHaveValue("preset-exec-story");
      expect(strategySelect).toHaveAttribute("tabindex", "-1");
      expect(strategySelect).toHaveAttribute("aria-disabled", "true");

      const templateSelect = within(previewRegion).getByRole("combobox", {
        name: /resume template/i,
      });
      expect(templateSelect).toHaveValue("tmpl-modern-editorial");
      expect(templateSelect).toHaveAttribute("tabindex", "-1");
      expect(templateSelect).toHaveAttribute("aria-disabled", "true");
      expect(within(previewRegion).getByText(/active layout:/i)).toBeInTheDocument();
      expect(within(previewRegion).getByText(/tailor resume first to preview/i)).toBeInTheDocument();

      // Highlighted Tailor Resume button stays clickable while footer Try it also remains present
      const previewTailorBtn = within(previewRegion).getByRole("button", {
        name: /^tailor resume$/i,
      });
      expect(previewTailorBtn).toBeEnabled();
      expect(previewTailorBtn).not.toHaveAttribute("tabindex", "-1");
      expect(within(previewRegion).getByText(/click below to tailor/i)).toBeInTheDocument();
      expect(
        within(tourRegion).getByRole("button", { name: /^try it: tailor resume$/i })
      ).toBeEnabled();

      // GapAnalysisCard below stays compact without full workbench buttons or expanded report
      expect(
        within(previewRegion).queryByRole("button", { name: /calculate ats score/i })
      ).not.toBeInTheDocument();
      expect(
        within(previewRegion).queryByRole("button", { name: /toggle gap analysis report/i })
      ).not.toBeInTheDocument();
      expect(
        within(previewRegion).queryByRole("heading", { name: /identified qualification gaps/i })
      ).not.toBeInTheDocument();
      expect(within(previewRegion).queryByText(/^Evaluated$/i)).not.toBeInTheDocument();

      // Clicking the highlighted Tailor Resume button inside the preview directly runs tailoring
      await user.click(previewTailorBtn);

      expect(await within(previewRegion).findByText("97.0%")).toBeInTheDocument();
      expect(within(previewRegion).getByText("98.0%")).toBeInTheDocument();
      expect(within(previewRegion).getByText("95.0%")).toBeInTheDocument();
      expect(within(previewRegion).getByText(/^Evaluated$/i)).toBeInTheDocument();
      expect(within(previewRegion).getAllByRole("meter")).toHaveLength(3);
      expect(within(tourRegion).getByText(/tailored v1 ready/i)).toBeInTheDocument();
      expect(
        within(previewRegion).getByRole("status", { name: /generation progress/i })
      ).toBeInTheDocument();
      expect(within(previewRegion).queryByText(/click below to tailor/i)).not.toBeInTheDocument();
      expect(
        within(previewRegion).getByRole("button", { name: /^tailor resume$/i })
      ).toBeDisabled();

      const resetBtn = within(tourRegion).getByRole("button", { name: /reset demo/i });
      expect(within(tourRegion).getByRole("button", { name: /^next$/i })).toBeEnabled();

      // Resetting Step 3 restores Not evaluated state, and clicking footer Try it also works
      await user.click(resetBtn);
      expect(within(previewRegion).getAllByText(/not evaluated/i)).toHaveLength(3);
      expect(
        within(previewRegion).getByRole("button", { name: /^tailor resume$/i })
      ).toBeEnabled();
      await user.click(
        within(tourRegion).getByRole("button", { name: /^try it: tailor resume$/i })
      );
      expect(await within(previewRegion).findByText("97.0%")).toBeInTheDocument();
    });

    it("Step 4 toggles compact spotlight from DiffViewer to ResumeViewer and offers Reset Demo + Restart Tour", async () => {
      const user = userEvent.setup();
      renderLandingPage();

      const tourRegion = screen.getByRole("region", { name: /guided tour/i });
      // Complete Step 1 first so we can verify Restart Tour resets earlier steps too
      await user.click(
        within(tourRegion).getByRole("button", { name: /try it: add verified fact/i })
      );
      await user.click(within(tourRegion).getByRole("button", { name: /^next$/i }));
      expect(
        within(tourRegion).getByRole("button", { name: /branch for a role/i })
      ).toHaveAttribute("aria-current", "step");

      // Jump directly to Step 4 via stepper tabs
      await user.click(
        within(tourRegion).getByRole("button", { name: /diff, preview & export/i })
      );

      const previewRegion = within(tourRegion).getByRole("region", { name: /step 4 preview/i });

      expect(
        within(previewRegion).getByRole("region", { name: /tailored resume diff viewer/i })
      ).toBeInTheDocument();
      expect(within(previewRegion).queryAllByRole("button")).toHaveLength(0);
      expect(within(previewRegion).queryAllByRole("combobox")).toHaveLength(0);
      expect(within(previewRegion).queryAllByRole("link")).toHaveLength(0);

      await user.click(
        within(tourRegion).getByRole("button", { name: /try it: render ats resume & export/i })
      );

      const iframe = within(previewRegion).getByTitle("Rendered Resume Preview");
      expect(iframe).toBeInTheDocument();
      expect(iframe.getAttribute("srcdoc")).toContain("background-color: #ffffff");
      expect(
        within(previewRegion).getByText(/simulated export ready:.*-v1\.json/i)
      ).toBeInTheDocument();
      expect(within(previewRegion).queryAllByRole("radio")).toHaveLength(0);

      // Step 4 completed state shows Reset Demo (left) and Restart Tour (right), no Next button
      expect(within(tourRegion).queryByRole("button", { name: /^next$/i })).not.toBeInTheDocument();
      const resetBtn = within(tourRegion).getByRole("button", { name: /reset demo/i });
      const restartBtn = within(tourRegion).getByRole("button", { name: /restart tour/i });
      expect(
        resetBtn.compareDocumentPosition(restartBtn) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();

      // Clicking Restart Tour returns to Step 1 and resets all completed tour state
      await user.click(restartBtn);
      expect(
        within(tourRegion).getByRole("button", { name: /curate main profile/i })
      ).toHaveAttribute("aria-current", "step");
      const step1Preview = within(tourRegion).getByRole("region", { name: /step 1 preview/i });
      expect(within(step1Preview).getByText(/Rev #14/i)).toBeInTheDocument();
      expect(
        within(tourRegion).getByRole("button", { name: /try it: add verified fact/i })
      ).toBeInTheDocument();
    });

    it("pins condensed stepper and bottom controls on mobile scroll through the tour and avoids nested tour wrappers", async () => {
      const user = userEvent.setup();
      const origInnerWidth = window.innerWidth;
      const origInnerHeight = window.innerHeight;

      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        writable: true,
        value: 375,
      });
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        writable: true,
        value: 667,
      });

      try {
        renderLandingPage();

        const tourRegion = screen.getByRole("region", { name: /guided tour/i });
        const stepperNav = within(tourRegion).getByRole("navigation", {
          name: /guided tour steps/i,
        });
        const controlsGroup = within(tourRegion).getByRole("group", {
          name: /guided tour step controls/i,
        });
        const previewRegion = within(tourRegion).getByRole("region", {
          name: /step 1 preview/i,
        });

        // Flattened layout: preview wrapper omits extra nested border card
        expect(previewRegion.parentElement?.className).not.toContain("border ");
        expect(within(stepperNav).getByText("Profile")).toBeInTheDocument();
        expect(within(stepperNav).getByText("Branch")).toBeInTheDocument();
        expect(within(stepperNav).getByText("Tailor")).toBeInTheDocument();
        expect(within(stepperNav).getByText("Preview")).toBeInTheDocument();

        const makeRect = (top: number, height: number): DOMRect => ({
          top,
          bottom: top + height,
          left: 0,
          right: 375,
          width: 375,
          height,
          x: 0,
          y: top,
          toJSON: () => ({}),
        });

        const stepperAnchor = stepperNav.parentElement!;
        const controlsAnchor = controlsGroup.parentElement!;
        let rectScenario: "above" | "inside" | "past" = "above";

        vi.spyOn(tourRegion, "getBoundingClientRect").mockImplementation(() => {
          if (rectScenario === "above") return makeRect(460, 800);
          if (rectScenario === "inside") return makeRect(-120, 960);
          return makeRect(-820, 960);
        });
        vi.spyOn(stepperAnchor, "getBoundingClientRect").mockImplementation(() => {
          if (rectScenario === "above") return makeRect(540, 48);
          if (rectScenario === "inside") return makeRect(12, 48);
          return makeRect(-688, 48);
        });
        vi.spyOn(controlsAnchor, "getBoundingClientRect").mockImplementation(() => {
          if (rectScenario === "above") return makeRect(1208, 52);
          if (rectScenario === "inside") return makeRect(788, 52);
          return makeRect(88, 52);
        });

        // 1. Before entering the tour: neither bar is pinned
        act(() => {
          fireEvent.scroll(window);
        });
        expect(stepperNav).not.toHaveAttribute("data-pinned", "true");
        expect(controlsGroup).not.toHaveAttribute("data-pinned", "true");

        // 2. While scrolling through the tour body: BOTH condensed stepper and controls pin cleanly
        rectScenario = "inside";
        act(() => {
          fireEvent.scroll(window);
        });
        expect(stepperNav).toHaveAttribute("data-pinned", "true");
        expect(controlsGroup).toHaveAttribute("data-pinned", "true");

        // Interactive actions work seamlessly while pinned (Step 1 Try it -> Reset / Next)
        await user.click(
          within(controlsGroup).getByRole("button", { name: /try it: add verified fact/i })
        );
        expect(within(controlsGroup).getByRole("button", { name: /reset demo/i })).toBeEnabled();
        expect(within(controlsGroup).getByRole("button", { name: /^next$/i })).toBeEnabled();

        // 3. Past the bottom of the tour: BOTH bars unpin and never cover sections below
        rectScenario = "past";
        act(() => {
          fireEvent.scroll(window);
        });
        expect(stepperNav).not.toHaveAttribute("data-pinned", "true");
        expect(controlsGroup).not.toHaveAttribute("data-pinned", "true");

        // 4. Desktop width remains unpinned regardless of scroll offset
        rectScenario = "inside";
        Object.defineProperty(window, "innerWidth", {
          configurable: true,
          writable: true,
          value: 1024,
        });
        act(() => {
          fireEvent(window, new Event("resize"));
        });
        expect(stepperNav).not.toHaveAttribute("data-pinned", "true");
        expect(controlsGroup).not.toHaveAttribute("data-pinned", "true");
      } finally {
        Object.defineProperty(window, "innerWidth", {
          configurable: true,
          writable: true,
          value: origInnerWidth,
        });
        Object.defineProperty(window, "innerHeight", {
          configurable: true,
          writable: true,
          value: origInnerHeight,
        });
      }
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
      const dockerCmdEl = within(openSourceSection).getByText(/docker run/i);
      expect(dockerCmdEl).toBeInTheDocument();
      expect(dockerCmdEl.textContent).not.toContain(" -d ");
      expect(dockerCmdEl.textContent).toContain("-p 8080:8080 -p 8081:8081");

      // Alternative manual clone & run instructions
      expect(
        within(openSourceSection).getByText(/Alternative: Clone & Run Manually/i)
      ).toBeInTheDocument();
      expect(
        within(openSourceSection).getByText(/git clone https:\/\/github\.com\/resumeee-app\/resumeee\.git/i)
      ).toBeInTheDocument();
      const manualCopyBtn = within(openSourceSection).getByRole("button", {
        name: /copy manual setup command/i,
      });
      expect(manualCopyBtn).toBeInTheDocument();

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
    it("passes automated axe-core accessibility audit across all guided tour steps", async () => {
      const user = userEvent.setup();
      const { container } = renderLandingPage({ modalStepMs: 5000, generationStepMs: 15 });

      // Step 1
      expect(await axe(container)).toHaveNoViolations();

      const tourRegion = screen.getByRole("region", { name: /guided tour/i });

      // Step 2 (and while inline CreateBranchModal is open inside tourRegion)
      await user.click(within(tourRegion).getByRole("button", { name: /branch for a role/i }));
      expect(await axe(container)).toHaveNoViolations();
      await user.click(
        within(tourRegion).getByRole("button", { name: /try it: create role branch/i })
      );
      await within(tourRegion).findByRole("dialog", { name: /create new resume branch/i });
      expect(await axe(container)).toHaveNoViolations();
      await user.click(within(tourRegion).getByRole("button", { name: /cancel/i }));

      // Step 3 (initial untailored and after tailoring v1)
      await user.click(within(tourRegion).getByRole("button", { name: /tailor & analyze/i }));
      expect(await axe(container)).toHaveNoViolations();
      await user.click(within(tourRegion).getByRole("button", { name: /try it: tailor resume/i }));
      await within(tourRegion).findByText("97.0%");
      expect(await axe(container)).toHaveNoViolations();

      // Step 4 (DiffViewer and ResumeViewer)
      await user.click(
        within(tourRegion).getByRole("button", { name: /diff, preview & export/i })
      );
      expect(await axe(container)).toHaveNoViolations();
      await user.click(
        within(tourRegion).getByRole("button", { name: /try it: render ats resume & export/i })
      );
      // In jsdom, cross-frame messaging for sandboxed iframes is not supported by axe-core
      expect(await axe(container, { iframes: false })).toHaveNoViolations();
    });

    it("passes automated axe-core accessibility audit in dark mode across guided tour steps", async () => {
      const user = userEvent.setup();
      document.documentElement.classList.add("dark");
      try {
        const { container } = renderLandingPage({ modalStepMs: 5000, generationStepMs: 15 });
        const tourRegion = screen.getByRole("region", { name: /guided tour/i });

        expect(await axe(container)).toHaveNoViolations();

        await user.click(within(tourRegion).getByRole("button", { name: /tailor & analyze/i }));
        expect(await axe(container)).toHaveNoViolations();

        await user.click(
          within(tourRegion).getByRole("button", { name: /diff, preview & export/i })
        );
        expect(await axe(container)).toHaveNoViolations();

        await user.click(
          within(tourRegion).getByRole("button", { name: /try it: render ats resume & export/i })
        );
        const iframe = within(tourRegion).getByTitle("Rendered Resume Preview");
        expect(iframe.className).toContain("dark:bg-white");
        expect(iframe.getAttribute("srcdoc")).toContain("background-color: #ffffff");
        expect(await axe(container, { iframes: false })).toHaveNoViolations();
      } finally {
        document.documentElement.classList.remove("dark");
      }
    });
  });
});
