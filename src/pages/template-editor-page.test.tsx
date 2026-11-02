import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "vitest-axe";
import { TemplateEditorPage } from "./template-editor-page";
import { api } from "@/api/client";
import type { TemplateSet } from "@/api/template-queries";

const mockBuiltIn: TemplateSet = {
  id: "builtin-standard-clean",
  user_id: "system",
  name: "Standard Clean",
  description: "Modern tech resume with clean typography.",
  is_built_in: true,
  html_template: "<h1>{{.FullName}}</h1><p>{{.Headline}}</p>",
  css_styles: "h1 { color: #2563eb; }",
  markdown_template: "# {{.FullName}}\n{{.Headline}}",
  text_template: "{{.FullName}}\n{{.Headline}}",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockCustom: TemplateSet = {
  id: "tmpl-custom-1",
  user_id: "user-test",
  name: "Custom Draft",
  description: "Custom template description.",
  is_built_in: false,
  html_template: "<div class='resume'>{{.FullName}}</div>",
  css_styles: ".resume { color: #111827; }",
  markdown_template: "# {{.FullName}}",
  text_template: "{{.FullName}}",
  created_at: "2026-02-01T00:00:00Z",
  updated_at: "2026-02-01T00:00:00Z",
};

vi.mock("@/api/client", () => ({
  api: {
    GET: vi.fn((_path: string, options?: { params?: { path?: { id?: string } } }) => {
      const id = options?.params?.path?.id;
      if (id === "builtin-standard-clean") {
        return Promise.resolve({ data: mockBuiltIn, error: null, response: { status: 200 } });
      }
      if (id === "tmpl-custom-1") {
        return Promise.resolve({ data: mockCustom, error: null, response: { status: 200 } });
      }
      return Promise.resolve({ data: null, error: { error: { message: "Not found" } }, response: { status: 404 } });
    }),
    POST: vi.fn((_path: string, options?: { body?: Record<string, unknown> }) => {
      const body = options?.body || {};
      return Promise.resolve({
        data: {
          id: "tmpl-new-created",
          user_id: "user-test",
          name: (body.name as string) || "New Template",
          html_template: (body.html_template as string) || "",
          markdown_template: (body.markdown_template as string) || "",
          text_template: (body.text_template as string) || "",
          ...body,
        },
        error: null,
        response: { status: 201 },
      });
    }),
    PUT: vi.fn((_path: string, options?: { body?: Record<string, unknown> }) => {
      const body = options?.body || {};
      return Promise.resolve({
        data: {
          id: "tmpl-custom-1",
          user_id: "user-test",
          name: (body.name as string) || "Custom Draft",
          html_template: (body.html_template as string) || "",
          markdown_template: (body.markdown_template as string) || "",
          text_template: (body.text_template as string) || "",
          ...body,
        },
        error: null,
        response: { status: 200 },
      });
    }),
  },
}));

function renderEditor(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/templates" element={<div>Templates Catalog</div>} />
          <Route path="/templates/:id" element={<TemplateEditorPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("TemplateEditorPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders new template builder with accessible form controls and sandboxed live preview", async () => {
    renderEditor("/templates/new");

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /create template set/i,
      })
    ).toBeInTheDocument();

    // Template Name input
    const nameInput = screen.getByLabelText(/template name/i);
    expect(nameInput).toBeInTheDocument();

    // Verify split screen layout: editor tabs and preview pane
    expect(screen.getByRole("tab", { name: /html/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /css/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /markdown/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /plain text/i })).toBeInTheDocument();

    // Sandboxed preview iframe
    const iframe = screen.getByTitle(/template preview/i);
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("sandbox");
    expect(iframe.getAttribute("sandbox")).not.toContain("allow-scripts");
    expect(iframe).toHaveAttribute("srcdoc");
  });

  it("enforces immutability: displays warning and disables saving for built-in templates", async () => {
    renderEditor("/templates/builtin-standard-clean");

    await screen.findByDisplayValue("Standard Clean");

    // Immutability warning
    expect(
      screen.getByText(/built-in templates are immutable and cannot be modified/i)
    ).toBeInTheDocument();

    // Save button must be disabled
    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    expect(saveBtn).toBeDisabled();

    // "Duplicate as Custom" action must be available
    const duplicateBtn = screen.getByRole("button", {
      name: /duplicate as custom/i,
    });
    expect(duplicateBtn).toBeInTheDocument();
    expect(duplicateBtn).not.toBeDisabled();
  });

  it("detects syntax error diagnostics in real-time when invalid Go template syntax is entered", async () => {
    renderEditor("/templates/new");

    const htmlEditor = await screen.findByLabelText(/html template code/i);
    fireEvent.change(htmlEditor, {
      target: { value: "<div>{{if .Name}}Unclosed condition" },
    });

    // Diagnostic alert banner
    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/unclosed/i);
    });
  });

  it("creates a new custom template set successfully", async () => {
    const user = userEvent.setup();
    renderEditor("/templates/new");

    const nameInput = await screen.findByLabelText(/template name/i);
    await user.type(nameInput, "Brand New Executive Template");

    const htmlEditor = screen.getByLabelText(/html template code/i);
    await user.clear(htmlEditor);
    await user.type(htmlEditor, "<h1>{{.FullName}}</h1>");

    const saveBtn = screen.getByRole("button", { name: /save template/i });
    expect(saveBtn).not.toBeDisabled();
    await user.click(saveBtn);

    // Navigates back or shows success
    await waitFor(() => {
      expect(screen.getByText("Templates Catalog")).toBeInTheDocument();
    });
  });

  it("updates an existing custom template via PUT /api/v1/templates/:id", async () => {
    const user = userEvent.setup();
    renderEditor("/templates/tmpl-custom-1");

    const nameInput = await screen.findByDisplayValue("Custom Draft");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Custom Draft");

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    expect(saveBtn).not.toBeDisabled();
    await user.click(saveBtn);

    await waitFor(() => {
      expect(api.PUT).toHaveBeenCalledWith(
        "/templates/{id}",
        expect.objectContaining({
          params: { path: { id: "tmpl-custom-1" } },
          body: expect.objectContaining({
            name: "Updated Custom Draft",
          }),
        })
      );
      expect(screen.getByText("Templates Catalog")).toBeInTheDocument();
    });
  });

  it("passes automated axe accessibility audit with 0 violations", async () => {
    const { container } = renderEditor("/templates/new");
    await screen.findByRole("heading", {
      level: 1,
      name: /create template set/i,
    });

    const results = await axe(container, { iframes: false });
    expect(results).toHaveNoViolations();
  });
});
