import * as React from "react";
import { ResumeeeLogo } from "./resumeee-logo";

/**
 * Navigation item descriptor for public landing routes.
 */
export interface PublicNavLink {
  label: string;
  href: string;
  external?: boolean;
}

/**
 * Shared public navigation links rendered on landing views.
 */
export const PUBLIC_NAV_LINKS: PublicNavLink[] = [
  { label: "Features", href: "#features" },
  { label: "Open Source", href: "#open-source" },
  { label: "FAQ", href: "#faq" },
  { label: "GitHub", href: "https://github.com/resumeee-app/resumeee", external: true },
];

/**
 * Brand logo emblem and gradient wordmark used across header shells.
 *
 * @returns JSX Element rendering the Resumeee emblem and wordmark.
 */
export const BrandWordmark: React.FC = () => (
  <>
    <ResumeeeLogo className="h-6 w-6 lg:h-7 lg:w-7" />
    <span>
      Resum
      <span className="bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 dark:from-sky-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
        eee
      </span>
    </span>
  </>
);

/**
 * Shared desktop navigation bar for public landing routes.
 *
 * @returns JSX Element rendering the public section anchor and GitHub links.
 */
export const PublicNav: React.FC = () => (
  <div className="hidden md:flex flex-1 items-center justify-center min-[1600px]:justify-start min-w-0 px-1 sm:px-2 lg:px-4">
    <nav
      aria-label="Public Navigation"
      className="flex items-center space-x-1 lg:space-x-3 text-xs lg:text-sm font-medium text-slate-700 dark:text-slate-300 min-[1600px]:ml-[calc((100vw-80rem)/2-137px)]"
    >
      {PUBLIC_NAV_LINKS.map((item) => (
        <a
          key={item.href}
          href={item.href}
          {...(item.external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
          className="px-2 py-1.5 rounded-md hover:text-slate-900 hover:bg-slate-50 dark:hover:text-slate-100 dark:hover:bg-slate-800/60 transition-colors"
        >
          {item.label}
        </a>
      ))}
    </nav>
  </div>
);

/**
 * Shared semantic page footer displaying copyright and AGPL-3.0 open-source links.
 *
 * @returns JSX Element rendering the application footer landmark.
 */
export const PublicFooter: React.FC = () => (
  <footer
    role="contentinfo"
    className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 py-6 text-center text-sm text-slate-500 dark:text-slate-300"
  >
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-1.5">
      <p>© {new Date().getFullYear()} Resumeee — One Resume to rule them all.</p>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Open source under the AGPL-3.0 License •{" "}
        <a
          href="https://github.com/resumeee-app/resumeee"
          target="_blank"
          rel="noreferrer noopener"
          className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 underline underline-offset-2"
        >
          GitHub Repository
        </a>
      </p>
    </div>
  </footer>
);
