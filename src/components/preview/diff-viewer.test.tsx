import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { DiffViewer } from "./diff-viewer";
import type { BranchVersion, MasterProfileSnapshot } from "@/api/render-queries";

describe("DiffViewer Component", () => {
  const mockMasterProfile: MasterProfileSnapshot = {
    master_revision: 3,
    exported_at: "2026-11-01T00:00:00Z",
    profile: {
      id: "p-1",
      user_id: "u-1",
      full_name: "Jane Doe",
      headline: "Generalist Software Engineer",
      summary: "Experienced software engineer working on web backends.",
      default_provider: "anthropic",
      default_model: "claude-3-5-sonnet-20241022",
      master_revision: 3,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    skills: [
      { id: "s-1", user_id: "u-1", name: "Go", category: "Backend" },
      { id: "s-2", user_id: "u-1", name: "Python", category: "Backend" },
    ],
    experiences: [
      {
        id: "exp-1",
        user_id: "u-1",
        company: "Acme Corp",
        role_title: "Senior Developer",
        start_date: "2022-01",
        facts: [
          {
            id: "f-1",
            user_id: "u-1",
            owner_id: "exp-1",
            owner_type: "work_experience",
            statement: "Maintained legacy monolithic services.",
          },
          {
            id: "f-2",
            user_id: "u-1",
            owner_id: "exp-1",
            owner_type: "work_experience",
            statement: "Managed on-call rotation schedules.",
          },
        ],
      },
    ],
    projects: [],
    education: [],
    certifications: [],
    facts: [],
  };

  const mockVersion1: BranchVersion = {
    id: "v-1",
    branch_id: "b-1",
    version_number: 1,
    status: "completed",
    tailored_content: {
      full_name: "Jane Doe",
      headline: "Senior Distributed Systems Engineer",
      summary: "Distributed systems specialist focused on Go microservices.",
      skill_groups: [
        {
          category: "Backend",
          skills: ["Go", "Kubernetes"],
          source_skill_ids: ["s-1"],
        },
      ],
      experiences: [
        {
          source_entity_id: "exp-1",
          company: "Acme Corp",
          role_title: "Senior Developer",
          start_date: "2022-01",
          bullet_points: [
            {
              text: "Architected high-throughput Go microservices handling 50k req/s.",
              source_fact_ids: ["f-1"],
            },
          ],
        },
      ],
    },
  };

  const mockVersion2: BranchVersion = {
    id: "v-2",
    branch_id: "b-1",
    version_number: 2,
    status: "completed",
    tailored_content: {
      full_name: "Jane Doe",
      headline: "Staff Cloud Infrastructure Architect",
      summary: "Staff architect with expertise in multi-region Kubernetes deployments.",
      skill_groups: [
        {
          category: "Backend",
          skills: ["Go", "Kubernetes", "gRPC"],
          source_skill_ids: ["s-1"],
        },
      ],
      experiences: [
        {
          source_entity_id: "exp-1",
          company: "Acme Corp",
          role_title: "Senior Developer",
          start_date: "2022-01",
          bullet_points: [
            {
              text: "Architected high-throughput Go microservices handling 50k req/s.",
              source_fact_ids: ["f-1"],
            },
            {
              text: "Spearheaded zero-downtime Kubernetes migration reducing latency by 40%.",
              source_fact_ids: ["f-1"],
            },
          ],
        },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders diff viewer with baseline target selector", () => {
    render(
      <DiffViewer
        currentVersion={mockVersion1}
        masterProfile={mockMasterProfile}
        previousVersions={[mockVersion1]}
      />
    );

    expect(screen.getByRole("region", { name: /tailored resume diff viewer/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/compare against/i)).toBeInTheDocument();
  });

  it("highlights tailored additions in green and omitted master facts in strikethrough", () => {
    render(
      <DiffViewer
        currentVersion={mockVersion1}
        masterProfile={mockMasterProfile}
        previousVersions={[mockVersion1]}
      />
    );

    // Green addition badge/item
    const addedBullet = screen.getByText(/Architected high-throughput Go microservices handling 50k req\/s/);
    expect(addedBullet).toBeInTheDocument();
    expect(addedBullet.closest("[data-diff-type]")).toHaveAttribute("data-diff-type", "addition");

    // Omitted master facts in struck-through deletion
    const omittedFact = screen.getByText(/Managed on-call rotation schedules/);
    expect(omittedFact).toBeInTheDocument();
    expect(omittedFact.closest("[data-diff-type]")).toHaveAttribute("data-diff-type", "deletion");

    // Blue badge for highlighted skills
    const skillBadge = screen.getByText("Kubernetes");
    expect(skillBadge.closest("[data-skill-badge]")).toHaveAttribute("data-skill-badge", "highlighted");
  });

  it("compares against a selected previous version", async () => {
    const user = userEvent.setup();
    render(
      <DiffViewer
        currentVersion={mockVersion2}
        masterProfile={mockMasterProfile}
        previousVersions={[mockVersion1, mockVersion2]}
      />
    );

    const baselineSelect = screen.getByLabelText(/compare against/i);
    await user.selectOptions(baselineSelect, "v-1");

    // v2 has the new bullet point
    const v2Bullet = screen.getByText(/Spearheaded zero-downtime Kubernetes migration/);
    expect(v2Bullet.closest("[data-diff-type]")).toHaveAttribute("data-diff-type", "addition");

    // Unchanged bullet
    const unchangedBullet = screen.getByText(/Architected high-throughput Go microservices/);
    expect(unchangedBullet.closest("[data-diff-type]")).toHaveAttribute("data-diff-type", "unchanged");
  });

  it("safely handles master branch version with bullets property instead of bullet_points without crashing", () => {
    // Master branch version generated from SnapshotToTailoredContent may serialize "bullets"
    const masterBranchVersion = {
      id: "v-master",
      branch_id: "b-master",
      version_number: 1,
      status: "completed" as const,
      tailored_content: {
        full_name: "Jane Doe",
        headline: "Generalist Software Engineer",
        summary: "Experienced software engineer working on web backends.",
        skill_groups: [
          {
            category: "Backend",
            skills: ["Go", "Python"],
          },
        ],
        experiences: [
          {
            source_entity_id: "exp-1",
            company: "Acme Corp",
            role_title: "Senior Developer",
            start_date: "2022-01",
            // Backend JSON may emit bullets rather than bullet_points
            bullets: [
              {
                text: "Maintained legacy monolithic services.",
                source_fact_ids: ["f-1"],
              },
            ],
          },
        ],
      },
    } as unknown as BranchVersion;

    render(
      <DiffViewer
        currentVersion={masterBranchVersion}
        masterProfile={mockMasterProfile}
        previousVersions={[masterBranchVersion]}
      />
    );

    expect(screen.getByRole("region", { name: /tailored resume diff viewer/i })).toBeInTheDocument();
    expect(screen.getByText("Maintained legacy monolithic services.")).toBeInTheDocument();
  });

  it("safely handles missing or undefined arrays on tailored content and master profile", () => {
    const sparseVersion = {
      id: "v-sparse",
      branch_id: "b-1",
      version_number: 1,
      status: "completed" as const,
      tailored_content: {
        full_name: "Jane Doe",
        headline: "Generalist Software Engineer",
        summary: "Summary text",
        skill_groups: undefined,
        experiences: [
          {
            source_entity_id: "exp-empty",
            company: "Startup Inc",
            role_title: "Lead",
            start_date: "2023-01",
            bullet_points: undefined,
          },
        ],
      },
    } as unknown as BranchVersion;

    const sparseMasterProfile: MasterProfileSnapshot = {
      master_revision: 1,
      exported_at: "2026-11-01T00:00:00Z",
      profile: {
        id: "p-sparse",
        user_id: "u-1",
        full_name: "Jane Doe",
        headline: "",
        summary: "",
        default_provider: "anthropic",
        default_model: "claude-3-5-sonnet-20241022",
        master_revision: 1,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      skills: undefined,
      experiences: undefined,
      facts: undefined,
    };

    render(
      <DiffViewer
        currentVersion={sparseVersion}
        masterProfile={sparseMasterProfile}
        previousVersions={[]}
      />
    );

    expect(screen.getByRole("region", { name: /tailored resume diff viewer/i })).toBeInTheDocument();
    expect(screen.getByText(/Startup Inc/)).toBeInTheDocument();
  });

  it("displays empty state when version tailored content is absent", () => {
    const emptyVersion: BranchVersion = {
      id: "v-empty",
      branch_id: "b-1",
      version_number: 1,
      status: "pending",
    };

    render(
      <DiffViewer
        currentVersion={emptyVersion}
        masterProfile={mockMasterProfile}
        previousVersions={[emptyVersion]}
      />
    );

    expect(screen.getByText(/no tailored content available for diff/i)).toBeInTheDocument();
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = render(
      <DiffViewer
        currentVersion={mockVersion1}
        masterProfile={mockMasterProfile}
        previousVersions={[mockVersion1]}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
