import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { axe } from "vitest-axe";
import { ResumePreviewPage } from "./resume-preview-page";
import * as renderQueries from "@/api/render-queries";
import * as templateQueries from "@/api/template-queries";
import * as workbenchQueries from "@/api/workbench-queries";

vi.mock("@/api/template-queries", async (importOriginal) => {
  const actual = await importOriginal<typeof templateQueries>();
  return {
    ...actual,
    useTemplates: vi.fn(),
  };
});

vi.mock("@/api/render-queries", async (importOriginal) => {
  const actual = await importOriginal<typeof renderQueries>();
  return {
    ...actual,
    useBranch: vi.fn(),
    useBranchVersions: vi.fn(),
    useBranchVersion: vi.fn(),
    useBranchVersionPreview: vi.fn(),
    useFullProfile: vi.fn(),
  };
});

vi.mock("@/api/workbench-queries", async (importOriginal) => {
  const actual = await importOriginal<typeof workbenchQueries>();
  return {
    ...actual,
    useTemplates: vi.fn(),
    useUpdateBranch: vi.fn(),
    renderPreviewEphemeral: vi.fn(),
  };
});

function mockQueryResult<T>(override: Partial<UseQueryResult<T, Error>>): UseQueryResult<T, Error> {
  return {
    data: undefined,
    error: null,
    isError: false,
    isLoading: false,
    isLoadingError: false,
    isRefetchError: false,
    isSuccess: true,
    status: "success",
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isPaused: false,
    isPlaceholderData: false,
    isRefetching: false,
    isStale: false,
    refetch: vi.fn(),
    fetchStatus: "idle",
    promise: Promise.resolve(undefined as unknown as T),
    ...override,
  } as unknown as UseQueryResult<T, Error>;
}

