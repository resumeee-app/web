import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import {
  formatBranchDate,
  formatBranchTarget,
  DefaultBranchBadge,
  BranchStatusBadge,
  BranchTargetDisplay,
} from "./branch-shared-elements";

describe("branch-shared-elements", () => {
  describe("formatBranchDate", () => {
    it("formats ISO timestamps into human readable dates", () => {
      const formatted = formatBranchDate("2026-11-01T12:00:00Z");
      expect(formatted).toMatch(/Nov 1, 2026/);
    });

    it("returns 'Recently' when date is undefined or empty", () => {
      expect(formatBranchDate(undefined)).toBe("Recently");
      expect(formatBranchDate("")).toBe("Recently");
    });

    it("returns 'Recently' when date is invalid", () => {
      expect(formatBranchDate("not-a-valid-date")).toBe("Recently");
    });
  });

  describe("formatBranchTarget", () => {
    it("formats company and role combined", () => {
      expect(formatBranchTarget("Stripe", "Staff Engineer")).toBe(
        "Stripe • Staff Engineer"
      );
    });

    it("formats company only", () => {
      expect(formatBranchTarget("Google", null)).toBe("Google");
    });

    it("formats role only", () => {
      expect(formatBranchTarget(undefined, "Engineering Manager")).toBe(
        "Engineering Manager"
      );
    });

    it("falls back to default fallback when both are missing", () => {
      expect(formatBranchTarget(null, null)).toBe("Untargeted");
      expect(formatBranchTarget(undefined, undefined, "Custom Fallback")).toBe(
        "Custom Fallback"
      );
    });
  });

  describe("DefaultBranchBadge", () => {
    it("renders default branch badge with accessible text", async () => {
      const { container } = render(<DefaultBranchBadge iconSize="md" />);
      expect(screen.getByText("Default Branch")).toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();
    });

    it("renders compact variant with sm icon size", () => {
      render(<DefaultBranchBadge iconSize="sm" />);
      expect(screen.getByText("Default Branch")).toBeInTheDocument();
    });
  });

  describe("BranchStatusBadge", () => {
    it("renders active status badge with emerald styling", () => {
      render(<BranchStatusBadge status="active" />);
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("renders tailoring status badge with amber styling and sparkles icon", () => {
      render(<BranchStatusBadge status="tailoring" />);
      expect(screen.getByText("Tailoring")).toBeInTheDocument();
    });

    it("renders error status badge with red styling and alert icon", () => {
      render(<BranchStatusBadge status="error" />);
      expect(screen.getByText("Error")).toBeInTheDocument();
    });

    it("renders stale and needs_sync status badge as Out of Sync without pulsing animation", () => {
      const { rerender } = render(<BranchStatusBadge status="stale" />);
      expect(screen.getByText("Out of Sync")).toBeInTheDocument();
      // Ensure it does not render Tailoring
      expect(screen.queryByText("Tailoring")).not.toBeInTheDocument();

      rerender(<BranchStatusBadge status="needs_sync" />);
      expect(screen.getByText("Out of Sync")).toBeInTheDocument();
    });
  });

  describe("BranchTargetDisplay", () => {
    it("renders company and role separated by bullet", () => {
      render(
        <BranchTargetDisplay targetCompany="Apple" targetRole="iOS Architect" />
      );
      expect(screen.getByText("Apple")).toBeInTheDocument();
      expect(screen.getByText("iOS Architect")).toBeInTheDocument();
      expect(screen.getByText(/Apple/)).toBeInTheDocument();
    });

    it("renders company only when role is absent", () => {
      render(<BranchTargetDisplay targetCompany="Netflix" />);
      expect(screen.getByText("Netflix")).toBeInTheDocument();
    });

    it("renders role only when company is absent", () => {
      render(<BranchTargetDisplay targetRole="Backend Developer" />);
      expect(screen.getByText("Backend Developer")).toBeInTheDocument();
    });

    it("renders custom empty fallback when both are absent", () => {
      render(<BranchTargetDisplay emptyFallback="No Target" />);
      expect(screen.getByText("No Target")).toBeInTheDocument();
    });
  });
});
