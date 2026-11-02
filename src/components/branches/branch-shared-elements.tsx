import React from "react";
import { ShieldCheck, Sparkles, AlertCircle } from "lucide-react";
import type { BranchStatus } from "@/api/branch-queries";

/**
 * Formats an ISO 8601 date string into a localized human-readable format (e.g. "Nov 1, 2026").
 * Returns "Recently" if the timestamp is missing, empty, or unparseable.
 *
 * @param {string} [dateString] Optional ISO timestamp string.
 * @returns {string} Human-readable formatted date or fallback string.
 */
export function formatBranchDate(dateString?: string): string {
  if (!dateString) {
    return "Recently";
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "Recently";
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Formats target company and role into a standardized single-line string.
 *
 * @param {string | null | undefined} company Target company name.
 * @param {string | null | undefined} role Target role title.
 * @param {string} [fallback="Untargeted"] Fallback string when both are missing.
 * @returns {string} Formatted company and role string.
 */
export function formatBranchTarget(
  company?: string | null,
  role?: string | null,
  fallback = "Untargeted"
): string {
  if (company && role) {
    return `${company} • ${role}`;
  }
  if (company) {
    return company;
  }
  if (role) {
    return role;
  }
  return fallback;
}

/**
 * Props for the DefaultBranchBadge component.
 */
export interface DefaultBranchBadgeProps {
  /**
   * Icon size variant. 'md' renders h-3.5 w-3.5 (standard card size),
   * 'sm' renders h-3 w-3 (compact table row size). Defaults to 'md'.
   */
  iconSize?: "sm" | "md";
}

/**
 * Visual badge indicating the branch is the protected canonical Default Branch.
 *
 * @param {DefaultBranchBadgeProps} props Component properties.
 * @returns {JSX.Element} The rendered badge.
 */
export const DefaultBranchBadge: React.FC<DefaultBranchBadgeProps> = ({
  iconSize = "md",
}) => {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/20">
      <ShieldCheck
        className={iconSize === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"}
        aria-hidden="true"
      />
      Default Branch
    </span>
  );
};

/**
 * Props for the BranchStatusBadge component.
 */
export interface BranchStatusBadgeProps {
  /**
   * Operational or tailoring status of the branch.
   */
  status: BranchStatus;
}

/**
 * Renders an accessible, colored indicator badge corresponding to the branch lifecycle status:
 * - `active`: Emerald badge with dot indicator.
 * - `tailoring`: Amber badge with animated sparkles icon.
 * - `error`: Red badge with alert icon.
 *
 * @param {BranchStatusBadgeProps} props Component properties.
 * @returns {JSX.Element | null} The rendered status badge.
 */
export const BranchStatusBadge: React.FC<BranchStatusBadgeProps> = ({ status }) => {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
        Active
      </span>
    );
  }
  if (status === "tailoring") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
        <Sparkles className="h-3 w-3 animate-pulse text-amber-600" aria-hidden="true" />
        Tailoring
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
        <AlertCircle className="h-3 w-3 text-red-600" aria-hidden="true" />
        Error
      </span>
    );
  }
  return null;
};

/**
 * Props for the BranchTargetDisplay component.
 */
export interface BranchTargetDisplayProps {
  /**
   * Target company name, if specified.
   */
  targetCompany?: string | null;
  /**
   * Target role title, if specified.
   */
  targetRole?: string | null;
  /**
   * Fallback text when neither company nor role is provided.
   * Default: "Untargeted line".
   */
  emptyFallback?: string;
  /**
   * Class name for the company emphasis tag.
   * Default: "font-medium text-slate-700".
   */
  companyClassName?: string;
}

/**
 * Formats and renders the target company and role display line for a branch.
 *
 * @param {BranchTargetDisplayProps} props Component properties.
 * @returns {JSX.Element} The rendered target company and role markup.
 */
export const BranchTargetDisplay: React.FC<BranchTargetDisplayProps> = ({
  targetCompany,
  targetRole,
  emptyFallback = "Untargeted line",
  companyClassName = "font-medium text-slate-700",
}) => {
  if (targetCompany && targetRole) {
    return (
      <span>
        <strong className={companyClassName}>{targetCompany}</strong>
        {" • "}
        <span>{targetRole}</span>
      </span>
    );
  }
  if (targetCompany) {
    return <strong className={companyClassName}>{targetCompany}</strong>;
  }
  if (targetRole) {
    return <span>{targetRole}</span>;
  }
  return <span className="italic text-slate-400">{emptyFallback}</span>;
};
