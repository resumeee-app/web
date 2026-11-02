import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "vitest-axe";
import { BranchesPage } from "./branches-page";
import { api } from "@/api/client";
import type { Branch, Preset, TemplateSet } from "@/api/branch-queries";

describe("BranchesPage Integration & Views", () => {
  let mockBranches: Branch[];

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
      is_default: false,
      active_version_id: "v2",
      status: "active",
      updated_at: "2026-11-01T12:00:00Z",
    },
  ];

  const mockPresets: Preset[] = [
    {
      id: "preset-platform",
      user_id: "system",
      name: "Platform Engineer",
      system_instructions: "Emphasize high throughput",
      template_set_id: "tmpl-clean",
      is_built_in: true,
    },
  ];

  const mockTemplates: TemplateSet[] = [
    {
      id: "tmpl-clean",
      user_id: "system",
      name: "Modern Clean Template",
      html_template: "<div></div>",
      markdown_template: "# Res",
      text_template: "Res",
    },
  ];

  function renderBranchesPage() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const renderResult = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/branches"]}>
          <BranchesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    return { ...renderResult, queryClient };
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    mockBranches = [...initialBranches];

    vi.spyOn(api, "GET").mockImplementation((path: unknown) => {
      if (path === "/branches") {
        return Promise.resolve({
          data: [...mockBranches],
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
      return Promise.resolve({
        data: null,
        error: undefined,
        response: new Response(),
      }) as unknown as never;
    });
  });

  it("renders page header and lists branches in card grid view by default", async () => {
    renderBranchesPage();

    expect(
      screen.getByRole("heading", { level: 1, name: /resume branches/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Master Profile (Default)")).toBeInTheDocument();
      expect(
        screen.getByText("Netflix - Senior Platform Engineer")
      ).toBeInTheDocument();
    });

    // Default branch prominent badge & description
    expect(screen.getByText("Default Branch")).toBeInTheDocument();
    expect(
      screen.getByText(/mirrors canonical master data with zero llm tailoring/i)
    ).toBeInTheDocument();

    // Default branch and custom branch render Inspect actions linking to preview
    const defaultInspectLink = screen.getByRole("link", {
      name: /inspect resume for master profile \(default\)/i,
    });
    expect(defaultInspectLink).toBeInTheDocument();
    expect(defaultInspectLink).toHaveAttribute("href", "/branches/branch-default-u1/preview");

    const customInspectLink = screen.getByRole("link", {
      name: /inspect resume for netflix - senior platform engineer/i,
    });
    expect(customInspectLink).toBeInTheDocument();
    expect(customInspectLink).toHaveAttribute("href", "/branches/branch-tailored-2/preview");

    // Default branch does not have delete button
    expect(
      screen.queryByRole("button", {
        name: /delete branch master profile \(default\)/i,
      })
    ).not.toBeInTheDocument();

    // Non-default branch has delete button
    expect(
      screen.getByRole("button", {
        name: /delete branch netflix - senior platform engineer/i,
      })
    ).toBeInTheDocument();
  });

  it("toggles between card grid and responsive table views", async () => {
    const user = userEvent.setup();
    renderBranchesPage();

    await waitFor(() => {
      expect(screen.getByText("Master Profile (Default)")).toBeInTheDocument();
    });

    // Click Table View button
    const tableViewBtn = screen.getByRole("button", { name: /table view/i });
    await user.click(tableViewBtn);

    // Verify table structure
    const table = screen.getByRole("table", {
      name: /resume branches catalog/i,
    });
    expect(table).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /branch/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /target/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /status/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /actions/i })
    ).toBeInTheDocument();

    // In table view, default branch badge and actions are rendered
    expect(screen.getByText("Default Branch")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /inspect resume for master profile \(default\)/i,
      })
    ).toHaveAttribute("href", "/branches/branch-default-u1/preview");
    expect(
      screen.queryByRole("button", {
        name: /delete branch master profile \(default\)/i,
      })
    ).not.toBeInTheDocument();

    // Switch back to Grid View
    const gridViewBtn = screen.getByRole("button", { name: /grid view/i });
    await user.click(gridViewBtn);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("filters branches using live search input and handles non-matching queries", async () => {
    const user = userEvent.setup();
    renderBranchesPage();

    await waitFor(() => {
      expect(screen.getByText("Master Profile (Default)")).toBeInTheDocument();
      expect(
        screen.getByText("Netflix - Senior Platform Engineer")
      ).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search branches\.\.\./i);
    expect(searchInput).toHaveAttribute("id", "branch-search");

    // Filter by company name "Netflix"
    await user.type(searchInput, "Netflix");
    expect(
      screen.getByText("Netflix - Senior Platform Engineer")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Master Profile (Default)")
    ).not.toBeInTheDocument();

    // Clear search and filter by non-matching query
    await user.clear(searchInput);
    await user.type(searchInput, "NonExistentBranchXYZ");
    expect(
      screen.queryByText("Netflix - Senior Platform Engineer")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Master Profile (Default)")
    ).not.toBeInTheDocument();
    expect(screen.getByText(/no branches created yet/i)).toBeInTheDocument();

    // Clear search query again restores all branches
    await user.clear(searchInput);
    expect(screen.getByText("Master Profile (Default)")).toBeInTheDocument();
    expect(
      screen.getByText("Netflix - Senior Platform Engineer")
    ).toBeInTheDocument();
  });

  it("creates a new branch and optimistically updates the list", async () => {
    const user = userEvent.setup();

    const createdBranch: Branch = {
      id: "b-optimistic-1",
      user_id: "u1",
      name: "Apple - iOS Lead",
      target_company: "Apple",
      target_role: "iOS Lead",
      template_set_id: "tmpl-clean",
      is_default: false,
      active_version_id: "v1",
      status: "active",
      updated_at: new Date().toISOString(),
    };

    vi.spyOn(api, "POST").mockImplementation(async () => {
      mockBranches.push(createdBranch);
      return {
        data: createdBranch,
        error: undefined,
        response: new Response(),
      } as unknown as never;
    });

    renderBranchesPage();

    await waitFor(() => {
      expect(screen.getByText("Master Profile (Default)")).toBeInTheDocument();
    });

    // Open creation modal
    const createBtn = screen.getByRole("button", { name: /create new branch/i });
    await user.click(createBtn);

    expect(
      screen.getByRole("dialog", { name: /create new resume branch/i })
    ).toBeInTheDocument();

    // Fill form
    await user.type(screen.getByLabelText(/branch name \*/i), "Apple - iOS Lead");
    await user.type(screen.getByLabelText(/target company/i), "Apple");
    await user.type(screen.getByLabelText(/target role/i), "iOS Lead");

    // Submit
    const submitBtn = screen.getByRole("button", { name: /^create branch$/i });
    await user.click(submitBtn);

    // Modal closes and branch is listed
    await waitFor(() => {
      expect(screen.getByText("Apple - iOS Lead")).toBeInTheDocument();
    });
  });

  it("deletes a non-default branch via confirmation dialog", async () => {
    const user = userEvent.setup();

    vi.spyOn(api, "DELETE").mockImplementation(async () => {
      const idx = mockBranches.findIndex((b) => b.id === "branch-tailored-2");
      if (idx !== -1) {
        mockBranches.splice(idx, 1);
      }
      return {
        data: undefined,
        error: undefined,
        response: new Response(),
      } as unknown as never;
    });

    renderBranchesPage();

    await waitFor(() => {
      expect(
        screen.getByText("Netflix - Senior Platform Engineer")
      ).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", {
      name: /delete branch netflix - senior platform engineer/i,
    });
    await user.click(deleteBtn);

    // Alert dialog opens
    expect(
      screen.getByRole("alertdialog", { name: /delete branch/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /are you sure you want to delete branch 'netflix - senior platform engineer'\?/i
      )
    ).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = screen.getByRole("button", { name: /confirm delete/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(api.DELETE).toHaveBeenCalledWith("/branches/{id}", {
        params: { path: { id: "branch-tailored-2" } },
      });
    });
  });

  it("has zero accessibility violations in grid and table views", async () => {
    const user = userEvent.setup();
    const { container } = renderBranchesPage();

    await waitFor(() => {
      expect(screen.getByText("Master Profile (Default)")).toBeInTheDocument();
    });

    // Axe audit on grid view
    expect(await axe(container)).toHaveNoViolations();

    // Switch to table view
    const tableViewBtn = screen.getByRole("button", { name: /table view/i });
    await user.click(tableViewBtn);

    // Axe audit on table view
    expect(await axe(container)).toHaveNoViolations();
  });
});
