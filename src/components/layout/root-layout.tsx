import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, X } from "lucide-react";
import { Header } from "./header";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { QUOTA_QUERY_KEY } from "@/api/quota-queries";
import { useAuth } from "@/context/auth-context";
import { LoginPage } from "@/components/auth/login-page";

/**
 * Root application layout shell rendering standard landmark hierarchy.
 *
 * @remarks
 * Architecture & Landmark Hierarchy:
 * - `<header>`: Provided by {@link Header}, including skip link, logo, navigation, quota meter, and theme switcher.
 * - `<main id="main-content" tabIndex={-1}>`: Accessible target for bypass blocks, rendering active route via `<Outlet />`.
 * - `<footer role="contentinfo">`: Semantic page footer.
 * - `<Toaster />`: Mounts global toast notification container.
 * - Listens for global `resumeee:quota-exceeded` event (dispatched on HTTP 429) to trigger an accessible toast alert
 *   and invalidate cached quota queries.
 *
 * @returns JSX Element wrapping child routes with persistent shell landmarks.
 */
export const RootLayout: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, loading, adminMode, quotaExceededWarning, dismissQuotaWarning } = useAuth();

  React.useEffect(() => {
    const handleQuotaExceeded = () => {
      toast({
        variant: "destructive",
        title: "LLM Quota Exceeded",
        description:
          "You have reached your daily request or monthly token limit for LLM operations. Please try again after the window resets.",
      });
      void queryClient.invalidateQueries({ queryKey: QUOTA_QUERY_KEY });
    };

    window.addEventListener("resumeee:quota-exceeded", handleQuotaExceeded);
    return () => {
      window.removeEventListener("resumeee:quota-exceeded", handleQuotaExceeded);
    };
  }, [toast, queryClient]);

  const location = useLocation();
  const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";
  const isPublicRoute =
    normalizedPath === "/" ||
    normalizedPath === "/landing" ||
    normalizedPath === "/login";
  const showLogin = !adminMode && !user && !isPublicRoute;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Header />
      {quotaExceededWarning && (
        <div
          role="alert"
          aria-live="polite"
          className="bg-amber-500 text-white px-4 py-2.5 text-sm font-medium flex items-center justify-between"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>LLM Quota Exceeded: Operations are temporarily limited until the rolling window resets.</span>
          </div>
          <button
            type="button"
            onClick={dismissQuotaWarning}
            className="rounded p-1 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Dismiss quota alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 focus:outline-none"
      >
        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center text-slate-500 dark:text-slate-400">
            <p>Loading session...</p>
          </div>
        ) : showLogin ? (
          <LoginPage />
        ) : (
          <Outlet />
        )}
      </main>
      <footer
        role="contentinfo"
        className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-1.5">
          <p>© {new Date().getFullYear()} Resumeee — One Resume to rule them all.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Open source under the MIT License •{" "}
            <a
              href="https://github.com/rrivera/resumeee"
              target="_blank"
              rel="noreferrer noopener"
              className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 underline underline-offset-2"
            >
              GitHub Repository
            </a>
          </p>
        </div>
      </footer>
      <Toaster />
    </div>
  );
};
