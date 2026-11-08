import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "vitest-axe";
import { ResumesPage } from "./resumes-page";
import { api } from "@/api/client";
import type { Branch, Preset, TemplateSet } from "@/api/branch-queries";

describe("RFC-005 ResumesPage & 3-Step Creation Wizard", () => {
  let mockBranches: Branch[];

  const initialBranches: Branch[] = [
    {
      id: "branch-default-u1",
      user_id: "u1",
      name: "Main Profile (Default)",
      template_set_id: "builtin-standard-clean",
      is_default: true,
      active_version_id: "v1",
      status: "active",
      updated_at: "2026-11-01T12:00:00Z",
    },
  ];

  const mockStrategies: Preset[] = [
    {
      id: "builtin-swe-1page",
      user_id: "system",
      name: "1-Page SWE High Density",
      system_instructions: "Concise, metrics-first bullets focusing on distributed systems.",
      template_set_id: "builtin-standard-clean",
      suggested_theme_id: "builtin-standard-clean",
      is_built_in: true,
    },
    {
      id: "builtin-academic-cv",
      user_id: "system",
      name: "Academic Researcher Full CV",
      system_instructions: "Comprehensive publication history and research grants.",
      template_set_id: "builtin-classic-serif",
      suggested_theme_id: "builtin-classic-serif",
      is_built_in: true,
    },
  ];

  const mockThemes: TemplateSet[] = [
    {
      id: "builtin-standard-clean",
      user_id: "system",
      name: "Standard Clean ATS",
      description: "Contemporary sans-serif formatting optimized for high-volume corporate ATS parsers.",
      is_built_in: true,
      html_template: "<div>{{ .Name }}</div>",
      markdown_template: "# {{ .Name }}",
      text_template: "{{ .Name }}",
    },
    {
      id: "builtin-classic-serif",
      user_id: "system",
      name: "Classic Serif Formal",
      description: "Traditional serif styling suited for legal, academic, and executive applications.",
      is_built_in: true,
      html_template: "<div>{{ .Name }}</div>",
      markdown_template: "# {{ .Name }}",
      text_template: "{{ .Name }}",
    },
  ];

  let postBranchSpy: ReturnType<typeof vi.fn>;

  function renderResumesPage() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const renderResult = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/resumes"]}>
          <ResumesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    return { ...renderResult, queryClient };
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    mockBranches = [...initialBranches];

    vi.spyOn(api, "GET").mockImplementation((path: unknown) => {
      if (path === "/branches" || path === "/resumes") {
        return Promise.resolve({
          data: [...mockBranches],
          error: undefined,
          response: new Response(),
        }) as unknown as never;
      }
      if (path === "/presets" || path === "/tailoring-strategies") {
        return Promise.resolve({
          data: mockStrategies,
          error: undefined,
          response: new Response(),
        }) as unknown as never;
      }
      if (path === "/templates") {
        return Promise.resolve({
          data: mockThemes,
          error: undefined,
          response: new Response(),
        }) as unknown as never;
      }
      return Promise.resolve({
        data: null,
        error: undefined,
        response: new Response(),
      }) as unknown as never;
    });

    postBranchSpy = vi.fn().mockImplementation((_path: unknown, options: { body: unknown }) => {
      const created = {
        id: "branch-new-123",
        user_id: "u1",
        ...(options.body as Record<string, unknown>),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return Promise.resolve({
        data: created,
        error: undefined,
        response: new Response(),
      }) as unknown as never;
    });

    vi.spyOn(api, "POST").mockImplementation(postBranchSpy as never);
  });

  it("satisfies WCAG 2.1 AA with zero accessibility violations on dashboard and open wizard", async () => {
    const user = userEvent.setup();
    const { container } = renderResumesPage();

    await waitFor(() => {
      expect(screen.getByText("Main Profile (Default)")).toBeInTheDocument();
    });

    // Check dashboard accessibility
    const dashboardResults = await axe(container);
    expect(dashboardResults).toHaveNoViolations();

    // Open creation modal
    const openBtn = screen.getByRole("button", { name: /create new branch/i });
    await user.click(openBtn);

    expect(
      screen.getByRole("dialog", { name: /create new resume branch/i })
    ).toBeInTheDocument();

    // Check modal accessibility in Step 1
    const modalStep1Results = await axe(container);
    expect(modalStep1Results).toHaveNoViolations();
  });

  it("executes 3-step creation wizard: suggests theme in Step 3 without clobbering manual selection, submitting independent strategy and theme IDs", async () => {
    const user = userEvent.setup();
    renderResumesPage();

    await waitFor(() => {
      expect(screen.getByText("Main Profile (Default)")).toBeInTheDocument();
    });

    // Open wizard dialog
    const createBtn = screen.getByRole("button", { name: /create new branch/i });
    await user.click(createBtn);

    // --- STEP 1: The Opportunity ---
    const nameInput = screen.getByLabelText(/branch name \*/i);
    const companyInput = screen.getByLabelText(/target company/i);
    const roleInput = screen.getByLabelText(/target role/i);
    const reqsInput = screen.getByLabelText(/target requirements/i);

    await user.type(nameInput, "Stripe - Staff Backend Engineer");
    await user.type(companyInput, "Stripe");
    await user.type(roleInput, "Staff Backend Engineer");
    await user.type(reqsInput, "Distributed systems, Raft consensus, Go microservices.");

    // Advance to Step 2
    const nextBtn = screen.getByRole("button", { name: /next: ai tailoring/i });
    await user.click(nextBtn);

    expect(screen.getByText(/step 2: ai tailoring strategy/i)).toBeInTheDocument();

    // --- STEP 2: AI Tailoring Strategy ---
    // Select Academic CV (which suggests builtin-classic-serif)
    const academicStrategyCard = screen.getByLabelText(/academic researcher full cv/i);
    await user.click(academicStrategyCard);

    // Advance to Step 3
    const nextToDesignBtn = screen.getByRole("button", { name: /next: visual design/i });
    await user.click(nextToDesignBtn);

    expect(screen.getByText(/step 3: visual layout & design/i)).toBeInTheDocument();

    // Verify template was auto-suggested to builtin-classic-serif
    const templateSelect = screen.getByLabelText(/template set \*/i) as HTMLSelectElement;
    expect(templateSelect.value).toBe("builtin-classic-serif");

    // --- STEP 3: Visual Theme Selection (Manual Choice) ---
    // User manually chooses Standard Clean ATS
    const standardCleanCard = screen.getByLabelText(/standard clean ats/i);
    await user.click(standardCleanCard);
    expect(templateSelect.value).toBe("builtin-standard-clean");

    // Navigate back to Step 2 to change strategy
    const backBtn = screen.getByRole("button", { name: /back/i });
    await user.click(backBtn);
    expect(screen.getByText(/step 2: ai tailoring strategy/i)).toBeInTheDocument();

    // Select 1-Page SWE High Density (which suggests builtin-standard-clean)
    const sweStrategyCard = screen.getByLabelText(/1-page swe high density/i);
    await user.click(sweStrategyCard);

    // Return to Step 3
    await user.click(screen.getByRole("button", { name: /next: visual design/i }));

    // User's manual selection was NOT clobbered
    expect(templateSelect.value).toBe("builtin-standard-clean");

    // Submit the form
    const submitBtn = screen.getByRole("button", { name: /create branch/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(postBranchSpy).toHaveBeenCalledTimes(1);
    });

    const callBody = postBranchSpy.mock.calls[0]?.[1]?.body;
    expect(callBody).toMatchObject({
      name: "Stripe - Staff Backend Engineer",
      target_company: "Stripe",
      target_role: "Staff Backend Engineer",
      target_requirements: "Distributed systems, Raft consensus, Go microservices.",
      tailoring_strategy_id: "builtin-swe-1page",
      template_set_id: "builtin-standard-clean",
    });
  });
});
