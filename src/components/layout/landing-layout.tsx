import * as React from "react";
import { SkipLink } from "./skip-link";
import { ThemeToggle } from "./theme-toggle";
import { BrandWordmark, PublicFooter, PublicNav } from "./public-shell-parts";

/**
 * Props accepted by {@link LandingLayout}.
 */
export interface LandingLayoutProps {
  /**
   * Landing page content rendered inside the primary `<main>` landmark.
   */
  children: React.ReactNode;
}

/**
 * Minimal standalone layout shell for the landing-only build.
 *
 * @remarks
 * Provides the persistent `banner`, `Public Navigation`, `main#main-content`,
 * `ThemeToggle`, and `contentinfo` landmarks without importing router, auth,
 * or API client dependencies.
 *
 * @param props - Component props as defined by {@link LandingLayoutProps}.
 * @returns JSX Element wrapping the standalone landing page.
 */
export const LandingLayout: React.FC<LandingLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 transition-colors">
        <SkipLink targetId="main-content" />

        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center shrink-0">
              <a
                href="#hero"
                className="flex items-center space-x-1.5 sm:space-x-2 lg:space-x-2.5 text-lg lg:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
                aria-label="Resumeee Home"
              >
                <BrandWordmark />
              </a>
            </div>

            <PublicNav />

            <div className="flex items-center space-x-1 sm:space-x-1.5 lg:space-x-3 shrink-0">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 focus:outline-none"
      >
        {children}
      </main>

      <PublicFooter />
    </div>
  );
};
