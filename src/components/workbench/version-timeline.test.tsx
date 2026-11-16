import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { VersionTimeline } from "./version-timeline";
import type { BranchVersion } from "@/api/generation-queries";

const mockVersions: BranchVersion[] = [
  {
    id: "ver-1",
    branch_id: "b-1",
    version_number: 1,
    status: "completed",
    model_used: "claude-3-7-sonnet",
    created_at: "2026-11-01T12:00:00Z",
  },
  {
    id: "ver-2",
    branch_id: "b-1",
    version_number: 2,
    status: "completed_with_warnings",
    model_used: "gemini-1.5-pro",
    created_at: "2026-11-01T13:00:00Z",
    validation_warnings: ["Length exceeded"],
  },
];

describe("VersionTimeline", () => {
  it("renders list of versions with version numbers, model, and active indicator", () => {
    render(
      <VersionTimeline
        versions={mockVersions}
        activeVersionId="ver-1"
        selectedVersionId="ver-1"
        onSelectVersion={vi.fn()}
        onSetActiveVersion={vi.fn()}
        isSettingActive={false}
      />
    );

    expect(screen.getByText("Version v1")).toBeInTheDocument();
    expect(screen.getByText("Version v2")).toBeInTheDocument();
    expect(screen.getByText("claude-3-7-sonnet")).toBeInTheDocument();
    expect(screen.getByText("gemini-1.5-pro")).toBeInTheDocument();
    expect(screen.getByText("Active Version")).toBeInTheDocument();
  });

  it("shows 'Set as Active Version' button on non-active completed versions", async () => {
    const user = userEvent.setup();
    const onSetActive = vi.fn();

    render(
      <VersionTimeline
        versions={mockVersions}
        activeVersionId="ver-1"
        selectedVersionId="ver-1"
        onSelectVersion={vi.fn()}
        onSetActiveVersion={onSetActive}
        isSettingActive={false}
      />
    );

    const setActiveBtn = screen.getByRole("button", {
      name: /set v2 as active/i,
    });
    await user.click(setActiveBtn);

    expect(onSetActive).toHaveBeenCalledWith("ver-2");
  });

  it("allows selecting a version to inspect details", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <VersionTimeline
        versions={mockVersions}
        activeVersionId="ver-1"
        selectedVersionId="ver-1"
        onSelectVersion={onSelect}
        onSetActiveVersion={vi.fn()}
        isSettingActive={false}
      />
    );

    const inspectBtn = screen.getByRole("button", {
      name: /inspect v2/i,
    });
    await user.click(inspectBtn);

    expect(onSelect).toHaveBeenCalledWith(mockVersions[1]);
  });

  it("allows triggering compare on completed versions", async () => {
    const user = userEvent.setup();
    const onCompare = vi.fn();

    render(
      <VersionTimeline
        versions={mockVersions}
        activeVersionId="ver-1"
        selectedVersionId="ver-1"
        onSelectVersion={vi.fn()}
        onSetActiveVersion={vi.fn()}
        onCompareVersion={onCompare}
        isSettingActive={false}
      />
    );

    const compareBtn = screen.getByRole("button", {
      name: /compare v2/i,
    });
    await user.click(compareBtn);

    expect(onCompare).toHaveBeenCalledWith(mockVersions[1]);
  });

  it("renders empty state when versions list is empty", () => {
    render(
      <VersionTimeline
        versions={[]}
        activeVersionId={null}
        selectedVersionId={null}
        onSelectVersion={vi.fn()}
        onSetActiveVersion={vi.fn()}
        isSettingActive={false}
      />
    );

    expect(screen.getByText(/no versions generated yet/i)).toBeInTheDocument();
  });

  it("renders Cancelled badge for cancelled versions", () => {
    const withCancelled: BranchVersion[] = [
      ...mockVersions,
      {
        id: "ver-cancelled",
        branch_id: "b-1",
        version_number: 3,
        status: "cancelled",
        created_at: "2026-11-01T14:00:00Z",
      },
    ];

    render(
      <VersionTimeline
        versions={withCancelled}
        activeVersionId="ver-1"
        selectedVersionId="ver-1"
        onSelectVersion={vi.fn()}
        onSetActiveVersion={vi.fn()}
        isSettingActive={false}
      />
    );

    expect(screen.getByText("Version v3")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("passes accessibility audit with 0 violations", async () => {
    const { container } = render(
      <VersionTimeline
        versions={mockVersions}
        activeVersionId="ver-1"
        selectedVersionId="ver-1"
        onSelectVersion={vi.fn()}
        onSetActiveVersion={vi.fn()}
        isSettingActive={false}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
