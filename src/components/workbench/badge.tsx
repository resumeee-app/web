import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Props for the Badge component.
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Visual and semantic variant defining badge color token and intent.
   * - `default`: Indigo brand accent.
   * - `secondary`: Neutral slate background.
   * - `outline`: Bordered white badge with subtle shadow.
   * - `success`: Emerald green indicator for completed states.
   * - `warning`: Amber yellow indicator for warnings or stale states.
   * - `destructive`: Rose red indicator for failure or critical issues.
   * - `info`: Sky blue indicator for active version status.
   */
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "success"
    | "warning"
    | "destructive"
    | "info";
}

const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default:
    "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-700/10",
  secondary:
    "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-600/10",
  outline:
    "bg-white text-slate-700 border border-slate-200 shadow-sm",
  success:
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  warning:
    "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
  destructive:
    "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
  info:
    "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
};

/**
 * Badge renders an accessible, high-contrast inline badge or pill tag
 * used across the Resumeee UI for statuses, importance indicators, and metadata.
 *
 * Architectural Role:
 * - Reusable UI primitive supporting standard status vocabularies.
 *
 * Accessibility / WAI-ARIA Considerations:
 * - Meets WCAG 2.1 AA 4.5:1 text-to-background contrast across all variants.
 * - Conveys visual state alongside clear textual labels for assistive technologies.
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
          variantStyles[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";
