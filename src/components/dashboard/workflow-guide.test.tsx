/**
 * @file workflow-guide.test.tsx
 * @description Unit and accessibility tests for the WorkflowGuide dashboard component.
 * Validates rendering of the three-phase workflow guide, career graph readiness milestones,
 * collapsible toggling with localStorage persistence, action seam callbacks, and WAI-ARIA compliance.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { axe } from "vitest-axe";
import { WorkflowGuide } from "./workflow-guide";
import type { Branch, Preset, TemplateSet } from "@/api/branch-queries";
import type { components } from "@/api/schema";

describe("WorkflowGuide Component", () => {
  const mockProfileComplete: components["schemas"]["MainProfileSnapshot"] = {
    profile: {
      id: "p1",
      user_id: "u1",
      full_name: "Jane Developer",
      headline: "Senior Cloud Architect",
      main_revision: 3,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    main_revision: 3,
    experiences: [
      {
        id: "e1",
        user_id: "u1",
        company: "Acme Cloud",
        role_title: "Cloud Architect",
        is_current: true,
        start_date: "2023-01",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
    skills: [
      { id: "s1", user_id: "u1", name: "Kubernetes", category: "Infra", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
      { id: "s2", user_id: "u1", name: "Terraform", category: "Infra", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
      { id: "s3", user_id: "u1", name: "Go", category: "Backend", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
    ],
    projects: [],
    education: [],
    certifications: [],
    facts: [],
    exported_at: "2026-01-01T00:00:00Z",
  };

  const mockBranchesWithTailored: Branch[] = [
    {
      id: "b-default",
      user_id: "u1",
      name: "Main Profile (Default)",
      template_set_id: "tmpl-clean",
      is_default: true,
    },
    {
      id: "b-tailored",
      user_id: "u1",
      name: "Acme - Lead SRE",
      target_company: "Acme",
      target_role: "Lead SRE",
      template_set_id: "tmpl-clean",
      is_default: false,
    },
  ];

  const mockTemplates: TemplateSet[] = [
    {
      id: "tmpl-clean",
      user_id: "system",
      name: "Clean Layout",
      html_template: "<div />",
      markdown_template: "# Res",
      text_template: "Res",
    },
  ];

  const mockPresets: Preset[] = [
    {
      id: "preset-1",
      user_id: "system",
      name: "Executive Strategy",
      system_instructions: "Highlight executive leadership and scale",
      template_set_id: "tmpl-clean",
    },
  ];

  const defaultProps = {
    profileSnapshot: mockProfileComplete,
    branches: mockBranchesWithTailored,
    templates: mockTemplates,
    presets: mockPresets,
    onCreateBranch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders workflow guide with 3 core pillars and readiness checklist, passing a11y audit", async () => {
    const { container } = render(
      <MemoryRouter>
        <WorkflowGuide {...defaultProps} />
      </MemoryRouter>
    );

    // Section heading
    expect(
      screen.getByRole("heading", { level: 2, name: /how resumeee works/i })
    ).toBeInTheDocument();

    // 3 pillars
    expect(screen.getByText(/main career graph/i)).toBeInTheDocument();
    expect(screen.getByText(/targeting presets & templates/i)).toBeInTheDocument();
    expect(screen.getByText(/branch, tailor & verify/i)).toBeInTheDocument();

    // Readiness checklist heading and 100% progress
    expect(
      screen.getByRole("heading", { level: 3, name: /workspace readiness/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/4 of 4 milestones completed/i)).toBeInTheDocument();
    expect(screen.getByText(/100% ready for tailoring/i)).toBeInTheDocument();

    // Ensure forbidden term is never present
    expect(container.textContent).not.toMatch(/quick start/i);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("calculates partial readiness when profile data and branches are incomplete", () => {
    const incompleteProfile: components["schemas"]["MainProfileSnapshot"] = {
      profile: {
        id: "p1",
        user_id: "u1",
        full_name: "",
        headline: "",
        main_revision: 1,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      main_revision: 1,
      experiences: [],
      skills: [],
      projects: [],
      education: [],
      certifications: [],
      facts: [],
      exported_at: "2026-01-01T00:00:00Z",
    };

    render(
      <MemoryRouter>
        <WorkflowGuide
          {...defaultProps}
          profileSnapshot={incompleteProfile}
          branches={[]}
          presets={[]}
        />
      </MemoryRouter>
    );

    // Milestone completion should be 0 of 4
    expect(screen.getByText(/0 of 4 milestones completed/i)).toBeInTheDocument();
    expect(screen.getByText(/0% complete/i)).toBeInTheDocument();

    // Uncompleted milestones display action seams
    expect(screen.getByRole("link", { name: /complete profile/i })).toHaveAttribute(
      "href",
      "/profile"
    );
    expect(screen.getByRole("link", { name: /add experiences & skills/i })).toHaveAttribute(
      "href",
      "/profile"
    );
    expect(screen.getByRole("link", { name: /configure presets/i })).toHaveAttribute(
      "href",
      "/presets"
    );
    expect(screen.getByRole("button", { name: /^start branch$/i })).toBeInTheDocument();
  });

  it("triggers onCreateBranch callback when clicking action button in workflow pillar", async () => {
    const user = userEvent.setup();
    const onCreateBranchMock = vi.fn();

    render(
      <MemoryRouter>
        <WorkflowGuide {...defaultProps} onCreateBranch={onCreateBranchMock} />
      </MemoryRouter>
    );

    const createBranchAction = screen.getByRole("button", {
      name: /start new branch/i,
    });
    await user.click(createBranchAction);

    expect(onCreateBranchMock).toHaveBeenCalledTimes(1);
  });

  it("collapses and expands the guide, persisting user preference to localStorage", async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <MemoryRouter>
        <WorkflowGuide {...defaultProps} />
      </MemoryRouter>
    );

    // Initial state: expanded
    expect(screen.getByText(/main career graph/i)).toBeInTheDocument();
    const toggleButton = screen.getByRole("button", { name: /hide guide/i });
    expect(toggleButton).toHaveAttribute("aria-expanded", "true");

    // Click to collapse
    await user.click(toggleButton);

    expect(localStorage.getItem("resumeee_hide_workflow_guide")).toBe("true");
    expect(screen.queryByText(/main career graph/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show guide/i })).toHaveAttribute(
      "aria-expanded",
      "false"
    );

    // Rerender component to verify initial collapsed state from localStorage
    rerender(
      <MemoryRouter>
        <WorkflowGuide {...defaultProps} />
      </MemoryRouter>
    );

    expect(screen.queryByText(/main career graph/i)).not.toBeInTheDocument();
    const expandButton = screen.getByRole("button", { name: /show guide/i });

    // Click to expand again
    await user.click(expandButton);
    expect(localStorage.getItem("resumeee_hide_workflow_guide")).toBe("false");
    expect(screen.getByText(/main career graph/i)).toBeInTheDocument();
  });

  it("gracefully toggles state and renders when localStorage.setItem throws an error", async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    });

    render(
      <MemoryRouter>
        <WorkflowGuide {...defaultProps} />
      </MemoryRouter>
    );

    // Initial state: expanded
    expect(screen.getByText(/main career graph/i)).toBeInTheDocument();
    const toggleButton = screen.getByRole("button", { name: /hide guide/i });
    expect(toggleButton).toHaveAttribute("aria-expanded", "true");

    // Click to collapse should update UI without throwing
    await user.click(toggleButton);

    expect(screen.queryByText(/main career graph/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show guide/i })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("handles undefined array props with defensive defaults without throwing", () => {
    render(
      <MemoryRouter>
        <WorkflowGuide
          onCreateBranch={vi.fn()}
          branches={undefined}
          templates={undefined}
          presets={undefined}
        />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { level: 2, name: /how resumeee works/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/0 of 4 milestones completed/i)).toBeInTheDocument();
  });
});
