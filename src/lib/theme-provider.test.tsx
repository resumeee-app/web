import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "./theme-provider";

function ThemeConsumer() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <button onClick={() => setTheme("light")}>Set Light</button>
      <button onClick={() => setTheme("dark")}>Set Dark</button>
      <button onClick={() => setTheme("system")}>Set System</button>
    </div>
  );
}

describe("ThemeProvider and useTheme", () => {
  let mediaQueryListeners: Array<(e: { matches: boolean }) => void> = [];
  let matchesDark = false;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    mediaQueryListeners = [];
    matchesDark = false;

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("dark") ? matchesDark : false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn((event: string, callback: (e: { matches: boolean }) => void) => {
        if (event === "change") {
          mediaQueryListeners.push(callback);
        }
      }),
      removeEventListener: vi.fn((_event: string, callback: (e: { matches: boolean }) => void) => {
        mediaQueryListeners = mediaQueryListeners.filter((cb) => cb !== callback);
      }),
      dispatchEvent: vi.fn(),
    }));
  });

  it("defaults to system theme and respects light system preference", () => {
    matchesDark = false;
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current-theme").textContent).toBe("system");
    expect(screen.getByTestId("resolved-theme").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("defaults to system theme and respects dark system preference", () => {
    matchesDark = true;
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current-theme").textContent).toBe("system");
    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("restores previously stored theme from localStorage", () => {
    localStorage.setItem("resumeee-theme", "dark");
    render(
      <ThemeProvider storageKey="resumeee-theme">
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current-theme").textContent).toBe("dark");
    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("switches to dark theme on demand and updates localStorage and document class", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider storageKey="resumeee-theme">
        <ThemeConsumer />
      </ThemeProvider>
    );

    await user.click(screen.getByRole("button", { name: "Set Dark" }));

    expect(screen.getByTestId("current-theme").textContent).toBe("dark");
    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("resumeee-theme")).toBe("dark");
  });

  it("switches to light theme on demand and removes dark class", async () => {
    const user = userEvent.setup();
    localStorage.setItem("resumeee-theme", "dark");
    render(
      <ThemeProvider storageKey="resumeee-theme">
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await user.click(screen.getByRole("button", { name: "Set Light" }));

    expect(screen.getByTestId("current-theme").textContent).toBe("light");
    expect(screen.getByTestId("resolved-theme").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("resumeee-theme")).toBe("light");
  });

  it("dynamically reacts to system color scheme changes when system theme is active", () => {
    matchesDark = false;
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("dark")).toBe(false);

    // Simulate system preference change to dark
    act(() => {
      matchesDark = true;
      for (const listener of mediaQueryListeners) {
        listener({ matches: true });
      }
    });

    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("throws descriptive error when useTheme is used outside of ThemeProvider", () => {
    // Suppress console.error for expected thrown error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ThemeConsumer />)).toThrow(
      "useTheme must be used within a ThemeProvider"
    );
    spy.mockRestore();
  });
});
