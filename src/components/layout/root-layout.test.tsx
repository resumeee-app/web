import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "vitest-axe";
import { RootLayout } from "./root-layout";
import { ThemeProvider } from "@/lib/theme-provider";

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
              <Route path="profile" element={<h1>Master Profile</h1>} />
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
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
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
});
