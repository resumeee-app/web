import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ATSScoreCard } from "./ats-score-card";
import type { ATSScore } from "@/api/workbench-queries";

const mockATSScore: ATSScore = {
  extraction_confidence_score: 94.0,
  job_matching_score: 86.5,
  extraction_summary: "All work history, skills, and education fields parsed cleanly.",
  matching_summary: "Extracted profile matches Go and distributed consensus requirements.",
  format_used: "markdown",
  evaluated_at: "2026-11-10T01:00:00Z",
};

describe("ATSScoreCard", () => {
  it("renders Extraction Confidence Score and Job Matching Score labels and triggers on-demand", async () => {
    const user = userEvent.setup();
    const onSimulate = vi.fn();

    render(
      <ATSScoreCard
        atsScore={null}
        versionNumber={2}
        isDefaultBranch={false}
        hasJobDescription={true}
        hasCompletedVersion={true}
        onSimulate={onSimulate}
      />
    );

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
      <ATSScoreCard
        atsScore={mockATSScore}
        versionNumber={2}
        isDefaultBranch={false}
        hasJobDescription={true}
        hasCompletedVersion={true}
        onSimulate={onSimulate}
      />
    );

    expect(screen.getByText("Extraction Confidence Score")).toBeInTheDocument();
    expect(screen.getByText("Job Matching Score")).toBeInTheDocument();

    const extractionMeter = screen.getByRole("meter", {
      name: "Extraction Confidence Score",
    });
    expect(extractionMeter).toHaveAttribute("aria-valuenow", "94");
    expect(extractionMeter).toHaveAttribute("aria-valuemin", "0");
    expect(extractionMeter).toHaveAttribute("aria-valuemax", "100");

    const matchingMeter = screen.getByRole("meter", {
      name: "Job Matching Score",
    });
    expect(matchingMeter).toHaveAttribute("aria-valuenow", "86.5");
    expect(matchingMeter).toHaveAttribute("aria-valuemin", "0");
    expect(matchingMeter).toHaveAttribute("aria-valuemax", "100");

    expect(screen.getByText("94.0%")).toBeInTheDocument();
    expect(screen.getByText("86.5%")).toBeInTheDocument();
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

  it("is disabled for Default Main Branch", () => {
    render(
      <ATSScoreCard
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

  it("is disabled when Job Description is not provided in a tailored branch", () => {
    render(
      <ATSScoreCard
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

  it("is disabled when no completed tailored version exists", () => {
    render(
      <ATSScoreCard
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

  it("is disabled and shows loading label when isSimulating is true", () => {
    render(
      <ATSScoreCard
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

  it("clamps out-of-range score values to 0..100%", () => {
    render(
      <ATSScoreCard
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

  it("passes automated axe accessibility audit in both empty and evaluated states", async () => {
    const { container: emptyContainer } = render(
      <ATSScoreCard
        atsScore={null}
        versionNumber={1}
        isDefaultBranch={false}
        hasJobDescription={true}
        hasCompletedVersion={true}
        onSimulate={vi.fn()}
      />
    );
    expect(await axe(emptyContainer)).toHaveNoViolations();

    const { container: evaluatedContainer } = render(
      <ATSScoreCard
        atsScore={mockATSScore}
        versionNumber={2}
        isDefaultBranch={false}
        hasJobDescription={true}
        hasCompletedVersion={true}
        onSimulate={vi.fn()}
      />
    );
    expect(await axe(evaluatedContainer)).toHaveNoViolations();
  });
});
