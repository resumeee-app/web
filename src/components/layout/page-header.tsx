import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Properties for the {@link PageHeader} component.
 */
export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Primary page title rendered within an `<h1>` element.
   */
  title: string;
  /**
   * Optional descriptive subtitle displayed directly beneath the primary title.
   */
  description?: React.ReactNode;
  /**
   * Optional Lucide icon component rendered inside a standardized badge to the left of the title.
   */
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  /**
   * Optional status badge or indicator displayed alongside the title.
   */
  badge?: React.ReactNode;
  /**
   * Optional primary action buttons or interactive controls rendered in the right-aligned container.
   */
  actions?: React.ReactNode;
  /**
   * Optional children rendered in the right-aligned actions slot when provided as JSX children.
   */
  children?: React.ReactNode;
  /**
   * Optional toggle to render the bottom dividing border. Defaults to `true`.
   */
  bordered?: boolean;
}

/**
 * Standardized top-level page header component ensuring uniform typography,
 * icon badge rendering, subtitle spacing, and action button alignment across routes.
 *
 * @param props - Component configuration defined in {@link PageHeaderProps}.
 * @returns JSX element rendering the unified page header landmark.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon: Icon,
  badge,
  actions,
  children,
  bordered = true,
  className,
  ...props
}) => {
  const actionContent = actions || children;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        bordered && "border-b border-slate-200 dark:border-slate-800 pb-5",
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div
            data-testid="page-header-icon"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 ring-1 ring-inset ring-indigo-500/10 dark:ring-indigo-400/20"
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              {description}
            </p>
          )}
        </div>
      </div>

      {actionContent && (
        <div
          role="group"
          aria-label="Page actions"
          data-testid="page-header-actions"
          className="flex flex-wrap items-center sm:justify-end gap-3 sm:mt-0.5"
        >
          {actionContent}
        </div>
      )}
    </div>
  );
};
