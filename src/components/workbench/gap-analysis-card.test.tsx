import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { GapAnalysisCard } from "./gap-analysis-card";
import type { components } from "@/api/schema";
import type { ATSScore } from "@/api/workbench-queries";

type GapReport = components["schemas"]["GapReport"];

const mockGapReport: GapReport = {
  match_score: 87.5,
  identified_gaps: [
    {
      requirement: "Distributed Consensus with Raft or Paxos",
      missing_area: "Distributed Systems Experience",
      importance: "critical",
      recommended_action:
        "Highlight work on distributed consensus algorithms in past projects.",
    },
    {
      requirement: "Kubernetes Operator SDK",
      missing_area: "Container Orchestration",
      importance: "suggested",
      recommended_action: "Mention custom CRDs authored.",
    },
  ],
  strategic_recommendations: [
    "Quantify throughput improvements in infrastructure roles.",
    "Place Go backend expertise prominently in executive summary.",
  ],
};

const mockATSScore: ATSScore = {
  extraction_confidence_score: 94.0,
  job_matching_score: 86.5,
  extraction_summary: "All work history, skills, and education fields parsed cleanly.",
  matching_summary: "Extracted profile matches Go and distributed consensus requirements.",
  format_used: "markdown",
  evaluated_at: "2026-11-10T01:00:00Z",
};

