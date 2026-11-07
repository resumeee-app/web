import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "vitest-axe";
import { BranchWorkbenchPage } from "./branch-workbench-page";
import { api } from "@/api/client";
import type { Branch, BranchVersion, Preset, TemplateSet } from "@/api/workbench-queries";

function createTestWrapper(initialPath = "/branches/b-123") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/branches/:id" element={children} />
          <Route
            path="/branches/:id/preview"
            element={<div data-testid="preview-page">Preview Page</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

  return { queryClient, Wrapper };
}

const mockBranch: Branch = {
  id: "b-123",
  user_id: "u-1",
  name: "Senior Distributed Systems Engineer",
  target_role: "Staff Infrastructure Engineer",
  target_company: "Stripe",
  template_set_id: "tpl-default",
  preset_id: "preset-ats",
  target_requirements: "Expertise in Go, Paxos/Raft consensus",
  branch_instructions: "Highlight open-source distributed DB contributions",
  is_stale: false,
  active_version_id: "v-1",
};

const mockPresets: Preset[] = [
  {
    id: "preset-ats",
    user_id: "u-1",
    name: "ATS Standard",
    system_instructions: "Focus on keywords",
    template_set_id: "tpl-default",
  },
  {
    id: "preset-custom",
    user_id: "u-1",
    name: "Executive Tone",
    system_instructions: "Focus on leadership",
    template_set_id: "tpl-default",
  },
];

const mockTemplates: TemplateSet[] = [
  {
    id: "tpl-default",
    user_id: "u-1",
    name: "Standard ATS Layout",
    description: "High compliance layout",
    html_template: "<div></div>",
    markdown_template: "# Resume",
    text_template: "Resume",
  },
  {
    id: "tpl-executive",
    user_id: "u-1",
    name: "Modern Executive",
    description: "Single column minimalist layout",
    html_template: "<div></div>",
    markdown_template: "# Resume",
    text_template: "Resume",
  },
];

const mockVersions: BranchVersion[] = [
  {
    id: "v-1",
    branch_id: "b-123",
    version_number: 1,
    status: "completed",
    model_used: "claude-3-7-sonnet",
    created_at: "2026-11-01T12:00:00Z",
    gap_report: {
      match_score: 92.0,
      identified_gaps: [
        {
          requirement: "Raft consensus protocol",
          missing_area: "Distributed Algorithms",
          importance: "critical",
        },
      ],
      strategic_recommendations: ["Emphasize distributed consensus work."],
    },
  },
  {
    id: "v-2",
    branch_id: "b-123",
    version_number: 2,
    status: "completed",
    model_used: "gemini-1.5-pro",
    created_at: "2026-11-01T13:00:00Z",
    gap_report: {
      match_score: 96.5,
      identified_gaps: [],
      strategic_recommendations: ["Solid match for Staff role."],
    },
  },
];

