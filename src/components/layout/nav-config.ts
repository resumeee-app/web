import type React from "react";
import { LayoutDashboard, User, GitBranch, Layers, Sliders } from "lucide-react";

/**
 * Data-driven representation of a primary application navigation destination.
 */
export interface NavItem {
  /**
   * User-facing label displayed in navigation menus and screen readers.
   */
  title: string;
  /**
   * Application route path (e.g., `'/'`, `'/profile'`).
   */
  href: string;
  /**
   * Optional Lucide icon component rendered alongside the navigation label.
   */
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}

/**
 * Central data-driven registry of main navigation routes.
 *
 * @remarks
 * Other feature branches can append routes to this single array
 * as one-line changes without altering layout components.
 */
export const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Master Profile",
    href: "/profile",
    icon: User,
  },
  {
    title: "Branches",
    href: "/branches",
    icon: GitBranch,
  },
  {
    title: "Templates",
    href: "/templates",
    icon: Layers,
  },
  {
    title: "Presets",
    href: "/presets",
    icon: Sliders,
  },
];
