import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { GenerationProgress } from "./generation-progress";
import type { BranchVersion } from "@/api/generation-queries";

describe("GenerationProgress", () => {
  it("renders pending state with accessible live region", () => {
    const version: Partial<BranchVersion> = {
      id: "v-123",
      version_number: 2,
      status: "pending",
    };

    render(<GenerationProgress version={version as BranchVersion} />);

    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText(/Queued for AI Generation/i)).toBeInTheDocument();
  });

  it("renders processing state with spinner and progress text", () => {
    const version: Partial<BranchVersion> = {
      id: "v-123",
      version_number: 2,
      status: "processing",
    };

    render(<GenerationProgress version={version as BranchVersion} />);

    expect(screen.getByText(/Tailoring in Progress/i)).toBeInTheDocument();
  });

  it("renders completed state with success indicator", () => {
    const version: Partial<BranchVersion> = {
      id: "v-123",
      version_number: 2,
      status: "completed",
    };

    render(<GenerationProgress version={version as BranchVersion} />);

    expect(
      screen.getByText(/Generation Completed Successfully/i)
    ).toBeInTheDocument();
  });

  it("renders completed_with_warnings with validation warnings callout", () => {
    const version: Partial<BranchVersion> = {
      id: "v-123",
      version_number: 2,
      status: "completed_with_warnings",
      validation_warnings: [
        "Truncated experience bullets due to length constraint",
        "Potential hallucination detected in skill match",
      ],
    };

    render(<GenerationProgress version={version as BranchVersion} />);

    expect(
      screen.getByText(/Completed with Validation Warnings/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Truncated experience bullets due to length constraint"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("Potential hallucination detected in skill match")
    ).toBeInTheDocument();
  });

  it("renders failed state with error message and retry button", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    const version: Partial<BranchVersion> = {
      id: "v-123",
      version_number: 2,
      status: "failed",
      error_message: "Rate limit exceeded on LLM provider",
    };

    render(
      <GenerationProgress
        version={version as BranchVersion}
        onRetry={onRetry}
      />
    );

    expect(screen.getByText(/Generation Failed/i)).toBeInTheDocument();
    expect(
      screen.getByText("Rate limit exceeded on LLM provider")
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /retry generation/i });
    await user.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("has no accessibility violations across different status states", async () => {
    const version: Partial<BranchVersion> = {
      id: "v-123",
      version_number: 2,
      status: "completed_with_warnings",
      validation_warnings: ["Warning 1", "Warning 2"],
    };

    const { container } = render(
      <GenerationProgress version={version as BranchVersion} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