describe("BranchWorkbenchPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders workbench page with branch metadata, action bar, timeline, and gap analysis", async () => {
    vi.spyOn(api, "GET").mockImplementation((path: string) => {
      if (path === "/branches/{id}") {
        return Promise.resolve({ data: mockBranch, error: undefined }) as never;
      }
      if (path === "/branches/{id}/versions") {
        return Promise.resolve({
          data: mockVersions,
          error: undefined,
        }) as never;
      }
      if (path === "/presets") {
        return Promise.resolve({ data: mockPresets, error: undefined }) as never;
      }
      if (path === "/templates") {
        return Promise.resolve({ data: mockTemplates, error: undefined }) as never;
      }
      return Promise.resolve({ data: undefined, error: undefined }) as never;
    });

    const { Wrapper } = createTestWrapper();
    render(<BranchWorkbenchPage pollIntervalMs={30} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Senior Distributed Systems Engineer",
        })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /tailor resume/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Version v1")).toBeInTheDocument();
    expect(screen.getByText("Version v2")).toBeInTheDocument();
    expect(screen.getByText("92.0%")).toBeInTheDocument();
  });

  it("handles tailoring mutation, polling transitions, and completion notifications", async () => {
    const user = userEvent.setup();

    let pollCount = 0;
    vi.spyOn(api, "GET").mockImplementation(
      (path: string, options?: { params?: { path?: { v?: string } } }) => {
        if (path === "/branches/{id}") {
          return Promise.resolve({
            data: mockBranch,
            error: undefined,
          }) as never;
        }
        if (path === "/branches/{id}/versions") {
          return Promise.resolve({
            data: mockVersions,
            error: undefined,
          }) as never;
        }
        if (path === "/presets") {
          return Promise.resolve({ data: mockPresets, error: undefined }) as never;
        }
        if (path === "/templates") {
          return Promise.resolve({ data: mockTemplates, error: undefined }) as never;
        }
        if (path === "/branches/{id}/versions/{v}") {
          const v = options?.params?.path?.v;
          if (v === "v-new") {
            pollCount++;
            if (pollCount === 1) {
              return Promise.resolve({
                data: {
                  id: "v-new",
                  branch_id: "b-123",
                  version_number: 3,
                  status: "pending",
                  created_at: new Date().toISOString(),
                },
                error: undefined,
              }) as never;
            }
            if (pollCount === 2) {
              return Promise.resolve({
                data: {
                  id: "v-new",
                  branch_id: "b-123",
                  version_number: 3,
                  status: "processing",
                  created_at: new Date().toISOString(),
                },
                error: undefined,
              }) as never;
            }
            return Promise.resolve({
              data: {
                id: "v-new",
                branch_id: "b-123",
                version_number: 3,
                status: "completed",
                model_used: "gemini-1.5-pro",
                created_at: new Date().toISOString(),
                gap_report: {
                  match_score: 98.0,
                  identified_gaps: [],
                  strategic_recommendations: ["Flawless match."],
                },
              },
              error: undefined,
            }) as never;
          }
        }
        return Promise.resolve({ data: [], error: undefined }) as never;
      }
    );

    vi.spyOn(api, "POST").mockImplementation((path: string) => {
      if (path === "/branches/{id}/generate") {
        return Promise.resolve({
          data: {
            version_id: "v-new",
            status: "pending",
            message: "Resume tailoring enqueued",
          },
          error: undefined,
        }) as never;
      }
      return Promise.resolve({ data: undefined, error: undefined }) as never;
    });

    const { Wrapper } = createTestWrapper();
    render(<BranchWorkbenchPage pollIntervalMs={30} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /tailor resume/i })
      ).toBeInTheDocument();
    });

    const tailorBtn = screen.getByRole("button", { name: /tailor resume/i });
    await user.click(tailorBtn);

    expect(api.POST).toHaveBeenCalledWith("/branches/{id}/generate", {
      params: { path: { id: "b-123" } },
    });

    // Verification of terminal polling state resolution and toast appearance
    await waitFor(() => {
      expect(screen.getByText("Tailoring Completed")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Resume version v3 was successfully generated.")
    ).toBeInTheDocument();
  });

  it("promotes version to active via handleSetActiveVersion", async () => {
    const user = userEvent.setup();

    vi.spyOn(api, "GET").mockImplementation((path: string) => {
      if (path === "/branches/{id}") {
        return Promise.resolve({ data: mockBranch, error: undefined }) as never;
      }
      if (path === "/branches/{id}/versions") {
        return Promise.resolve({
          data: mockVersions,
          error: undefined,
        }) as never;
      }
      if (path === "/presets") {
        return Promise.resolve({ data: mockPresets, error: undefined }) as never;
      }
      if (path === "/templates") {
        return Promise.resolve({ data: mockTemplates, error: undefined }) as never;
      }
      return Promise.resolve({ data: undefined, error: undefined }) as never;
    });

    vi.spyOn(api, "PUT").mockResolvedValue({
      data: { ...mockBranch, active_version_id: "v-2" },
      error: undefined,
      response: new Response(),
    } as never);

    const { Wrapper } = createTestWrapper();
    render(<BranchWorkbenchPage pollIntervalMs={30} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /set v2 as active/i })
      ).toBeInTheDocument();
    });

    const setActiveBtn = screen.getByRole("button", {
      name: /set v2 as active/i,
    });
    await user.click(setActiveBtn);

    expect(api.PUT).toHaveBeenCalledWith("/branches/{id}", {
      params: { path: { id: "b-123" } },
      body: { active_version_id: "v-2" },
    });

    await waitFor(() => {
      expect(screen.getByText("Active Version Updated")).toBeInTheDocument();
    });
  });

  it("enqueues master profile synchronization via handleSyncMaster", async () => {
    const user = userEvent.setup();

    vi.spyOn(api, "GET").mockImplementation((path: string) => {
      if (path === "/branches/{id}") {
        return Promise.resolve({
          data: { ...mockBranch, is_stale: true },
          error: undefined,
        }) as never;
      }
      if (path === "/branches/{id}/versions") {
        return Promise.resolve({
          data: mockVersions,
          error: undefined,
        }) as never;
      }
      if (path === "/presets") {
        return Promise.resolve({ data: mockPresets, error: undefined }) as never;
      }
      if (path === "/templates") {
        return Promise.resolve({ data: mockTemplates, error: undefined }) as never;
      }
      return Promise.resolve({ data: undefined, error: undefined }) as never;
    });

    vi.spyOn(api, "POST").mockResolvedValue({
      data: { enqueued_count: 1, version_ids: ["v-sync"] },
      error: undefined,
      response: new Response(),
    } as never);

    const { Wrapper } = createTestWrapper();
    render(<BranchWorkbenchPage pollIntervalMs={30} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /sync with master profile/i })
      ).toBeInTheDocument();
    });

    const syncBtn = screen.getByRole("button", {
      name: /sync with master profile/i,
    });
    await user.click(syncBtn);

    expect(api.POST).toHaveBeenCalledWith("/branches/sync", {
      body: { branch_ids: ["b-123"] },
    });

    await waitFor(() => {
      expect(screen.getByText("Master Profile Synced")).toBeInTheDocument();
    });
    expect(screen.getByText("Enqueued 1 branch sync jobs.")).toBeInTheDocument();
  });

  it("updates target preset and template sets via interactive selectors", async () => {
    const user = userEvent.setup();

    vi.spyOn(api, "GET").mockImplementation((path: string) => {
      if (path === "/branches/{id}") {
        return Promise.resolve({ data: mockBranch, error: undefined }) as never;
      }
      if (path === "/branches/{id}/versions") {
        return Promise.resolve({
          data: mockVersions,
          error: undefined,
        }) as never;
      }
      if (path === "/presets") {
        return Promise.resolve({ data: mockPresets, error: undefined }) as never;
      }
      if (path === "/templates") {
        return Promise.resolve({ data: mockTemplates, error: undefined }) as never;
      }
      return Promise.resolve({ data: undefined, error: undefined }) as never;
    });

    vi.spyOn(api, "PUT").mockResolvedValue({
      data: mockBranch,
      error: undefined,
      response: new Response(),
    } as never);

    const { Wrapper } = createTestWrapper();
    render(<BranchWorkbenchPage pollIntervalMs={30} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: /tailoring strategy/i })
      ).toBeInTheDocument();
    });

    const presetSelect = screen.getByRole("combobox", {
      name: /tailoring strategy/i,
    });
    await user.selectOptions(presetSelect, "preset-custom");

    expect(api.PUT).toHaveBeenCalledWith("/branches/{id}", {
      params: { path: { id: "b-123" } },
      body: { preset_id: "preset-custom" },
    });

    await waitFor(() => {
      expect(screen.getByText("Tailoring Strategy Updated")).toBeInTheDocument();
    });

    const templateSelect = screen.getByRole("combobox", {
      name: /resume template/i,
    });
    await user.selectOptions(templateSelect, "tpl-executive");

    expect(api.PUT).toHaveBeenCalledWith("/branches/{id}", {
      params: { path: { id: "b-123" } },
      body: { template_set_id: "tpl-executive" },
    });

    await waitFor(() => {
      expect(screen.getByText("Template Updated")).toBeInTheDocument();
    });
  });

  it("allows modifying and saving job description & context", async () => {
    const user = userEvent.setup();

    vi.spyOn(api, "GET").mockImplementation((path: string) => {
      if (path === "/branches/{id}") {
        return Promise.resolve({ data: mockBranch, error: undefined }) as never;
      }
      if (path === "/branches/{id}/versions") {
        return Promise.resolve({
          data: mockVersions,
          error: undefined,
        }) as never;
      }
      if (path === "/presets") {
        return Promise.resolve({ data: mockPresets, error: undefined }) as never;
      }
      if (path === "/templates") {
        return Promise.resolve({ data: mockTemplates, error: undefined }) as never;
      }
      return Promise.resolve({ data: undefined, error: undefined }) as never;
    });

    vi.spyOn(api, "PUT").mockResolvedValue({
      data: mockBranch,
      error: undefined,
      response: new Response(),
    } as never);

    const { Wrapper } = createTestWrapper();
    render(<BranchWorkbenchPage pollIntervalMs={30} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /edit job description & context/i,
        })
      ).toBeInTheDocument();
    });

    const toggleEditorBtn = screen.getByRole("button", {
      name: /edit job description & context/i,
    });
    await user.click(toggleEditorBtn);

    const jdInput = screen.getByLabelText(
      /job description & target requirements/i
    );
    await user.clear(jdInput);
    await user.type(jdInput, "Updated requirements for L7 role");

    const saveBtn = screen.getByRole("button", { name: /save context/i });
    await user.click(saveBtn);

    expect(api.PUT).toHaveBeenCalledWith("/branches/{id}", {
      params: { path: { id: "b-123" } },
      body: {
        target_requirements: "Updated requirements for L7 role",
        branch_instructions:
          "Highlight open-source distributed DB contributions",
      },
    });

    await waitFor(() => {
      expect(screen.getByText("Context Saved")).toBeInTheDocument();
    });
  });

  it("renders collapsible prompt preview and fetches prompt draft upon expanding", async () => {
    const user = userEvent.setup();
    const { Wrapper } = createTestWrapper();

    vi.spyOn(api, "GET").mockImplementation((path: string) => {
      if (path === "/branches/{id}") {
        return Promise.resolve({ data: mockBranch, error: undefined }) as never;
      }
      if (path === "/branches/{id}/versions") {
        return Promise.resolve({ data: mockVersions, error: undefined }) as never;
      }
      if (path === "/presets") {
        return Promise.resolve({ data: mockPresets, error: undefined }) as never;
      }
      if (path === "/templates") {
        return Promise.resolve({ data: mockTemplates, error: undefined }) as never;
      }
      if (path === "/branches/{id}/prompt-preview") {
        return Promise.resolve({
          data: {
            system_prompt: "You are Resumeee AI. Anti-Hallucination rules.",
            user_prompt: "Target Role: Staff Infrastructure Engineer",
          },
          error: undefined,
        }) as never;
      }
      return Promise.resolve({ data: [], error: undefined }) as never;
    });

    vi.spyOn(api, "POST").mockImplementation((path: string) => {
      if (path === "/branches/{id}/prompt-preview") {
        return Promise.resolve({
          data: {
            system_prompt: "You are Resumeee AI. Anti-Hallucination rules.",
            user_prompt: "Target Role: Staff Infrastructure Engineer",
          },
          error: undefined,
        }) as never;
      }
      return Promise.resolve({ data: {}, error: undefined }) as never;
    });

    render(<BranchWorkbenchPage pollIntervalMs={30} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Senior Distributed Systems Engineer" })
      ).toBeInTheDocument();
    });

    const inspectBtn = screen.getByRole("button", {
      name: /inspect llm prompt/i,
    });
    expect(inspectBtn).toBeInTheDocument();
    expect(inspectBtn).toHaveAttribute("aria-expanded", "false");

    await user.click(inspectBtn);

    expect(inspectBtn).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => {
      expect(screen.getByText(/anti-hallucination rules/i)).toBeInTheDocument();
      expect(screen.getByText(/target role: staff infrastructure engineer/i)).toBeInTheDocument();
    });
  });

  it("renders 404 branch not found boundary with return link when branch loading fails", async () => {
    vi.spyOn(api, "GET").mockImplementation((path: string) => {
      if (path === "/branches/{id}") {
        return Promise.resolve({
          data: undefined,
          error: { error: { message: "Branch not found" } },
        }) as never;
      }
      return Promise.resolve({ data: [], error: undefined }) as never;
    });

    const { Wrapper } = createTestWrapper();
    render(<BranchWorkbenchPage pollIntervalMs={30} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Branch Not Found" })
      ).toBeInTheDocument();
    });

    const backLink = screen.getByRole("link", { name: /back to branches/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/branches");
  });

  it("renders breadcrumb navigation linking back to branches catalog", async () => {
    vi.spyOn(api, "GET").mockImplementation((path: string) => {
      if (path === "/branches/{id}") {
        return Promise.resolve({ data: mockBranch, error: undefined }) as never;
      }
      if (path === "/branches/{id}/versions") {
        return Promise.resolve({ data: mockVersions, error: undefined }) as never;
      }
      return Promise.resolve({ data: [], error: undefined }) as never;
    });

    const { Wrapper } = createTestWrapper();
    render(<BranchWorkbenchPage pollIntervalMs={30} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: mockBranch.name })
      ).toBeInTheDocument();
    });

    const breadcrumb = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(breadcrumb).toBeInTheDocument();

    const backLink = within(breadcrumb).getByRole("link", { name: /back to branches/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/branches");
  });

  it("resets state when branchId parameter changes", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    vi.spyOn(api, "GET").mockImplementation((path: string) => {
      if (path === "/branches/{id}") {
        return Promise.resolve({ data: mockBranch, error: undefined }) as never;
      }
      if (path === "/branches/{id}/versions") {
        return Promise.resolve({ data: mockVersions, error: undefined }) as never;
      }
      return Promise.resolve({ data: [], error: undefined }) as never;
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/branches/b-123"]}>
          <Routes>
            <Route path="/branches/:id" element={<BranchWorkbenchPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Version v1")).toBeInTheDocument();
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/branches/b-456"]}>
          <Routes>
            <Route path="/branches/:id" element={<BranchWorkbenchPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("Version v1")).toBeInTheDocument();
  });

  it("triggers compare action on version in timeline", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "GET").mockImplementation((path: string) => {
      if (path === "/branches/{id}") {
        return Promise.resolve({ data: mockBranch, error: undefined }) as never;
      }
      if (path === "/branches/{id}/versions") {
        return Promise.resolve({ data: mockVersions, error: undefined }) as never;
      }
      return Promise.resolve({ data: [], error: undefined }) as never;
    });

    const { Wrapper } = createTestWrapper();
    render(<BranchWorkbenchPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /compare v2/i })
      ).toBeInTheDocument();
    });

    const compareBtn = screen.getByRole("button", { name: /compare v2/i });
    await user.click(compareBtn);

    await waitFor(() => {
      expect(screen.getByTestId("preview-page")).toBeInTheDocument();
    });
  });

  it("handles master default branch correctly and navigates to preview upon clicking inspect", async () => {
    const user = userEvent.setup();
    const defaultBranch: Branch = {
      id: "branch-default",
      user_id: "u-1",
      name: "Master Profile (Default)",
      template_set_id: "tpl-default",
      is_default: true,
      active_version_id: "v-default-1",
      updated_at: "2026-11-01T12:00:00Z",
    };

    const defaultVersions: BranchVersion[] = [
      {
        id: "v-default-1",
        branch_id: "branch-default",
        version_number: 1,
        status: "completed",
        created_at: "2026-11-01T12:00:00Z",
      },
    ];

    vi.spyOn(api, "GET").mockImplementation((path: string) => {
      if (path === "/branches/{id}") {
        return Promise.resolve({ data: defaultBranch, error: undefined }) as never;
      }
      if (path === "/branches/{id}/versions") {
        return Promise.resolve({
          data: defaultVersions,
          error: undefined,
        }) as never;
      }
      if (path === "/presets") {
        return Promise.resolve({ data: mockPresets, error: undefined }) as never;
      }
      if (path === "/templates") {
        return Promise.resolve({ data: mockTemplates, error: undefined }) as never;
      }
      return Promise.resolve({ data: undefined, error: undefined }) as never;
    });

    const { Wrapper } = createTestWrapper("/branches/branch-default");
    render(<BranchWorkbenchPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Master Profile (Default)",
        })
      ).toBeInTheDocument();
    });

    // Default branch shows Refresh from Master Profile and Inspect Resume link
    expect(
      screen.getByRole("button", {
        name: /refresh from master profile/i,
      })
    ).toBeInTheDocument();

    const inspectHeaderLink = screen.getByRole("link", {
      name: /inspect resume for master profile \(default\)/i,
    });
    expect(inspectHeaderLink).toBeInTheDocument();
    expect(inspectHeaderLink).toHaveAttribute("href", "/branches/branch-default/preview");

    const inspectProjectionLink = screen.getByRole("link", {
      name: /inspect master resume/i,
    });
    expect(inspectProjectionLink).toBeInTheDocument();
    expect(inspectProjectionLink).toHaveAttribute("href", "/branches/branch-default/preview");

    // Clicking Inspect in VersionTimeline navigates to preview
    const timelineInspectBtn = screen.getByRole("button", {
      name: /inspect v1/i,
    });
    await user.click(timelineInspectBtn);

    await waitFor(() => {
      expect(screen.getByTestId("preview-page")).toBeInTheDocument();
    });
  });

  it("gates preview and disables 'Inspect Resume' on fresh branches with zero completed versions", async () => {
    const freshBranch: Branch = {
      ...mockBranch,
      id: "branch-fresh",
      name: "Fresh Junior Engineer Branch",
      active_version_id: undefined,
    };

    vi.spyOn(api, "GET").mockImplementation((path: string) => {
      if (path === "/branches/{id}") {
        return Promise.resolve({ data: freshBranch, error: undefined }) as never;
      }
      if (path === "/branches/{id}/versions") {
        return Promise.resolve({ data: [], error: undefined }) as never;
      }
      if (path === "/presets") {
        return Promise.resolve({ data: mockPresets, error: undefined }) as never;
      }
      if (path === "/templates") {
        return Promise.resolve({ data: mockTemplates, error: undefined }) as never;
      }
      return Promise.resolve({ data: undefined, error: undefined }) as never;
    });

    const { Wrapper } = createTestWrapper("/branches/branch-fresh");
    render(<BranchWorkbenchPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Fresh Junior Engineer Branch",
        })
      ).toBeInTheDocument();
    });

    // Inspect Resume link should NOT be an active link navigating to /branches/:id/preview
    expect(
      screen.queryByRole("link", {
        name: /inspect resume for fresh junior engineer branch/i,
      })
    ).not.toBeInTheDocument();

    // Inspect Resume button should be disabled
    const inspectBtn = screen.getByRole("button", {
      name: /inspect resume/i,
    });
    expect(inspectBtn).toBeInTheDocument();
    expect(inspectBtn).toBeDisabled();
    expect(inspectBtn).toHaveAttribute("aria-disabled", "true");

    // Guidance text should be displayed advising the user to tailor first
    expect(
      screen.getByText(/tailor resume first to preview/i)
    ).toBeInTheDocument();
  });

  it("passes automated axe accessibility audit with 0 violations", async () => {
    vi.spyOn(api, "GET").mockImplementation((path: string) => {
      if (path === "/branches/{id}") {
        return Promise.resolve({ data: mockBranch, error: undefined }) as never;
      }
      if (path === "/branches/{id}/versions") {
        return Promise.resolve({
          data: mockVersions,
          error: undefined,
        }) as never;
      }
      if (path === "/presets") {
        return Promise.resolve({ data: mockPresets, error: undefined }) as never;
      }
      if (path === "/templates") {
        return Promise.resolve({ data: mockTemplates, error: undefined }) as never;
      }
      return Promise.resolve({ data: [], error: undefined }) as never;
    });

    const { Wrapper } = createTestWrapper();
    const { container } = render(<BranchWorkbenchPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Senior Distributed Systems Engineer",
        })
      ).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("submits quick-add fact to master profile via POST /facts", async () => {
    const user = userEvent.setup();

    const mockProfileSnapshot = {
      profile: { id: "p-1", full_name: "Ada Lovelace" },
      experiences: [
        { id: "exp-1", company: "Acme Corp", role_title: "Senior Engineer", facts: [] },
      ],
      projects: [],
      skills: [],
    };

    let createdFactPayload: unknown = null;

    vi.spyOn(api, "GET").mockImplementation((path: string) => {
      if (path === "/branches/{id}") {
        return Promise.resolve({ data: mockBranch, error: undefined }) as never;
      }
      if (path === "/branches/{id}/versions") {
        return Promise.resolve({
          data: mockVersions,
          error: undefined,
        }) as never;
      }
      if (path === "/presets") {
        return Promise.resolve({ data: mockPresets, error: undefined }) as never;
      }
      if (path === "/templates") {
        return Promise.resolve({ data: mockTemplates, error: undefined }) as never;
      }
      if (path === "/profile/full") {
        return Promise.resolve({ data: mockProfileSnapshot, error: undefined }) as never;
      }
      return Promise.resolve({ data: undefined, error: undefined }) as never;
    });

    vi.spyOn(api, "POST").mockImplementation((path: string, options?: { body?: unknown }) => {
      if (path === "/facts") {
        createdFactPayload = options?.body;
        return Promise.resolve({
          data: {
            id: "fact-new",
            owner_id: "exp-1",
            owner_type: "work_experience",
            statement: "Operated high-volume Raft clusters with 99.99% availability.",
          },
          error: undefined,
        }) as never;
      }
      return Promise.resolve({ data: undefined, error: undefined }) as never;
    });

    const { Wrapper } = createTestWrapper();
    render(<BranchWorkbenchPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("Raft consensus protocol")).toBeInTheDocument();
    });

    const quickAddBtn = screen.getByRole("button", {
      name: /i have this experience: raft consensus protocol/i,
    });
    await user.click(quickAddBtn);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    const textarea = screen.getByRole("textbox", {
      name: /verified fact \/ accomplishment statement/i,
    });
    await user.clear(textarea);
    await user.type(
      textarea,
      "Operated high-volume Raft clusters with 99.99% availability."
    );

    const saveBtn = screen.getByRole("button", {
      name: /add to master profile/i,
    });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(createdFactPayload).toEqual({
        owner_id: "exp-1",
        owner_type: "work_experience",
        statement: "Operated high-volume Raft clusters with 99.99% availability.",
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText("Experience Recorded")
      ).toBeInTheDocument();
    });
  });

  it("displays visual feedback and preview confirmation when switching appearance templates", async () => {
    const user = userEvent.setup();

    vi.spyOn(api, "GET").mockImplementation((path: string) => {
      if (path === "/branches/{id}") {
        return Promise.resolve({ data: mockBranch, error: undefined }) as never;
      }
      if (path === "/branches/{id}/versions") {
        return Promise.resolve({
          data: mockVersions,
          error: undefined,
        }) as never;
      }
      if (path === "/presets") {
        return Promise.resolve({ data: mockPresets, error: undefined }) as never;
      }
      if (path === "/templates") {
        return Promise.resolve({
          data: [
            ...mockTemplates,
            {
              id: "tpl-modern",
              user_id: "u-1",
              name: "Modern Clean Layout",
              description: "Contemporary design",
              html_template: "<div>Modern</div>",
              markdown_template: "# Modern",
              text_template: "Modern",
            },
          ],
          error: undefined,
        }) as never;
      }
      return Promise.resolve({ data: undefined, error: undefined }) as never;
    });

    vi.spyOn(api, "PUT").mockResolvedValue({
      data: { ...mockBranch, template_set_id: "tpl-modern" },
      error: undefined,
      response: new Response(),
    } as never);

    vi.spyOn(api, "POST").mockResolvedValue({
      data: {
        template_set_id: "tpl-modern",
        html: "<div class='modern'>Preview Content</div>",
        markdown: "# Modern",
        plain_text: "Modern",
      },
      error: undefined,
      response: new Response(),
    } as never);

    const { Wrapper } = createTestWrapper();
    render(<BranchWorkbenchPage pollIntervalMs={30} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: /resume template/i })
      ).toBeInTheDocument();
    });

    const templateSelect = screen.getByRole("combobox", {
      name: /resume template/i,
    });
    await user.selectOptions(templateSelect, "tpl-modern");

    expect(api.PUT).toHaveBeenCalledWith("/branches/{id}", {
      params: { path: { id: "b-123" } },
      body: { template_set_id: "tpl-modern" },
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Layout switched to "Modern Clean Layout"\. Resume preview updated\./i)
      ).toBeInTheDocument();
      expect(
        screen.getByText("Template Updated")
      ).toBeInTheDocument();
    });

    // Verify Quick Preview button is present and opens the preview dialog
    const quickPreviewBtn = screen.getByRole("button", {
      name: /preview layout in modal/i,
    });
    expect(quickPreviewBtn).toBeInTheDocument();
    await user.click(quickPreviewBtn);

    expect(api.POST).toHaveBeenCalledWith(
      "/branches/{id}/versions/{v}/render-preview",
      {
        params: { path: { id: "b-123", v: "1" } },
        body: { template_set_id: "tpl-modern" },
      }
    );

    await waitFor(() => {
      expect(
        screen.getByRole("dialog")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Template Appearance Preview:/i)
      ).toBeInTheDocument();
      const modalIframe = screen.getByTitle("Template Layout Preview");
      expect(modalIframe).toBeInTheDocument();
      expect(modalIframe).toHaveAttribute("sandbox", "");
      expect(modalIframe).toHaveAttribute("srcdoc", "<div class='modern'>Preview Content</div>");
    });
  });
});