function createTestWrapper(initialEntries = ["/branches/b-123/preview"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/branches/:id/preview" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ResumePreviewPage Component", () => {
  const mockBranch: renderQueries.Branch = {
    id: "b-123",
    user_id: "u-1",
    name: "Stripe - Staff Backend Engineer",
    target_role: "Staff Backend Engineer",
    target_company: "Stripe",
    template_set_id: "tmpl-1",
    active_version_id: "v-1",
  };

  const mockVersion1: renderQueries.BranchVersion = {
    id: "v-1",
    branch_id: "b-123",
    version_number: 1,
    status: "completed",
    html_output: "<!DOCTYPE html><html><body><h1>Jane Doe - Stripe</h1></body></html>",
    plain_text_output: "Jane Doe\nStaff Backend Engineer\nStripe",
    tailored_content: {
      full_name: "Jane Doe",
      headline: "Staff Backend Engineer",
      summary: "Distributed systems architect tailored for Stripe payments infrastructure.",
      skill_groups: [
        {
          category: "Languages",
          skills: ["Go", "Distributed Systems"],
        },
      ],
      experiences: [
        {
          source_entity_id: "exp-1",
          company: "Acme",
          role_title: "Senior Engineer",
          start_date: "2020-01",
          bullet_points: [
            {
              text: "Engineered transactional settlement engine processing $10M/day.",
              source_fact_ids: [],
            },
          ],
        },
      ],
    },
  };

  const mockVersion2: renderQueries.BranchVersion = {
    ...mockVersion1,
    id: "v-2",
    version_number: 2,
    status: "completed",
  };

  const mockMainProfile: renderQueries.MainProfileSnapshot = {
    main_revision: 2,
    exported_at: "2026-11-01T00:00:00Z",
    profile: {
      id: "p-1",
      user_id: "u-1",
      full_name: "Jane Doe",
      headline: "Generalist Software Engineer",
      summary: "General software engineer.",
      default_provider: "anthropic",
      default_model: "claude-3-5-sonnet-20241022",
      main_revision: 2,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    skills: [],
    experiences: [],
    projects: [],
    education: [],
    certifications: [],
    facts: [],
  };

  let mockUpdateBranchMutate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateBranchMutate = vi.fn();

    vi.mocked(renderQueries.useBranch).mockReturnValue(
      mockQueryResult<renderQueries.Branch>({
        data: mockBranch,
        isLoading: false,
        isError: false,
      })
    );

    vi.mocked(renderQueries.useBranchVersions).mockReturnValue(
      mockQueryResult<renderQueries.BranchVersion[]>({
        data: [mockVersion1],
        isLoading: false,
        isError: false,
      })
    );

    vi.mocked(renderQueries.useBranchVersion).mockReturnValue(
      mockQueryResult<renderQueries.BranchVersion>({
        data: mockVersion1,
        isLoading: false,
        isError: false,
      })
    );

    vi.mocked(renderQueries.useBranchVersionPreview).mockImplementation(
      (branchId, versionId, templateSetId) => {
        const queryClient = useQueryClient();
        const cached = queryClient.getQueryData<renderQueries.RenderOutput>(
          renderQueries.renderQueryKeys.branchPreview(
            branchId,
            String(versionId),
            templateSetId
          )
        );
        return mockQueryResult<renderQueries.RenderOutput>({
          data: cached || {
            html: mockVersion1.html_output || "",
            markdown: mockVersion1.markdown_output || "",
            plain_text: mockVersion1.plain_text_output || "",
          },
          isLoading: false,
          isError: false,
        });
      }
    );

    vi.mocked(renderQueries.useFullProfile).mockReturnValue(
      mockQueryResult<renderQueries.MainProfileSnapshot>({
        data: mockMainProfile,
        isLoading: false,
        isError: false,
      })
    );

    const mockTemplatesList = [
      {
        id: "tmpl-1",
        user_id: "u-1",
        name: "Simple Modern Tech",
        description: "Simple modern tech layout",
        html_template: "<div>Standard</div>",
        markdown_template: "# Standard",
        text_template: "Standard",
      },
      {
        id: "tmpl-2",
        user_id: "u-1",
        name: "Executive Clean",
        description: "Executive layout",
        html_template: "<div>Executive</div>",
        markdown_template: "# Executive",
        text_template: "Executive",
      },
    ];

    vi.mocked(templateQueries.useTemplates).mockReturnValue(
      mockQueryResult<templateQueries.TemplateSet[]>({
        data: mockTemplatesList,
        isLoading: false,
        isError: false,
      })
    );

    vi.mocked(workbenchQueries.useTemplates).mockReturnValue(
      mockQueryResult<workbenchQueries.TemplateSet[]>({
        data: mockTemplatesList,
        isLoading: false,
        isError: false,
      })
    );

    mockUpdateBranchMutate = vi.fn();
    vi.mocked(workbenchQueries.useUpdateBranch).mockReturnValue({
      mutate: mockUpdateBranchMutate,
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as never);

    vi.mocked(workbenchQueries.renderPreviewEphemeral).mockResolvedValue({
      template_set_id: "tmpl-2",
      html: "<!DOCTYPE html><html><body><h1>Jane Doe - Executive</h1></body></html>",
      markdown: "# Jane Doe - Executive",
      plain_text: "Jane Doe - Executive",
      html_output: "<!DOCTYPE html><html><body><h1>Jane Doe - Executive</h1></body></html>",
      markdown_output: "# Jane Doe - Executive",
      plain_text_output: "Jane Doe - Executive",
    });
  });

  it("renders page title, branch metadata, and export toolbar", () => {
    render(<ResumePreviewPage />, { wrapper: createTestWrapper() });

    expect(
      screen.getByRole("heading", { level: 1, name: /stripe - staff backend engineer/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: /resume export actions/i })).toBeInTheDocument();
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("switches tabs between Rendered Resume and Tailoring Diff", async () => {
    const user = userEvent.setup();
    render(<ResumePreviewPage />, { wrapper: createTestWrapper() });

    // Initially "Rendered Resume" tab is active
    expect(screen.getByRole("tab", { name: /rendered resume/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByTitle("Rendered Resume Preview")).toBeInTheDocument();

    // Click on "Tailoring Diff" tab
    const diffTab = screen.getByRole("tab", { name: /tailoring diff/i });
    await user.click(diffTab);

    expect(diffTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("region", { name: /tailored resume diff viewer/i })).toBeInTheDocument();
  });

  it("selects specified version and tab from URL query search parameters", () => {
    render(<ResumePreviewPage />, {
      wrapper: createTestWrapper(["/branches/b-123/preview?version=2&tab=diff"]),
    });

    expect(renderQueries.useBranchVersion).toHaveBeenCalledWith("b-123", 2);
    expect(screen.getByRole("tab", { name: /tailoring diff/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("persists user version selection from dropdown when initialVersion was provided", async () => {
    const user = userEvent.setup();
    vi.mocked(renderQueries.useBranchVersions).mockReturnValue(
      mockQueryResult<renderQueries.BranchVersion[]>({
        data: [mockVersion1, mockVersion2],
        isLoading: false,
        isError: false,
      })
    );

    render(<ResumePreviewPage />, {
      wrapper: createTestWrapper(["/branches/b-123/preview?version=1"]),
    });

    const select = screen.getByRole("combobox", { name: /select resume version/i });
    expect(select).toHaveValue("1");

    await user.selectOptions(select, "2");
    expect(select).toHaveValue("2");
    expect(renderQueries.useBranchVersion).toHaveBeenLastCalledWith("b-123", 2);
  });

  it("safely falls back without evaluating to NaN when version param is non-numeric", () => {
    vi.mocked(renderQueries.useBranchVersions).mockReturnValue(
      mockQueryResult<renderQueries.BranchVersion[]>({
        data: [mockVersion1, mockVersion2],
        isLoading: false,
        isError: false,
      })
    );

    render(<ResumePreviewPage />, {
      wrapper: createTestWrapper(["/branches/b-123/preview?version=invalid"]),
    });

    // Should fall back to active version (v-1, version_number 1), never NaN
    expect(renderQueries.useBranchVersion).not.toHaveBeenCalledWith("b-123", NaN);
    expect(renderQueries.useBranchVersion).toHaveBeenCalledWith("b-123", 1);
  });

  it("defaults to active branch version when navigated to preview without version param", () => {
    vi.mocked(renderQueries.useBranch).mockReturnValue(
      mockQueryResult<renderQueries.Branch>({
        data: { ...mockBranch, active_version_id: "v-2" },
        isLoading: false,
        isError: false,
      })
    );
    vi.mocked(renderQueries.useBranchVersions).mockReturnValue(
      mockQueryResult<renderQueries.BranchVersion[]>({
        data: [mockVersion1, mockVersion2],
        isLoading: false,
        isError: false,
      })
    );

    render(<ResumePreviewPage />, {
      wrapper: createTestWrapper(["/branches/b-123/preview"]),
    });

    expect(renderQueries.useBranchVersion).toHaveBeenCalledWith("b-123", 2);
  });

  it("renders export actions for HTML, Markdown, Plain Text, and JSON Resume in toolbar with valid endpoint URLs and copy actions", () => {
    render(<ResumePreviewPage />, { wrapper: createTestWrapper() });

    const htmlLink = screen.getByRole("link", { name: /download html/i });
    expect(htmlLink).toBeInTheDocument();
    expect(htmlLink).toHaveAttribute(
      "href",
      "/api/v1/branches/b-123/versions/1/export?format=html&template_set_id=tmpl-1"
    );

    const markdownLink = screen.getByRole("link", { name: /download markdown/i });
    expect(markdownLink).toBeInTheDocument();
    expect(markdownLink).toHaveAttribute(
      "href",
      "/api/v1/branches/b-123/versions/1/export?format=markdown&template_set_id=tmpl-1"
    );

    const textLink = screen.getByRole("link", { name: /download plain text/i });
    expect(textLink).toBeInTheDocument();
    expect(textLink).toHaveAttribute(
      "href",
      "/api/v1/branches/b-123/versions/1/export?format=text&template_set_id=tmpl-1"
    );

    const jsonLink = screen.getByRole("link", { name: /export json resume/i });
    expect(jsonLink).toBeInTheDocument();
    expect(jsonLink).toHaveAttribute(
      "href",
      "/api/v1/branches/b-123/versions/1/export?format=jsonresume&template_set_id=tmpl-1"
    );

    expect(screen.getByRole("button", { name: /copy markdown/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy plain text/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /print to pdf/i })).not.toBeInTheDocument();
  });

  it("safely handles Tailoring Diff tab for main profile branch without crashing", () => {
    const mainBranch: renderQueries.Branch = {
      id: "b-main",
      user_id: "u-1",
      name: "Main Profile (Default)",
      target_role: "",
      target_company: "",
      template_set_id: "tmpl-1",
      active_version_id: "v-main",
    };

    const mainVersion: renderQueries.BranchVersion = {
      id: "v-main",
      branch_id: "b-main",
      version_number: 1,
      status: "completed",
      source_type: "manual_edit",
      tailored_content: {
        full_name: "Jane Doe",
        headline: "Generalist Software Engineer",
        summary: "General software engineer.",
        skill_groups: [],
        experiences: [],
      },
    };

    vi.mocked(renderQueries.useBranch).mockReturnValue(
      mockQueryResult<renderQueries.Branch>({ data: mainBranch })
    );
    vi.mocked(renderQueries.useBranchVersions).mockReturnValue(
      mockQueryResult<renderQueries.BranchVersion[]>({ data: [mainVersion] })
    );
    vi.mocked(renderQueries.useBranchVersion).mockReturnValue(
      mockQueryResult<renderQueries.BranchVersion>({ data: mainVersion })
    );

    render(<ResumePreviewPage />, {
      wrapper: createTestWrapper(["/branches/b-main/preview?tab=diff"]),
    });

    expect(
      screen.getByRole("region", { name: /tailored resume diff viewer/i })
    ).toBeInTheDocument();
  });

  it("displays loading state when data is being fetched", () => {
    vi.mocked(renderQueries.useBranch).mockReturnValue(
      mockQueryResult<renderQueries.Branch>({
        data: undefined,
        isLoading: true,
        isError: false,
      })
    );

    render(<ResumePreviewPage />, { wrapper: createTestWrapper() });

    expect(screen.getByRole("status", { name: /loading resume preview/i })).toBeInTheDocument();
  });

  it("displays error state when branch fetch fails", () => {
    vi.mocked(renderQueries.useBranch).mockReturnValue(
      mockQueryResult<renderQueries.Branch>({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("Branch not found"),
      })
    );

    render(<ResumePreviewPage />, { wrapper: createTestWrapper() });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/branch not found/i);
    const returnLink = within(alert).getByRole("link", { name: /back to branches/i });
    expect(returnLink).toBeInTheDocument();
    expect(returnLink).toHaveAttribute("href", "/branches");
  });

  it("renders breadcrumb navigation linking to branches catalog and parent branch workbench", () => {
    render(<ResumePreviewPage />, { wrapper: createTestWrapper() });

    const breadcrumb = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(breadcrumb).toBeInTheDocument();

    const branchesLink = within(breadcrumb).getByRole("link", { name: /^branches$/i });
    expect(branchesLink).toHaveAttribute("href", "/branches");

    const workbenchLink = within(breadcrumb).getByRole("link", { name: /back to workbench/i });
    expect(workbenchLink).toHaveAttribute("href", "/branches/b-123");
  });

  it("resolves template UUID to friendly name in preview header and breadcrumb trail", () => {
    render(<ResumePreviewPage />, { wrapper: createTestWrapper() });

    // Preview header must display friendly template name instead of raw UUID
    expect(screen.getByText(/template: simple modern tech/i)).toBeInTheDocument();
    expect(screen.queryByText(/template: tmpl-1/i)).not.toBeInTheDocument();

    // Breadcrumb navigation should also reflect friendly template name
    const breadcrumbNav = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(breadcrumbNav).toHaveTextContent(/preview \(simple modern tech\)/i);
  });

  it("falls back to raw template ID in header and breadcrumb when template is not in catalog", () => {
    vi.mocked(renderQueries.useBranch).mockReturnValue(
      mockQueryResult<renderQueries.Branch>({
        data: {
          ...mockBranch,
          template_set_id: "tmpl-unknown-custom-uuid",
        },
        isLoading: false,
        isError: false,
      })
    );

    render(<ResumePreviewPage />, { wrapper: createTestWrapper() });

    // Fallback to raw ID in header
    expect(screen.getByText(/template: tmpl-unknown-custom-uuid/i)).toBeInTheDocument();

    // Fallback to raw ID in breadcrumb
    const breadcrumbNav = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(breadcrumbNav).toHaveTextContent(/preview \(tmpl-unknown-custom-uuid\)/i);
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = render(<ResumePreviewPage />, { wrapper: createTestWrapper() });

    // Note: in jsdom axe-core, iframes: false prevents cross-frame postMessage errors
    const results = await axe(container, { iframes: false });
    expect(results).toHaveNoViolations();
  });

  it("switches templates dynamically using ephemeral preview endpoint", async () => {
    const user = userEvent.setup();
    render(<ResumePreviewPage />, { wrapper: createTestWrapper() });

    const templateSelect = screen.getByRole("combobox", {
      name: /select resume template/i,
    });
    expect(templateSelect).toBeInTheDocument();
    expect(templateSelect).toHaveValue("tmpl-1");

    await user.selectOptions(templateSelect, "tmpl-2");

    expect(workbenchQueries.renderPreviewEphemeral).toHaveBeenCalledWith(
      "b-123",
      1,
      "tmpl-2"
    );

    await waitFor(() => {
      const iframe = screen.getByTitle("Rendered Resume Preview");
      expect(iframe).toHaveAttribute(
        "srcdoc",
        "<!DOCTYPE html><html><body><h1>Jane Doe - Executive</h1></body></html>"
      );
    });

    expect(mockUpdateBranchMutate).toHaveBeenCalledWith({
      template_set_id: "tmpl-2",
    });

    // Verify download options update to the selected template
    expect(screen.getByRole("link", { name: /download html/i })).toHaveAttribute(
      "href",
      "/api/v1/branches/b-123/versions/1/export?format=html&template_set_id=tmpl-2"
    );
    expect(screen.getByRole("link", { name: /download markdown/i })).toHaveAttribute(
      "href",
      "/api/v1/branches/b-123/versions/1/export?format=markdown&template_set_id=tmpl-2"
    );
    expect(screen.getByRole("link", { name: /download plain text/i })).toHaveAttribute(
      "href",
      "/api/v1/branches/b-123/versions/1/export?format=text&template_set_id=tmpl-2"
    );
  });
});
