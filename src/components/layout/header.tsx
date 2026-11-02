import * as React from "react";
import { Link, NavLink } from "react-router-dom";
import { FileText, Menu, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { SkipLink } from "./skip-link";
import { ThemeToggle } from "./theme-toggle";
import { mainNavItems } from "./nav-config";
import { Button } from "@/components/ui/button";

/**
 * Primary application header and navigation shell.
 *
 * @remarks
 * Architecture & Accessibility:
 * - Serves as the primary `banner` landmark region (`<header>`).
 * - Mounts the accessible {@link SkipLink} at the root of the header hierarchy.
 * - Provides desktop `<nav aria-label="Main Navigation">` rendering data-driven routes
 *   with accessible `aria-current="page"` indicators for the active route.
 * - Embeds the {@link ThemeToggle} dropdown.
 * - On mobile viewports, provides an accessible hamburger button launching a slide-out
 *   drawer powered by `@radix-ui/react-dialog` with focus trapping, backdrop dismiss,
 *   and Escape key cancellation.
 *
 * @returns JSX Element rendering the application header shell.
 */
export const Header: React.FC = () => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 transition-colors">
      <SkipLink targetId="main-content" />

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-8">
          <Link
            to="/"
            className="flex items-center space-x-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
            aria-label="Resumeee Home"
          >
            <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span>Resumeee</span>
          </Link>

          {/* Desktop Navigation */}
          <nav
            aria-label="Main Navigation"
            className="hidden md:flex md:space-x-1 lg:space-x-2"
          >
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.href === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center space-x-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                      isActive
                        ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
                    )
                  }
                >
                  {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                  <span>{item.title}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <ThemeToggle />

          {/* Mobile Navigation Trigger */}
          <div className="md:hidden">
            <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
              <DialogPrimitive.Trigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open navigation menu"
                  className="h-9 w-9 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">Open navigation menu</span>
                </Button>
              </DialogPrimitive.Trigger>

              <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content
                  className="fixed inset-y-0 left-0 z-50 flex w-3/4 max-w-xs flex-col border-r border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950 transition-transform duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                    <DialogPrimitive.Title className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                      Navigation
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Close asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Close navigation menu"
                        className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Close navigation menu</span>
                      </Button>
                    </DialogPrimitive.Close>
                  </div>

                  <nav
                    aria-label="Mobile Navigation"
                    className="flex flex-col space-y-1.5 mt-6"
                  >
                    {mainNavItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.href}
                          to={item.href}
                          end={item.href === "/"}
                          onClick={() => setMobileOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center space-x-3 px-3 py-2.5 text-base font-medium rounded-md transition-colors",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                              isActive
                                ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
                            )
                          }
                        >
                          {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
                          <span>{item.title}</span>
                        </NavLink>
                      );
                    })}
                  </nav>
                </DialogPrimitive.Content>
              </DialogPrimitive.Portal>
            </DialogPrimitive.Root>
          </div>
        </div>
      </div>
    </header>
  );
};
