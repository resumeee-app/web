import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Props accepted by the {@link SkipLink} accessibility component.
 */
export interface SkipLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /**
   * The DOM `id` of the primary content landmark element to bypass navigation towards.
   * Defaults to `"main-content"`.
   */
  targetId?: string;
}

/**
 * Accessible skip navigation link complying with WCAG 2.1 AA (Guideline 2.4.1 Bypass Blocks).
 *
 * @remarks
 * Renders visually hidden by default using Tailwind's `.sr-only` class. Becomes prominently
 * visible upon keyboard tab focus via `.focus:not-sr-only`, with high-contrast background
 * and prominent focus rings.
 *
 * @param props - Component properties conforming to {@link SkipLinkProps}.
 * @param ref - Forwarded HTMLAnchorElement ref.
 * @returns An accessible anchor linking to the target landmark ID.
 */
export const SkipLink = React.forwardRef<HTMLAnchorElement, SkipLinkProps>(
  (
    {
      targetId = "main-content",
      className,
      children = "Skip to main content",
      ...props
    },
    ref
  ) => {
    return (
      <a
        ref={ref}
        href={`#${targetId}`}
        className={cn(
          "sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50",
          "focus:rounded-md focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white",
          "focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
          "transition-all duration-150",
          className
        )}
        {...props}
      >
        {children}
      </a>
    );
  }
);

SkipLink.displayName = "SkipLink";
