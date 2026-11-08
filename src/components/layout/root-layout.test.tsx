import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "vitest-axe";
import { RootLayout } from "./root-layout";
import { ThemeProvider } from "@/lib/theme-provider";
import { AuthProvider } from "@/context/auth-context";

function renderRootLayout(initialRoute = "/", customQueryClient?: QueryClient) {
  const queryClient =
    customQueryClient ||
    new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/" element={<RootLayout />}>
              <Route index element={<h1>Test Dashboard</h1>} />
              <Route path="profile" element={<h1>Main Profile</h1>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe("RootLayout Landmark Structure", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("renders all required landmark regions (header, nav, main, footer)", () => {
    renderRootLayout();

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main Navigation" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveTextContent(/One Resume to rule them all\./i);
    expect(footer).toHaveTextContent(/MIT License/i);
    const githubLink = within(footer).getByRole("link", { name: /github repository/i });
    expect(githubLink).toHaveAttribute("href", "https://github.com/rrivera/resumeee");
    expect(footer).not.toHaveTextContent(/Pure Client-Side SPA Architecture/i);
  });

  it("renders skip link pointing to main content", () => {
    renderRootLayout();

    const skipLink = screen.getByRole("link", { name: /skip to main content/i });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  it("passes automated axe accessibility check", async () => {
    const { container } = renderRootLayout();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("handles resumeee:quota-exceeded event by displaying toast and invalidating quota query", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    renderRootLayout("/", queryClient);

    act(() => {
      window.dispatchEvent(new CustomEvent("resumeee:quota-exceeded"));
    });

    await waitFor(() => {
      expect(screen.getByText("LLM Quota Exceeded")).toBeInTheDocument();
      expect(
        screen.getByText(
          /you have reached your daily request or monthly token limit for llm operations/i
        )
      ).toBeInTheDocument();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["quota"] });
  });

  it("renders header without navigation and displays login page when unauthenticated in non-admin mode on protected routes", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider initialUser={null} initialAdminMode={false}>
          <ThemeProvider>
            <MemoryRouter initialEntries={["/profile"]}>
              <Routes>
                <Route path="/" element={<RootLayout />}>
                  <Route path="profile" element={<h1>Test Dashboard</h1>} />
                </Route>
              </Routes>
            </MemoryRouter>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    );

    // Header checks
    const banner = screen.getByRole("banner");
    expect(banner).toBeInTheDocument();
    expect(within(banner).getByRole("link", { name: "Resumeee Home" })).toBeInTheDocument();
    expect(within(banner).getByRole("button", { name: /theme/i })).toBeInTheDocument();
    expect(within(banner).queryByRole("navigation", { name: "Main Navigation" })).not.toBeInTheDocument();
    expect(within(banner).queryByText(/quota/i)).not.toBeInTheDocument();
    expect(within(banner).queryByLabelText(/quota/i)).not.toBeInTheDocument();

    // Login page displayed in main
    expect(screen.getByRole("heading", { name: /sign in to resumeee/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Test Dashboard" })).not.toBeInTheDocument();
  });

  it("renders public routes like /landing through outlet when unauthenticated", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider initialUser={null} initialAdminMode={false}>
          <ThemeProvider>
            <MemoryRouter initialEntries={["/landing"]}>
              <Routes>
                <Route path="/" element={<RootLayout />}>
                  <Route path="landing" element={<h1>Public Landing Route</h1>} />
                </Route>
              </Routes>
            </MemoryRouter>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(screen.getByRole("heading", { name: "Public Landing Route" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /sign in to resumeee/i })).not.toBeInTheDocument();
  });

  it("normalizes trailing slashes on public routes (e.g. /landing/) so it renders public route", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider initialUser={null} initialAdminMode={false}>
          <ThemeProvider>
            <MemoryRouter initialEntries={["/landing/"]}>
              <Routes>
                <Route path="/" element={<RootLayout />}>
                  <Route path="landing" element={<h1>Public Landing Route With Trailing Slash</h1>} />
                </Route>
              </Routes>
            </MemoryRouter>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(screen.getByRole("heading", { name: "Public Landing Route With Trailing Slash" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /sign in to resumeee/i })).not.toBeInTheDocument();
  });
});
