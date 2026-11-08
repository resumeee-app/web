import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HomePage } from "@/pages/home-page";
import { ProfilePage } from "@/pages/profile-page";
import { BranchesPage } from "@/pages/branches-page";
import { TemplatesPage } from "@/pages/templates-page";
import { PresetsPage } from "@/pages/presets-page";
import { api } from "@/api/client";

function renderWithProviders(ui: React.ReactElement, initialRoute = "/") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Page Header Cross-Route Consistency", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(api, "GET").mockImplementation(async (path: string) => {
      if (path === "/api/profile/full") {
        return {
          data: {
            profile: { id: "p1", full_name: "Test User", master_revision: 1 },
            experiences: [],
            skills: [],
            education: [],
            projects: [],
            certifications: [],
            facts: [],
            master_revision: 1,
          },
          error: undefined,
          response: new Response(),
        };
      }
      if (path === "/api/branches") {
        return {
          data: [
            {
              id: "b1",
              name: "Default Branch",
              template_set_id: "tmpl-1",
              is_default: true,
              active_version_id: "v1",
              status: "active",
            },
          ],
          error: undefined,
          response: new Response(),
        };
      }
      if (path === "/api/templates") {
        return {
          data: [
            {
              id: "tmpl-1",
              name: "Clean ATS",
              is_built_in: true,
            },
          ],
          error: undefined,
          response: new Response(),
        };
      }
      if (path === "/api/presets") {
        return {
          data: [
            {
              id: "pre-1",
              name: "Executive Strategy",
              is_built_in: true,
            },
          ],
          error: undefined,
          response: new Response(),
        };
      }
      return { data: [], error: undefined, response: new Response() };
    });
  });

  const testCases = [
    { name: "Dashboard", component: <HomePage />, route: "/" },
    { name: "Master Profile", component: <ProfilePage />, route: "/profile" },
    { name: "Branches", component: <BranchesPage />, route: "/branches" },
    { name: "Templates", component: <TemplatesPage />, route: "/templates" },
    { name: "Presets", component: <PresetsPage />, route: "/presets" },
  ];

  testCases.forEach(({ name, component, route }) => {
    describe(`${name} Header`, () => {
      it("renders h1 with standardized typography classes", async () => {
        renderWithProviders(component, route);

        const heading = await screen.findByRole("heading", { level: 1 });
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveClass(
          "text-2xl",
          "sm:text-3xl",
          "font-bold",
          "tracking-tight",
          "text-slate-900",
          "dark:text-slate-100"
        );
      });

      it("renders standardized icon badge", async () => {
        renderWithProviders(component, route);

        const iconBadge = await screen.findByTestId("page-header-icon");
        expect(iconBadge).toBeInTheDocument();
        expect(iconBadge).toHaveClass(
          "h-10",
          "w-10",
          "rounded-lg",
          "bg-indigo-50",
          "dark:bg-indigo-950/60"
        );
      });

      it("renders action button container with consistent layout", async () => {
        renderWithProviders(component, route);

        const actions = await screen.findByTestId("page-header-actions");
        expect(actions).toBeInTheDocument();
        expect(actions).toHaveClass("flex", "items-center", "gap-3", "shrink-0");
      });
    });
  });
});
