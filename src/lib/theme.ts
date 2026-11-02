/**
 * Supported user-selectable theme modes.
 * - `light`: Enforces light color scheme.
 * - `dark`: Enforces dark color scheme.
 * - `system`: Dynamically tracks operating system preference via `prefers-color-scheme`.
 */
export type Theme = "light" | "dark" | "system";

/**
 * Concrete resolved theme applied to the document DOM (either 'light' or 'dark').
 */
export type ResolvedTheme = "light" | "dark";

/**
 * Default localStorage key used for persisting theme choice across browsing sessions.
 */
export const DEFAULT_THEME_STORAGE_KEY = "resumeee-theme";

/**
 * Evaluates the current system color scheme preference.
 *
 * @returns The resolved theme string ('dark' if system prefers dark mode, otherwise 'light').
 * @remarks Safe for headless / SSR execution where `window` is undefined.
 */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Toggles the `.dark` CSS class on `document.documentElement` (`<html>` tag).
 *
 * @param resolvedTheme - Concrete theme mode to apply ('light' or 'dark').
 * @remarks Enables Tailwind's `class`-based dark mode selector to cascade throughout the DOM.
 */
export function applyThemeClass(resolvedTheme: ResolvedTheme): void {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  if (resolvedTheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}
