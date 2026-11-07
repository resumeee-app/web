import * as React from "react";
import { Outlet } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "./header";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { QUOTA_QUERY_KEY } from "@/api/quota-queries";

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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Header />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 focus:outline-none"
      >
        <Outlet />
      </main>
      <footer
        role="contentinfo"
        className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Resumeee. Pure Client-Side SPA Architecture.</p>
        </div>
      </footer>
      <Toaster />
    </div>
  );
};