describe("GapAnalysisCard", () => {
  it("renders unified card heading covering all 3 scoring purposes and displays all 3 scores in a single card", () => {
    render(
      <GapAnalysisCard
        gapReport={mockGapReport}
        atsScore={mockATSScore}
        versionNumber={2}
        isDefaultBranch={false}
        hasJobDescription={true}
        hasCompletedVersion={true}
      />
    );

    const cardSection = screen.getByRole("region", {
      name: /Target Match, ATS Perception & Gap Analysis \(v2\)/i,
    });
    expect(cardSection).toBeInTheDocument();

    expect(
      within(cardSection).getByRole("heading", {
        level: 2,
        name: /Target Match, ATS Perception & Gap Analysis \(v2\)/i,
      })
    ).toBeInTheDocument();
    expect(screen.queryByText(/ATS Match/i)).not.toBeInTheDocument();

    // All 3 scores live within the single card section
    expect(within(cardSection).getByText("Target Match Score")).toBeInTheDocument();
    expect(within(cardSection).getByText("Extraction Confidence Score")).toBeInTheDocument();
    expect(within(cardSection).getByText("Job Matching Score")).toBeInTheDocument();

    const targetMeter = within(cardSection).getByRole("meter", {
      name: "Target Match Score",
    });
    expect(targetMeter).toHaveAttribute("aria-valuenow", "87.5");
    expect(targetMeter).toHaveAttribute("aria-valuemin", "0");
    expect(targetMeter).toHaveAttribute("aria-valuemax", "100");

    const extractionMeter = within(cardSection).getByRole("meter", {
      name: "Extraction Confidence Score",
    });
    expect(extractionMeter).toHaveAttribute("aria-valuenow", "94");
    expect(extractionMeter).toHaveAttribute("aria-valuemin", "0");
    expect(extractionMeter).toHaveAttribute("aria-valuemax", "100");

    const matchingMeter = within(cardSection).getByRole("meter", {
      name: "Job Matching Score",
    });
    expect(matchingMeter).toHaveAttribute("aria-valuenow", "86.5");
    expect(matchingMeter).toHaveAttribute("aria-valuemin", "0");
    expect(matchingMeter).toHaveAttribute("aria-valuemax", "100");

    expect(within(cardSection).getByText("87.5%")).toBeInTheDocument();
    expect(within(cardSection).getByText("94.0%")).toBeInTheDocument();
    expect(within(cardSection).getByText("86.5%")).toBeInTheDocument();

    expect(
      within(cardSection).getByRole("button", { name: /toggle gap analysis report/i })
    ).toBeInTheDocument();
  });

  it("expands and reveals gap items and strategic recommendations", async () => {
    const user = userEvent.setup();
    render(<GapAnalysisCard gapReport={mockGapReport} versionNumber={2} />);

    const toggleBtn = screen.getByRole("button", {
      name: /toggle gap analysis report/i,
    });
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");

    await user.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");

    expect(
      screen.getByText("Distributed Consensus with Raft or Paxos")
    ).toBeInTheDocument();
    expect(screen.getByText("critical")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Quantify throughput improvements in infrastructure roles."
      )
    ).toBeInTheDocument();
  });

  it("renders empty state gracefully when report is absent while keeping the 3 score slots visible", () => {
    render(<GapAnalysisCard gapReport={undefined} versionNumber={1} />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /Target Match, ATS Perception & Gap Analysis \(v1\)/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no gap analysis report available/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/target match scoring and identified qualification gaps/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/ATS match/i)).not.toBeInTheDocument();
  });

  it("renders Extraction Confidence Score and Job Matching Score labels and triggers on-demand", async () => {
    const user = userEvent.setup();
    const onSimulate = vi.fn();

    render(
      <GapAnalysisCard
        gapReport={mockGapReport}
        atsScore={null}
        versionNumber={2}
        isDefaultBranch={false}
        hasJobDescription={true}
        hasCompletedVersion={true}
        onSimulate={onSimulate}
      />
    );

    expect(screen.getByText("Target Match Score")).toBeInTheDocument();
    expect(screen.getByText("Extraction Confidence Score")).toBeInTheDocument();
    expect(screen.getByText("Job Matching Score")).toBeInTheDocument();

    // Must not trigger automatically on mount
    expect(onSimulate).not.toHaveBeenCalled();

    const triggerBtn = screen.getByRole("button", { name: /calculate ats score/i });
    expect(triggerBtn).toBeEnabled();

    await user.click(triggerBtn);
    expect(onSimulate).toHaveBeenCalledTimes(1);
  });

  it("displays 0 to 100% meter values when atsScore is present and disables re-triggering for the version", () => {
    const onSimulate = vi.fn();

    render(
      <GapAnalysisCard
        gapReport={mockGapReport}
        atsScore={mockATSScore}
        versionNumber={2}
        isDefaultBranch={false}
        hasJobDescription={true}
        hasCompletedVersion={true}
        onSimulate={onSimulate}
      />
    );

    expect(
      screen.getByText(
        "All work history, skills, and education fields parsed cleanly."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Extracted profile matches Go and distributed consensus requirements."
      )
    ).toBeInTheDocument();

    // Triggers once per tailored version: button is disabled once score exists
    const triggerBtn = screen.getByRole("button", { name: /ats score calculated/i });
    expect(triggerBtn).toBeDisabled();
  });

  it("disables ATS calculation for Default Main Branch", () => {
    render(
      <GapAnalysisCard
        gapReport={null}
        atsScore={null}
        versionNumber={1}
        isDefaultBranch={true}
        hasJobDescription={true}
        hasCompletedVersion={true}
        onSimulate={vi.fn()}
      />
    );

    const triggerBtn = screen.getByRole("button", { name: /calculate ats score/i });
    expect(triggerBtn).toBeDisabled();
    expect(
      screen.getByText(/disabled for the default main branch/i)
    ).toBeInTheDocument();
  });

  it("disables ATS calculation when Job Description is not provided in a tailored branch", () => {
    render(
      <GapAnalysisCard
        gapReport={mockGapReport}
        atsScore={null}
        versionNumber={1}
        isDefaultBranch={false}
        hasJobDescription={false}
        hasCompletedVersion={true}
        onSimulate={vi.fn()}
      />
    );

    const triggerBtn = screen.getByRole("button", { name: /calculate ats score/i });
    expect(triggerBtn).toBeDisabled();
    expect(
      screen.getByText(/provide a job description/i)
    ).toBeInTheDocument();
  });

  it("disables ATS calculation when no completed tailored version exists", () => {
    render(
      <GapAnalysisCard
        gapReport={null}
        atsScore={null}
        versionNumber={undefined}
        isDefaultBranch={false}
        hasJobDescription={true}
        hasCompletedVersion={false}
        onSimulate={vi.fn()}
      />
    );

    const triggerBtn = screen.getByRole("button", { name: /calculate ats score/i });
    expect(triggerBtn).toBeDisabled();
    expect(
      screen.getByText(/tailor a resume version first/i)
    ).toBeInTheDocument();
  });

  it("disables ATS calculation and shows loading label when isSimulating is true", () => {
    render(
      <GapAnalysisCard
        gapReport={mockGapReport}
        atsScore={null}
        versionNumber={1}
        isDefaultBranch={false}
        hasJobDescription={true}
        hasCompletedVersion={true}
        isSimulating={true}
        onSimulate={vi.fn()}
      />
    );

    const triggerBtn = screen.getByRole("button", {
      name: /calculating ats score/i,
    });
    expect(triggerBtn).toBeDisabled();
    expect(triggerBtn).toHaveAttribute("aria-disabled", "true");
  });

  it("clamps out-of-range ATS score values to 0..100%", () => {
    render(
      <GapAnalysisCard
        gapReport={mockGapReport}
        atsScore={{
          extraction_confidence_score: 120,
          job_matching_score: -5,
        }}
        versionNumber={1}
        isDefaultBranch={false}
        hasJobDescription={true}
        hasCompletedVersion={true}
      />
    );

    const extractionMeter = screen.getByRole("meter", {
      name: "Extraction Confidence Score",
    });
    expect(extractionMeter).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("100.0%")).toBeInTheDocument();

    const matchingMeter = screen.getByRole("meter", {
      name: "Job Matching Score",
    });
    expect(matchingMeter).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("0.0%")).toBeInTheDocument();
  });

  it("passes accessibility audit with 0 violations across empty, collapsed, expanded, and evaluated states", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <GapAnalysisCard
        gapReport={mockGapReport}
        atsScore={mockATSScore}
        versionNumber={2}
        isDefaultBranch={false}
        hasJobDescription={true}
        hasCompletedVersion={true}
        onSimulate={vi.fn()}
      />
    );

    let results = await axe(container);
    expect(results).toHaveNoViolations();

    const toggleBtn = screen.getByRole("button", {
      name: /toggle gap analysis report/i,
    });
    await user.click(toggleBtn);

    results = await axe(container);
    expect(results).toHaveNoViolations();

    const { container: emptyContainer } = render(
      <GapAnalysisCard
        gapReport={null}
        atsScore={null}
        versionNumber={1}
        isDefaultBranch={false}
        hasJobDescription={true}
        hasCompletedVersion={false}
        onSimulate={vi.fn()}
      />
    );
    expect(await axe(emptyContainer)).toHaveNoViolations();
  });

  it("defensively handles backend payload with missing_requirements and no match score without crashing or displaying NaN%", async () => {
    const user = userEvent.setup();
    const backendPayload: GapReport = {
      overall_match_summary: "Strong candidate with slight gaps in cloud orchestration.",
      match_score: null,
      missing_requirements: [
        {
          requirement: "Prometheus Metric Exporters in Go",
          importance: "critical",
          clarifying_prompt: "Have you implemented custom Prometheus collectors in Go?",
          missing_area: "Observability",
        },
      ],
      strategic_recommendations: ["Emphasize telemetry work."],
    };

    render(<GapAnalysisCard gapReport={backendPayload} versionNumber={3} />);

    // Must not display NaN
    expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument();

    const toggleBtn = screen.getByRole("button", {
      name: /toggle gap analysis report/i,
    });
    await user.click(toggleBtn);

    expect(
      screen.getByText("Prometheus Metric Exporters in Go")
    ).toBeInTheDocument();
    expect(screen.getByText("Observability")).toBeInTheDocument();
  });

  it("supports dismissing a false positive gap and restoring it", async () => {
    const user = userEvent.setup();
    render(<GapAnalysisCard gapReport={mockGapReport} versionNumber={2} defaultExpanded={true} />);

    const dismissButtons = screen.getAllByRole("button", { name: /dismiss|false positive/i });
    expect(dismissButtons.length).toBeGreaterThan(0);
    const firstDismissBtn = dismissButtons[0];
    if (!firstDismissBtn) throw new Error("Expected dismiss button to exist");

    await user.click(firstDismissBtn);
    expect(screen.getByText(/dismissed/i)).toBeInTheDocument();

    // Can restore
    const restoreBtn = screen.getByRole("button", { name: /restore/i });
    await user.click(restoreBtn);
    expect(screen.queryByText(/dismissed/i)).not.toBeInTheDocument();
  });

  it("reveals interview talking points when requested", async () => {
    const user = userEvent.setup();
    render(<GapAnalysisCard gapReport={mockGapReport} versionNumber={2} defaultExpanded={true} />);

    const talkingPointBtns = screen.getAllByRole("button", { name: /talking point/i });
    expect(talkingPointBtns.length).toBeGreaterThan(0);
    const firstTalkingPointBtn = talkingPointBtns[0];
    if (!firstTalkingPointBtn) throw new Error("Expected talking point button to exist");

    await user.click(firstTalkingPointBtn);
    expect(screen.getByText(/Framing Adjacent Experience/i)).toBeInTheDocument();
  });

  it("opens quick-add fact modal when clicking 'I Have This Experience'", async () => {
    const user = userEvent.setup();
    render(<GapAnalysisCard gapReport={mockGapReport} versionNumber={2} defaultExpanded={true} />);

    const quickAddBtns = screen.getAllByRole("button", { name: /i have this experience|quick-add/i });
    expect(quickAddBtns.length).toBeGreaterThan(0);
    const firstQuickAddBtn = quickAddBtns[0];
    if (!firstQuickAddBtn) throw new Error("Expected quick-add button to exist");

    await user.click(firstQuickAddBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/add verified experience to profile/i)).toBeInTheDocument();
  });
});
