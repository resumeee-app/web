import * as React from "react";
import { cn } from "@/lib/utils";

export interface ResumeeeLogoProps extends React.SVGProps<SVGSVGElement> {
  /**
   * Additional CSS classes for sizing and placement.
   */
  className?: string;
}

/**
 * Brand SVG emblem for the Resumeee application (Git-Branching Monogram R).
 *
 * @remarks
 * Visual Metaphor:
 * - A geometric letter "R" built from a Git commit trunk (Master Career Graph)
 *   that loops through a canonical profile cycle and forks into three parallel
 *   resume branches (mirroring the three "e"s in "Resumeee").
 */
export const ResumeeeLogo: React.FC<ResumeeeLogoProps> = ({
  className,
  ...props
}) => {
  const id = React.useId();
  const bgId = `${id}-gt-bg`;
  const trunkId = `${id}-gt-trunk`;
  const loopId = `${id}-gt-loop`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn("h-7 w-7 shrink-0", className)}
      {...props}
    >
      <defs>
        <linearGradient
          id={bgId}
          x1="4"
          y1="4"
          x2="60"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
        <linearGradient
          id={trunkId}
          x1="18"
          y1="14"
          x2="44"
          y2="50"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        <linearGradient
          id={loopId}
          x1="18"
          y1="14"
          x2="46"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
      </defs>

      {/* Dark Developer-First Squircle */}
      <rect x="4" y="4" width="56" height="56" rx="14" fill={`url(#${bgId})`} />
      <rect
        x="4.75"
        y="4.75"
        width="54.5"
        height="54.5"
        rx="13.25"
        stroke="#6366F1"
        strokeOpacity="0.4"
        strokeWidth="1.5"
      />

      {/* Upper Loop of the "R" (Master Profile Cycle) */}
      <path
        d="M18 16H34C39.5228 16 44 20.4772 44 26C44 31.5228 39.5228 36 34 36H18"
        stroke={`url(#${loopId})`}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Three Forking Branch Legs of the "R" ("e-e-e" Variants) */}
      <path
        d="M31 36C36 36 41 40 48 44"
        stroke="#38BDF8"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M27 36C33 38 38 44 44 50"
        stroke="#818CF8"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M23 36C28 40 31 46 35 52"
        stroke="#C084FC"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Main Vertical Trunk Spine (Master Career Graph) */}
      <line
        x1="18"
        y1="16"
        x2="18"
        y2="50"
        stroke={`url(#${trunkId})`}
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Git Commit Nodes */}
      <circle
        cx="18"
        cy="16"
        r="4.5"
        fill="#0F172A"
        stroke="#38BDF8"
        strokeWidth="3"
      />
      <circle
        cx="18"
        cy="36"
        r="4.5"
        fill="#0F172A"
        stroke="#818CF8"
        strokeWidth="3"
      />
      <circle
        cx="18"
        cy="50"
        r="4"
        fill="#0F172A"
        stroke="#A855F7"
        strokeWidth="2.75"
      />

      {/* Three Tailored Branch Head Nodes */}
      <circle cx="48" cy="44" r="3.5" fill="#38BDF8" />
      <circle cx="44" cy="50" r="3.5" fill="#818CF8" />
      <circle cx="35" cy="52" r="3.5" fill="#C084FC" />
    </svg>
  );
};
