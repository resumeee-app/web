import * as React from "react";
import {
  type Theme,
  type ResolvedTheme,
  DEFAULT_THEME_STORAGE_KEY,
  getSystemTheme,
  applyThemeClass,
} from "./theme";

/**
 * Props accepted by the {@link ThemeProvider} component.
 */
export interface ThemeProviderProps {
  /**
   * React component subtree that will have access to theme context.
   */
  children: React.ReactNode;
  /**
   * Default theme mode used on initial load if no preference is stored in localStorage.
   * Defaults to `"system"`.
   */
  defaultTheme?: Theme;
  /**
   * Storage key under which theme selection is persisted in `localStorage`.
   * Defaults to `"resumeee-theme"`.
   */
  storageKey?: string;
}

/**
 * Context value interface exposed by {@link useTheme}.
 */
export interface ThemeContextValue {
  /**
   * Active user-selected theme mode (`light`, `dark`, or `system`).
   */
  theme: Theme;
  /**
   * Actual resolved color scheme (`light` or `dark`), accounting for OS preference when `theme === 'system'`.
   */
  resolvedTheme: ResolvedTheme;
  /**
   * Updates the active theme mode and persists the choice to localStorage.
   */
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

/**
 * Context provider managing client-side theme state, localStorage synchronization,
 * and system preference observation.
 *
 * @remarks
 * Eliminates Flash of Unstyled Content (FOUC) when paired with the synchronous
 * `/theme-init.js` initialization script in `index.html`. Handles real-time OS theme switching via `matchMedia`.
 *
 * @param props - Component props as defined by {@link ThemeProviderProps}.
 * @returns JSX Element wrapping children with ThemeContext.
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = DEFAULT_THEME_STORAGE_KEY,
}: ThemeProviderProps): React.JSX.Element {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored === "light" || stored === "dark" || stored === "system") {
          return stored;
        }
      } catch {
        // Fallback if localStorage access fails (e.g. security policy)
      }
    }
    return defaultTheme;
  });

  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(() => getSystemTheme());

  // Listen to system theme media query changes
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent | { matches: boolean }) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    setSystemTheme(mediaQuery.matches ? "dark" : "light");

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else if (mediaQuery.addListener) {
      // Deprecated fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme;

  // Apply theme class to <html> element
  React.useEffect(() => {
    applyThemeClass(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = React.useCallback(
    (newTheme: Theme) => {
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch {
        // Safe catch for storage quota or restricted access
      }
      setThemeState(newTheme);
    },
    [storageKey]
  );

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Imperative hook to access and update the active application theme.
 *
 * @throws {Error} If called outside of a {@link ThemeProvider} subtree.
 * @returns An object containing `theme`, `resolvedTheme`, and `setTheme`.
 */
export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
