import * as React from "react";
import { cn } from "@/lib/utils";
import { shortenId } from "@/lib/identifier";

/**
 * Props for the ShortIdBadge component.
 */
export interface ShortIdBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  /** Canonical full UUID of the entity */
  id: string;
  /** Optional explicit persisted short identifier */
  shortId?: string;
  /** Optional container class name */
  className?: string;
}

/**
 * Accessible compact entity identifier badge displaying the short identifier alongside
 * full UUID information for prompt token transparency (Issue #84, WCAG 2.1 AA).
 *
 * Provides screen-reader accessible labels with both the short identifier and full UUID,
 * as well as a native browser title tooltip for hover inspection.
 *
 * @param props - ShortIdBadgeProps including canonical id and optional shortId.
 * @returns Accessible inline badge element.
 */
export const ShortIdBadge: React.FC<ShortIdBadgeProps> = ({
  id,
  shortId,
  className,
  ...props
}) => {
  const effective =
    shortId && shortId.trim() !== "" ? shortId.trim() : shortenId(id);
  const accessibleLabel = `Short ID ${effective}, full UUID ${id}`;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-medium text-slate-700 shadow-sm",
        className
      )}
      title={accessibleLabel}
      aria-label={accessibleLabel}
      {...props}
    >
      <span aria-hidden="true">#</span>
      <span>{effective}</span>
    </span>
  );
};
