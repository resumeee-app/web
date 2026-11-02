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
});
