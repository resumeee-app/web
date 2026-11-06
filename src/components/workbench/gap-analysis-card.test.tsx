import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { GapAnalysisCard } from "./gap-analysis-card";
import type { components } from "@/api/schema";

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

describe("GapAnalysisCard", () => {
  it("renders match score and toggle button", () => {
    render(<GapAnalysisCard gapReport={mockGapReport} versionNumber={2} />);

    expect(screen.getByText("87.5%")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /toggle gap analysis report/i })
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

  it("renders empty state gracefully when report is absent", () => {
    render(<GapAnalysisCard gapReport={undefined} versionNumber={1} />);

    expect(
      screen.getByText(/no gap analysis report available/i)
    ).toBeInTheDocument();
  });

  it("passes accessibility audit with 0 violations in both collapsed and expanded states", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <GapAnalysisCard gapReport={mockGapReport} versionNumber={2} />
    );

    let results = await axe(container);
    expect(results).toHaveNoViolations();

    const toggleBtn = screen.getByRole("button", {
      name: /toggle gap analysis report/i,
    });
    await user.click(toggleBtn);

    results = await axe(container);
    expect(results).toHaveNoViolations();
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
