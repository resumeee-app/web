/**
 * @file home-page.test.tsx
 * @description Integration and unit tests for the reworked UI Dashboard (Home Page).
 * Validates live metrics, branch navigation, master profile overview,
 * quick action links, CreateBranchModal integration, empty/loading states,
 * error boundary aggregation, recent branches ordering/capping, and
 * WAI-ARIA accessibility compliance.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "vitest-axe";
import { HomePage } from "./home-page";
import { api } from "@/api/client";
import type { Branch, Preset, TemplateSet } from "@/api/branch-queries";
import type { components } from "@/api/schema";

describe("HomePage Dashboard Integration & Views", () => {
  let mockBranches: Branch[];
  let mockProfileSnapshot: components["schemas"]["MasterProfileSnapshot"];
  let mockPresets: Preset[];
  let mockTemplates: TemplateSet[];

  /**
   * Baseline initial branches collection for test scenarios.
   */
  const initialBranches: Branch[] = [
    {
      id: "branch-default-u1",
      user_id: "u1",
      name: "Master Profile (Default)",
      template_set_id: "tmpl-clean",
      is_default: true,
      active_version_id: "v1",
      status: "active",
      updated_at: "2026-11-01T12:00:00Z",
    },
    {
      id: "branch-tailored-2",
      user_id: "u1",
      name: "Netflix - Senior Platform Engineer",
      target_company: "Netflix",
      target_role: "Senior Platform Engineer",
      template_set_id: "tmpl-clean",
      preset_id: "preset-platform",
      is_default: false,
      active_version_id: "v2",
      status: "active",
      updated_at: "2026-11-02T15:30:00Z",
    },
  ];

  /**
   * Baseline initial master profile career graph snapshot for test scenarios.
   */
  const initialProfile: components["schemas"]["MasterProfileSnapshot"] = {
    profile: {
      id: "prof-1",
      user_id: "u1",
      full_name: "Alex Morgan",
      headline: "Staff Distributed Systems Engineer",
      email: "alex.morgan@example.com",
      default_provider: "gemini",
      default_model: "gemini-3.8-flash",
      master_revision: 5,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-11-01T00:00:00Z",
    },
    master_revision: 5,
    experiences: [
      {
        id: "exp-1",
        user_id: "u1",
        company: "Stripe",
        role_title: "Staff Infrastructure Engineer",
        is_current: true,
        start_date: "2022-01",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "exp-2",
        user_id: "u1",
        company: "AWS",
        role_title: "Senior Systems Engineer",
        is_current: false,
        start_date: "2019-03",
        end_date: "2021-12",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
    skills: [
      { id: "sk-1", user_id: "u1", name: "Go", category: "Languages", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
      { id: "sk-2", user_id: "u1", name: "Kubernetes", category: "Infrastructure", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
      { id: "sk-3", user_id: "u1", name: "Distributed Systems", category: "Architecture", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
    ],
    projects: [
      {
        id: "proj-1",
        user_id: "u1",
        name: "Global Envoy Gateway",
        summary: "Zero-downtime traffic steering mesh",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
    education: [
      {
        id: "edu-1",
        user_id: "u1",
        institution: "UC Berkeley",
        degree: "B.S.",
        field: "Computer Science",
        start_date: "2015-08",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
    certifications: [
      {
        id: "cert-1",
        user_id: "u1",
        name: "AWS Certified Solutions Architect",
        issuer: "Amazon Web Services",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
    facts: [],
    exported_at: "2026-11-01T12:00:00Z",
  };

  /**
   * Baseline initial presets catalog for test scenarios.
   */
  const initialPresets: Preset[] = [
    {
      id: "preset-platform",
      user_id: "system",
      name: "Platform Engineer",
      system_instructions: "Emphasize high throughput and distributed consensus",
      template_set_id: "tmpl-clean",
      is_built_in: true,
    },
  ];

  /**
   * Baseline initial templates catalog for test scenarios.
   */
  const initialTemplates: TemplateSet[] = [
    {
      id: "tmpl-clean",
      user_id: "system",
      name: "Modern Clean Template",
      html_template: "<div></div>",
      markdown_template: "# Res",
      text_template: "Res",
    },
    {
      id: "tmpl-exec",
      user_id: "system",
      name: "Executive Clean",
      html_template: "<div></div>",
      markdown_template: "# Exec",
      text_template: "Exec",
    },
  ];

  /**
   * Renders {@link HomePage} within isolated React Query and MemoryRouter providers.
   * Configures dummy routes (e.g. `/branches/:id`) to verify programmatic navigation.
   *
   * @param {string[]} [initialEntries=["/"]] MemoryRouter history entries.
   * @returns {object} Render result augmented with `queryClient`.
   */
  function renderHomePage(initialEntries: string[] = ["/"]) {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const renderResult = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/branches/:id"
              element={<div data-testid="branch-workbench-view">Branch Workbench</div>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    return { ...renderResult, queryClient };
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    mockBranches = [...initialBranches];
    mockProfileSnapshot = JSON.parse(JSON.stringify(initialProfile));
    mockPresets = [...initialPresets];
    mockTemplates = [...initialTemplates];

    vi.spyOn(api, "GET").mockImplementation((path: unknown) => {
      if (path === "/branches") {
        return Promise.resolve({
          data: [...mockBranches],
          error: undefined,
          response: new Response(),
        }) as unknown as never;
      }
      if (path === "/profile/full") {
        return Promise.resolve({
          data: mockProfileSnapshot,
          error: undefined,
          response: new Response(),
        }) as unknown as never;
      }
      if (path === "/presets") {
        return Promise.resolve({
          data: mockPresets,
          error: undefined,
          response: new Response(),
        }) as unknown as never;
      }
      if (path === "/templates") {
        return Promise.resolve({
          data: mockTemplates,
          error: undefined,
          response: new Response(),
        }) as unknown as never;
      }
      return Promise.reject(new Error(`Unhandled mock GET: ${path}`));
    });

    vi.spyOn(api, "POST").mockImplementation((path: unknown, init?: unknown) => {
      if (path === "/branches") {
        const body = (init as { body: unknown })?.body as Record<string, unknown>;
        const newBranch: Branch = {
          id: "branch-new-123",
          user_id: "u1",
          name: (body?.name as string) || "New Branch",
          target_role: body?.target_role as string,
          target_company: body?.target_company as string,
          template_set_id: (body?.template_set_id as string) || "tmpl-clean",
          preset_id: body?.preset_id as string,
          is_default: false,
          active_version_id: "v-new",
          status: "active",
          updated_at: new Date().toISOString(),
        };
        mockBranches.push(newBranch);
        return Promise.resolve({
          data: newBranch,
          error: undefined,
          response: new Response(),
        }) as unknown as never;
      }
      return Promise.reject(new Error(`Unhandled mock POST: ${path}`));
    });
  });

  it("renders page landmark heading matching Resume Management and passes accessibility audit", async () => {
    const { container } = renderHomePage();

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: /resume management/i,
    });
    expect(heading).toBeInTheDocument();

    // Await query settlement to avoid act(...) warnings during axe audit
    await screen.findByText(/Alex Morgan/i);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("displays live master profile metrics accurately with link to /profile", async () => {
    renderHomePage();

    // Verify Alex Morgan and headline
    expect(await screen.findByText(/Alex Morgan/i)).toBeInTheDocument();
    expect(screen.getByText(/Staff Distributed Systems Engineer/i)).toBeInTheDocument();

    // Verify metric counts: 2 experiences, 3 skills, 1 project, 1 education, 1 cert
    expect(screen.getByTestId("metric-experiences")).toHaveTextContent("2");
    expect(screen.getByTestId("metric-skills")).toHaveTextContent("3");
    expect(screen.getByTestId("metric-projects")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-education")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-certifications")).toHaveTextContent("1");

    // Verify specific master profile links
    const profileEditLink = screen.getByRole("link", { name: /^edit profile$/i });
    expect(profileEditLink).toHaveAttribute("href", "/profile");

    const headerProfileLink = screen.getByRole("link", { name: /^master profile$/i });
    expect(headerProfileLink).toHaveAttribute("href", "/profile");
  });

  it("renders recent branches with real links to workbench and preview", async () => {
    renderHomePage();

    // Check branch names rendered
    expect(await screen.findByText("Master Profile (Default)")).toBeInTheDocument();
    expect(screen.getByText("Netflix - Senior Platform Engineer")).toBeInTheDocument();

    // Verify workbench link
    const workbenchLink = screen.getByRole("link", {
      name: /open workbench for netflix - senior platform engineer/i,
    });
    expect(workbenchLink).toHaveAttribute("href", "/branches/branch-tailored-2");

    // Verify preview link
    const previewLink = screen.getByRole("link", {
      name: /preview resume for netflix - senior platform engineer/i,
    });
    expect(previewLink).toHaveAttribute("href", "/branches/branch-tailored-2/preview");

    // Verify "View All Branches" links (stat card and section header)
    const allBranchesLinks = screen.getAllByRole("link", { name: /view all branches/i });
    expect(allBranchesLinks).toHaveLength(2);
    expect(allBranchesLinks[0]).toHaveAttribute("href", "/branches");
    expect(allBranchesLinks[1]).toHaveAttribute("href", "/branches");

    // Verify active version status on recent branch cards
    expect(screen.getByText("Untailored")).toBeInTheDocument();
    expect(screen.getByText("v2 (Active)")).toBeInTheDocument();

    // Verify RFC-005 Tailoring Strategy terminology
    expect(screen.getByText("Strategy:")).toBeInTheDocument();
    expect(screen.queryByText("Preset:")).not.toBeInTheDocument();
  });

  it("renders live stats for total branches, templates, and presets", async () => {
    renderHomePage();

    expect(await screen.findByTestId("metric-total-branches")).toHaveTextContent("2");
    expect(screen.getByTestId("metric-total-templates")).toHaveTextContent("2");
    expect(screen.getByTestId("metric-total-presets")).toHaveTextContent("1");

    // Verify stat card links for Templates and Presets
    const browseTemplatesLink = screen.getByRole("link", { name: /^browse templates$/i });
    expect(browseTemplatesLink).toHaveAttribute("href", "/templates");

    const managePresetsLink = screen.getByRole("link", { name: /^manage presets$/i });
    expect(managePresetsLink).toHaveAttribute("href", "/presets");
  });

  it("removes redundant Application Capabilities card grid to streamline dashboard focus", async () => {
    renderHomePage();

    await screen.findByRole("heading", { level: 1, name: /resume management/i });

    // Application Capabilities section must be completely eliminated
    expect(
      screen.queryByRole("heading", { name: /application capabilities/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /ats templates.*go to templates/i })
    ).not.toBeInTheDocument();
  });

  it("verifies every interactive link on the dashboard points to a valid route", async () => {
    renderHomePage();

    await screen.findByRole("heading", { level: 1, name: /resume management/i });

    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);

    const validRoutePrefixes = ["/profile", "/branches", "/templates", "/presets"];

    for (const link of links) {
      const href = link.getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).not.toBe("#");
      expect(href).not.toBe("");
      const isValid = validRoutePrefixes.some((prefix) => href?.startsWith(prefix));
      expect(isValid).toBe(true);
    }
  });

  it("opens CreateBranchModal, submits valid payload, and routes to workbench", async () => {
    const user = userEvent.setup();
    renderHomePage();

    const createBtn = await screen.findByRole("button", {
      name: /create branch/i,
    });
    await user.click(createBtn);

    // Modal should be open with 720px responsive sizing
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveClass("sm:max-w-[720px]");
    expect(dialog).toHaveClass("w-full");
    expect(dialog).toHaveClass("max-h-[90vh]");
    expect(dialog).toHaveClass("overflow-y-auto");
    expect(dialog).not.toHaveClass("max-w-md");
    expect(dialog).not.toHaveClass("sm:max-w-[500px]");
    expect(
      screen.getByRole("heading", { level: 2, name: /create new resume branch/i })
    ).toBeInTheDocument();

    // Fill in branch name
    const nameInput = screen.getByLabelText(/branch name/i);
    await user.type(nameInput, "Google - Site Reliability Engineer");

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /^create branch$/i });
    await user.click(submitBtn);

    // Modal closes
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Verifies exact POST payload was submitted
    expect(api.POST).toHaveBeenCalledWith(
      "/branches",
      expect.objectContaining({
        body: expect.objectContaining({
          name: "Google - Site Reliability Engineer",
        }),
      })
    );

    // Verifies router navigates to /branches/:id workbench view
    expect(await screen.findByTestId("branch-workbench-view")).toBeInTheDocument();
  });

  it("displays accessible empty state when there are no branches and opens modal from CTA", async () => {
    mockBranches = [];
    const user = userEvent.setup();
    renderHomePage();

    expect(await screen.findByText(/no resume branches yet/i)).toBeInTheDocument();
    const emptyStateBtn = screen.getByRole("button", { name: /create your first branch/i });
    expect(emptyStateBtn).toBeInTheDocument();

    // Click empty state CTA button and verify modal opens
    await user.click(emptyStateBtn);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /create new resume branch/i })
    ).toBeInTheDocument();
  });

  it("displays accessible loading indicators with specific aria-labels while queries are pending", () => {
    vi.spyOn(api, "GET").mockReturnValue(new Promise(() => {}));
    renderHomePage();

    expect(screen.getByRole("status", { name: /loading master profile details/i })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: /loading branch counts/i })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: /loading template counts/i })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: /loading preset counts/i })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: /loading resume branches/i })).toBeInTheDocument();
  });

  it("displays aggregated error banner when queries fail", async () => {
    vi.spyOn(api, "GET").mockImplementation((path: unknown) => {
      if (path === "/branches") {
        return Promise.resolve({
          data: undefined,
          error: { message: "Network connection refused" },
          response: new Response(null, { status: 500 }),
        }) as unknown as never;
      }
      if (path === "/profile/full") {
        return Promise.resolve({
          data: undefined,
          error: { error: { message: "Profile database timeout" } },
          response: new Response(null, { status: 500 }),
        }) as unknown as never;
      }
      if (path === "/templates") {
        return Promise.resolve({
          data: undefined,
          error: { message: "Templates DB unreachable" },
          response: new Response(null, { status: 500 }),
        }) as unknown as never;
      }
      if (path === "/presets") {
        return Promise.resolve({
          data: undefined,
          error: { message: "Presets service unavailable" },
          response: new Response(null, { status: 503 }),
        }) as unknown as never;
      }
      return Promise.resolve({
        data: [],
        error: undefined,
        response: new Response(),
      }) as unknown as never;
    });

    renderHomePage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Branches: Network connection refused/i);
    expect(alert).toHaveTextContent(/Master Profile: Profile database timeout/i);
    expect(alert).toHaveTextContent(/Templates: Templates DB unreachable/i);
    expect(alert).toHaveTextContent(/Presets: Presets service unavailable/i);
  });

  it("sorts recent branches in descending updated_at order and caps display to 4 items", async () => {
    mockBranches = [
      {
        id: "br-1-oldest",
        user_id: "u1",
        name: "Branch 1 - Oldest",
        template_set_id: "tmpl-clean",
        updated_at: "2026-11-01T10:00:00Z",
      },
      {
        id: "br-2",
        user_id: "u1",
        name: "Branch 2",
        template_set_id: "tmpl-clean",
        updated_at: "2026-11-02T10:00:00Z",
      },
      {
        id: "br-3",
        user_id: "u1",
        name: "Branch 3",
        template_set_id: "tmpl-clean",
        updated_at: "2026-11-03T10:00:00Z",
      },
      {
        id: "br-4",
        user_id: "u1",
        name: "Branch 4",
        template_set_id: "tmpl-clean",
        updated_at: "2026-11-04T10:00:00Z",
      },
      {
        id: "br-5-newest",
        user_id: "u1",
        name: "Branch 5 - Newest",
        template_set_id: "tmpl-clean",
        updated_at: "2026-11-05T10:00:00Z",
      },
    ];

    renderHomePage();

    const branchList = await screen.findByTestId("recent-branches-list");
    const branchArticles = within(branchList).getAllByRole("article");
    expect(branchArticles).toHaveLength(4);

    // Verify descending order
    expect(branchArticles[0]).toHaveTextContent("Branch 5 - Newest");
    expect(branchArticles[1]).toHaveTextContent("Branch 4");
    expect(branchArticles[2]).toHaveTextContent("Branch 3");
    expect(branchArticles[3]).toHaveTextContent("Branch 2");

    // Verify 5th (oldest) branch is omitted
    expect(within(branchList).queryByText("Branch 1 - Oldest")).not.toBeInTheDocument();
  });

  it("renders branches gracefully when updated_at is missing and handles untargeted branch", async () => {
    mockBranches = [
      {
        id: "branch-no-date",
        user_id: "u1",
        name: "General Untargeted Branch",
        template_set_id: "tmpl-unknown",
        is_default: false,
        status: "active",
      },
    ];

    renderHomePage();

    expect(await screen.findByText("General Untargeted Branch")).toBeInTheDocument();
    expect(screen.getByText("Untargeted role")).toBeInTheDocument();
    expect(screen.getByText("Not tailored yet")).toBeInTheDocument();
  });

  it("renders Out of Sync badge rather than pulsing Tailoring badge for stale branches", async () => {
    mockBranches = [
      {
        id: "branch-stale-1",
        user_id: "u1",
        name: "Stale Resume Line",
        template_set_id: "tmpl-clean",
        is_default: false,
        active_version_id: "v1",
        is_stale: true,
        status: "active",
      },
    ];

    renderHomePage();

    expect(await screen.findByText("Stale Resume Line")).toBeInTheDocument();
    // Out of Sync badge rendered
    expect(screen.getByText("Out of Sync")).toBeInTheDocument();
    // Must NOT display animated Tailoring badge
    expect(screen.queryByText("Tailoring")).not.toBeInTheDocument();
  });

  it("renders the workflow orientation guide and interactive readiness milestones", async () => {
    const { container } = renderHomePage();

    // Verify section heading and 3 workflow pillars
    expect(
      await screen.findByRole("heading", { level: 2, name: /how resumeee works/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/master career graph/i)).toBeInTheDocument();
    expect(screen.getByText(/targeting presets & templates/i)).toBeInTheDocument();
    expect(screen.getByText(/branch, tailor & verify/i)).toBeInTheDocument();

    // Verify workspace readiness tracker based on initial data
    // (Alex Morgan has 2 exp, 3 skills, 2 branches (1 tailored), templates, presets -> 4/4 ready)
    expect(await screen.findByText(/4 of 4 milestones completed/i)).toBeInTheDocument();
    expect(screen.getByText(/100% ready for tailoring/i)).toBeInTheDocument();

    // Verify forbidden marketing phrase is absent
    expect(container.textContent).not.toMatch(/quick start/i);
  });

  it("opens CreateBranchModal when clicking Start New Branch action in workflow guide", async () => {
    const user = userEvent.setup();
    renderHomePage();

    await screen.findByRole("heading", { level: 2, name: /how resumeee works/i });

    const startBranchBtn = screen.getByRole("button", { name: /start new branch/i });
    await user.click(startBranchBtn);

    // Dialog opens
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /create new resume branch/i })
    ).toBeInTheDocument();
  });

  it("supports collapsing and expanding the workflow guide on the dashboard", async () => {
    const user = userEvent.setup();
    localStorage.clear();

    renderHomePage();

    await screen.findByRole("heading", { level: 2, name: /how resumeee works/i });
    expect(screen.getByText(/master career graph/i)).toBeInTheDocument();

    const hideGuideBtn = screen.getByRole("button", { name: /hide guide/i });
    await user.click(hideGuideBtn);

    // Collapsed state
    expect(localStorage.getItem("resumeee_hide_workflow_guide")).toBe("true");
    expect(screen.queryByText(/master career graph/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show guide/i })).toBeInTheDocument();

    // Reopen
    const showGuideBtn = screen.getByRole("button", { name: /show guide/i });
    await user.click(showGuideBtn);
    expect(localStorage.getItem("resumeee_hide_workflow_guide")).toBe("false");
    expect(screen.getByText(/master career graph/i)).toBeInTheDocument();
  });
});
