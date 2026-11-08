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
 * - A geometric letter "R" built from a Git commit trunk (Main Career Graph)
 *   that loops through a canonical profile cycle and forks into three parallel
 *   resume branches (mirroring the three "e"s in "Resumeee").
 * - Features adaptive dual-theme background styling:
 *   - Dark theme: Dark developer-first squircle (#0F172A -> #1E1B4B) with Indigo border (#6366F1).
 *   - Light theme: Clean slate/white squircle (#FFFFFF -> #F1F5F9) with Slate border (#CBD5E1).
 */
export const ResumeeeLogo: React.FC<ResumeeeLogoProps> = ({
  className,
  ...props
}) => {
  const id = React.useId();
  const bgDarkId = `${id}-gt-bg-dark`;
  const bgLightId = `${id}-gt-bg-light`;
  const trunkDarkId = `${id}-gt-trunk-dark`;
  const trunkLightId = `${id}-gt-trunk-light`;
  const loopDarkId = `${id}-gt-loop-dark`;
  const loopLightId = `${id}-gt-loop-light`;

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
        {/* Dark Theme Gradients */}
        <linearGradient
          id={bgDarkId}
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
          id={trunkDarkId}
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
          id={loopDarkId}
          x1="18"
          y1="14"
          x2="46"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>

        {/* Light Theme Gradients */}
        <linearGradient
          id={bgLightId}
          x1="4"
          y1="4"
          x2="60"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F1F5F9" />
        </linearGradient>
        <linearGradient
          id={trunkLightId}
          x1="18"
          y1="14"
          x2="44"
          y2="50"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="50%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#9333EA" />
        </linearGradient>
        <linearGradient
          id={loopLightId}
          x1="18"
          y1="14"
          x2="46"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>

      {/* Light Theme Background Squircle & Border (visible when not in .dark) */}
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="14"
        fill={`url(#${bgLightId})`}
        className="dark:hidden"
      />
      <rect
        x="4.75"
        y="4.75"
        width="54.5"
        height="54.5"
        rx="13.25"
        stroke="#CBD5E1"
        strokeWidth="1.5"
        className="dark:hidden"
      />

      {/* Dark Theme Background Squircle & Border (visible when in .dark) */}
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="14"
        fill={`url(#${bgDarkId})`}
        className="hidden dark:block"
      />
      <rect
        x="4.75"
        y="4.75"
        width="54.5"
        height="54.5"
        rx="13.25"
        stroke="#6366F1"
        strokeOpacity="0.4"
        strokeWidth="1.5"
        className="hidden dark:block"
      />

      {/* Light Theme Glyph Foreground (Optimized Contrast for Light Surfaces) */}
      <g className="dark:hidden">
        {/* Upper Loop of the "R" */}
        <path
          d="M18 16H34C39.5228 16 44 20.4772 44 26C44 31.5228 39.5228 36 34 36H18"
          stroke={`url(#${loopLightId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Three Forking Branch Legs of the "R" */}
        <path
          d="M31 36C36 36 41 40 48 44"
          stroke="#0284C7"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M27 36C33 38 38 44 44 50"
          stroke="#4F46E5"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M23 36C28 40 31 46 35 52"
          stroke="#9333EA"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* Main Vertical Trunk Spine */}
        <line
          x1="18"
          y1="16"
          x2="18"
          y2="50"
          stroke={`url(#${trunkLightId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
        />

        {/* Git Commit Nodes */}
        <circle
          cx="18"
          cy="16"
          r="4.5"
          fill="#FFFFFF"
          stroke="#0284C7"
          strokeWidth="3"
        />
        <circle
          cx="18"
          cy="36"
          r="4.5"
          fill="#FFFFFF"
          stroke="#4F46E5"
          strokeWidth="3"
        />
        <circle
          cx="18"
          cy="50"
          r="4"
          fill="#FFFFFF"
          stroke="#9333EA"
          strokeWidth="2.75"
        />

        {/* Three Tailored Branch Head Nodes */}
        <circle cx="48" cy="44" r="3.5" fill="#0284C7" />
        <circle cx="44" cy="50" r="3.5" fill="#4F46E5" />
        <circle cx="35" cy="52" r="3.5" fill="#9333EA" />
      </g>

      {/* Dark Theme Glyph Foreground (High Vibrancy on Dark Surfaces) */}
      <g className="hidden dark:block">
        {/* Upper Loop of the "R" */}
        <path
          d="M18 16H34C39.5228 16 44 20.4772 44 26C44 31.5228 39.5228 36 34 36H18"
          stroke={`url(#${loopDarkId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Three Forking Branch Legs of the "R" */}
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

        {/* Main Vertical Trunk Spine */}
        <line
          x1="18"
          y1="16"
          x2="18"
          y2="50"
          stroke={`url(#${trunkDarkId})`}
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
      </g>
    </svg>
  );
};
