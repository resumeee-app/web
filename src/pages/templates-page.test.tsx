import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "vitest-axe";
import { TemplatesPage } from "./templates-page";
import { api } from "@/api/client";
import type { TemplateSet } from "@/api/template-queries";

const mockTemplates: TemplateSet[] = [
  {
    id: "builtin-standard-clean",
    user_id: "system",
    name: "Standard Clean",
    description: "Modern tech resume with clean typography and blue accents.",
    is_built_in: true,
    html_template: "<h1>{{.FullName}}</h1><p>{{.Headline}}</p>",
    css_styles: "h1 { color: #2563eb; }",
    markdown_template: "# {{.FullName}}\n{{.Headline}}",
    text_template: "{{.FullName}}\n{{.Headline}}",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "builtin-ats-minimal-txt",
    user_id: "system",
    name: "ATS Minimal Plain-Text",
    description: "Single-column ASCII-safe plain text resume.",
    is_built_in: true,
    html_template: "<pre>{{.FullName}}</pre>",
    css_styles: "",
    markdown_template: "{{.FullName}}",
    text_template: "{{.FullName}}",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "tmpl-custom-1",
    user_id: "user-test",
    name: "My Custom Creative Resume",
    description: "A tailored two-column template for design roles.",
    is_built_in: false,
    html_template: "<div class='creative'>{{.FullName}}</div>",
    css_styles: ".creative { font-family: serif; }",
    markdown_template: "# {{.FullName}} (Creative)",
    text_template: "{{.FullName}} (Creative)",
    created_at: "2026-02-01T12:00:00Z",
    updated_at: "2026-02-01T12:00:00Z",
  },
];

// Mock API client
vi.mock("@/api/client", () => ({
  api: {
    GET: vi.fn((path: string) => {
      if (path === "/templates") {
        return Promise.resolve({ data: mockTemplates, error: null, response: { status: 200 } });
      }
      return Promise.resolve({ data: null, error: { error: { message: "Not found" } }, response: { status: 404 } });
    }),
    DELETE: vi.fn((_path: string, _options?: { params?: { path?: { id?: string } } }) => {
      return Promise.resolve({ data: null, error: null, response: { status: 204 } });
    }),
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/templates"]}>
        <Routes>
          <Route path="/templates" element={ui} />
          <Route path="/templates/new" element={<div>New Template Page</div>} />
          <Route path="/templates/:id" element={<div>Editor Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("TemplatesPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page title and template grid with system built-in badges", async () => {
    renderWithProviders(<TemplatesPage />);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /template sets/i,
      })
    ).toBeInTheDocument();

    // Verify all templates are displayed
    expect(await screen.findByText("Standard Clean")).toBeInTheDocument();
    expect(screen.getByText("ATS Minimal Plain-Text")).toBeInTheDocument();
    expect(screen.getByText("My Custom Creative Resume")).toBeInTheDocument();

    // Verify system built-in badges
    const builtInBadges = screen.getAllByText(/built-in/i);
    expect(builtInBadges.length).toBeGreaterThanOrEqual(2);
  });

  it("enforces immutability: delete button is hidden/disabled for built-in templates", async () => {
    renderWithProviders(<TemplatesPage />);

    await screen.findByText("Standard Clean");

    // "My Custom Creative Resume" is custom, so it must have a delete action
    const customCard = screen.getByTestId("template-card-tmpl-custom-1");
    expect(customCard).toBeInTheDocument();
    const customDeleteBtn = screen.getByRole("button", {
      name: /delete my custom creative resume/i,
    });
    expect(customDeleteBtn).toBeInTheDocument();

    // Built-in templates must NOT have a delete button
    expect(
      screen.queryByRole("button", {
        name: /delete standard clean/i,
      })
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: /delete ats minimal plain-text/i,
      })
    ).not.toBeInTheDocument();
  });

  it("opens accessible Radix AlertDialog on custom template deletion", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TemplatesPage />);

    await screen.findByText("My Custom Creative Resume");

    const deleteBtn = screen.getByRole("button", {
      name: /delete my custom creative resume/i,
    });
    await user.click(deleteBtn);

    // Verify alert dialog opens with confirmation text
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /delete template set/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/are you sure you want to delete "my custom creative resume"/i)
    ).toBeInTheDocument();

    // Cancel dismissal
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelBtn);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("confirms deletion in alert dialog and invokes api.DELETE with template ID", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TemplatesPage />);

    await screen.findByText("My Custom Creative Resume");

    const deleteBtn = screen.getByRole("button", {
      name: /delete my custom creative resume/i,
    });
    await user.click(deleteBtn);

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /delete template/i });
    await user.click(confirmBtn);

    expect(api.DELETE).toHaveBeenCalledWith("/templates/{id}", {
      params: { path: { id: "tmpl-custom-1" } },
    });
  });

  it("filters templates by search term and filter tabs", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TemplatesPage />);

    await screen.findByText("Standard Clean");

    const searchInput = screen.getByRole("searchbox", {
      name: /search templates/i,
    });
    await user.type(searchInput, "creative");

    // Only custom creative resume should remain
    expect(screen.getByText("My Custom Creative Resume")).toBeInTheDocument();
    expect(screen.queryByText("Standard Clean")).not.toBeInTheDocument();
    expect(screen.queryByText("ATS Minimal Plain-Text")).not.toBeInTheDocument();

    // Clear search
    await user.clear(searchInput);
    expect(screen.getByText("Standard Clean")).toBeInTheDocument();

    // Click "Built-in" filter tab/button
    const builtInTab = screen.getByRole("button", { name: /built-in \(/i });
    await user.click(builtInTab);
    expect(screen.getByText("Standard Clean")).toBeInTheDocument();
    expect(screen.queryByText("My Custom Creative Resume")).not.toBeInTheDocument();
  });

  it("opens quick preview modal rendering a sandboxed iframe with srcdoc and no allow-scripts", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TemplatesPage />);

    await screen.findByText("Standard Clean");

    const previewBtn = screen.getByRole("button", {
      name: /preview standard clean/i,
    });
    await user.click(previewBtn);

    // Modal dialog opens
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Verify sandboxed iframe
    const iframe = dialog.querySelector("iframe");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("sandbox");
    // Ensure sandbox does NOT contain "allow-scripts"
    const sandboxAttr = iframe?.getAttribute("sandbox") || "";
    expect(sandboxAttr).not.toContain("allow-scripts");
    expect(iframe).toHaveAttribute("srcdoc");
  });

  it("passes automated axe accessibility audit with 0 violations", async () => {
    const { container } = renderWithProviders(<TemplatesPage />);
    await screen.findByText("Standard Clean");

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
