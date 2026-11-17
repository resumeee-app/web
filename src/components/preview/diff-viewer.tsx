/**
 * @file diff-viewer.tsx
 * @description Visual Tailored Diff Viewer component.
 *
 * Compares an active tailored branch version against either:
 * 1. The Main Career Profile snapshot (comparing tailored bullets to raw career facts and base skills).
 * 2. A historical previous version (v1, v2, etc.).
 *
 * Visual Highlighting & ATS Semantics:
 * - Green additions for tailored bullet points (`data-diff-type="addition"`).
 * - Struck-through deletions for omitted main career facts (`data-diff-type="deletion"`).
 * - Blue pill badges for targeted and prioritized skills (`data-skill-badge="highlighted"`).
 * - Side-by-side comparison for headline and professional summary.
 *
 * Accessibility / WAI-ARIA Considerations:
 * - Landmark: `<div role="region" aria-label="Tailored resume diff viewer">`.
 * - Explicit `<label htmlFor="...">` and `<select id="...">` pairing for baseline selection.
 * - Screen-reader only announcements (`sr-only`) prefixing added, omitted, and unchanged items
 *   to ensure screen-reader users perceive diff state without relying solely on color.
 * - WCAG 2.1 AA compliant contrast ratios and zero axe violations.
 */

import * as React from "react";
import { GitCompare, PlusCircle, MinusCircle, Sparkles, Check, Info } from "lucide-react";
import type { BranchVersion, MainProfileSnapshot } from "@/api/render-queries";

/**
 * Configuration props for the DiffViewer component.
 */
export interface DiffViewerProps {
  /** Active tailored branch version containing tailored_content to inspect */
  currentVersion?: BranchVersion;
  /** Full main profile snapshot used as the primary baseline for career facts */
  mainProfile?: MainProfileSnapshot | null;
  /** Array of all historical versions for the branch (to compare against prior versions) */
  previousVersions?: BranchVersion[];
  /** Optional additional CSS class names */
  className?: string;
}

/**
 * Helper extracting bullet text safely regardless of whether backend serialized as `bullets` or `bullet_points`.
 *
 * @param item - Raw bullet object or string
 * @returns Clean string text
 */
function extractBulletText(item: unknown): string {
  if (typeof item === "string") return item;
  if (typeof item === "object" && item !== null && "text" in item) {
    return String((item as { text?: unknown }).text ?? "");
  }
  return "";
}

/**
 * Safely extracts bullet points array from an experience entity regardless of
 * whether the backend serialized as `bullets` or `bullet_points`.
 *
 * @param exp - Experience entity containing bullet points or bullets
 * @returns Array of bullet point objects or strings
 */
function getExperienceBullets(exp: unknown): unknown[] {
  if (typeof exp !== "object" || exp === null) return [];
  const candidate = exp as { bullet_points?: unknown[]; bullets?: unknown[] };
  return candidate.bullet_points ?? candidate.bullets ?? [];
}

/**
 * DiffViewer component providing visual comparison between tailored versions and main profile.
 *
 * @param props - Component configuration props.
 * @returns Accessible visual diff viewer with additions, omissions, and skill highlights.
 */
export const DiffViewer: React.FC<DiffViewerProps> = ({
  currentVersion,
  mainProfile,
  previousVersions = [],
  className = "",
}) => {
  const [baselineId, setBaselineId] = React.useState<string>("main");

  const tailored = currentVersion?.tailored_content;

  if (!tailored) {
    return (
      <div
        role="region"
        aria-label="Tailored resume diff viewer"
        className={`flex flex-col items-center justify-center p-12 text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 dark:text-slate-300 ${className}`}
      >
        <GitCompare className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-3" aria-hidden="true" />
        <p className="text-base font-medium text-slate-700 dark:text-slate-300">
          No tailored content available for diff
        </p>
        <p className="text-sm mt-1">
          Generate or select a completed branch version to review tailored changes.
        </p>
      </div>
    );
  }

  // Other versions available for comparison (exclude current version)
  const candidateVersions = (previousVersions ?? []).filter(
    (v) => v && v.id !== currentVersion?.id && v.status === "completed" && v.tailored_content
  );

  const isComparingMain = baselineId === "main";
  const baselineVersion = candidateVersions.find((v) => v.id === baselineId);

  // Extract baseline headline & summary
  const baselineHeadline = isComparingMain
    ? mainProfile?.profile?.headline || ""
    : baselineVersion?.tailored_content?.headline || "";

  const baselineSummary = isComparingMain
    ? mainProfile?.profile?.summary || ""
    : baselineVersion?.tailored_content?.summary || "";

  // Defensively extract skill groups
  const skillGroups = tailored.skill_groups ?? [];

  // Defensively extract experiences
  const experiences = tailored.experiences ?? [];

  const isMainProjection =
    Boolean(typeof currentVersion?.id === "string" && currentVersion.id.startsWith("ver-default-")) ||
    (currentVersion as { source_type?: string })?.source_type === "main_profile";

  return (
    <div
      role="region"
      aria-label="Tailored resume diff viewer"
      className={`flex flex-col gap-6 ${className}`}
    >
      {/* Informational banner when viewing Main Profile direct projection */}
      {isMainProjection && (
        <div
          role="note"
          aria-label="Main Profile Direct Projection Note"
          className="flex items-start gap-3 p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-900 dark:text-blue-200"
        >
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="font-semibold">Main Profile Direct Projection:</span> This version
            mirrors your canonical main profile facts with 100% fidelity. All statements below reflect
            canonical facts without LLM modifications.
          </div>
        </div>
      )}

      {/* Header & Baseline Selector Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Tailoring Diff: Version v{currentVersion?.version_number ?? 1}
          </h2>
        </div>

        {/* Baseline Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="diff-baseline-select" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Compare against:
          </label>
          <select
            id="diff-baseline-select"
            value={baselineId}
            onChange={(e) => setBaselineId(e.target.value)}
            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <option value="main">Main Career Profile</option>
            {candidateVersions.map((v) => (
              <option key={v.id} value={v.id}>
                Version v{v.version_number} ({v.id.slice(0, 8)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Headline & Summary Diff Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-3">
          Headline & Professional Summary
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Baseline Column */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase block mb-1">
              Baseline ({isComparingMain ? "Main Profile" : `v${baselineVersion?.version_number}`})
            </span>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">
              {baselineHeadline || "No headline set"}
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {baselineSummary || "No summary set"}
            </p>
          </div>

          {/* Tailored Column */}
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase flex items-center gap-1 mb-1">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Tailored (v{currentVersion?.version_number ?? 1})
            </span>
            <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100 mb-2">
              {tailored.headline || "No headline set"}
            </p>
            <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
              {tailored.summary || "No summary set"}
            </p>
          </div>
        </div>
      </section>

      {/* Targeted Skills Diff Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-3">
          Targeted & Highlighted Skills
        </h3>

        {skillGroups.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-300 italic">
            No targeted skills recorded for this version.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skillGroups.flatMap((group) =>
              (group?.skills ?? []).map((skill) => (
                <span
                  key={`${group.category}-${skill}`}
                  data-skill-badge="highlighted"
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded-full shadow-xs"
                >
                  <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  <span>{skill}</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400">({group.category})</span>
                </span>
              ))
            )}
          </div>
        )}
      </section>

      {/* Experience Bullet Points Diff */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-4">
          Experience Bullet Points & Impact Comparison
        </h3>

        {experiences.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-300 italic">
            No experiences recorded for this version.
          </p>
        ) : (
          <div className="space-y-6">
            {experiences.map((exp) => {
              // Find baseline main experience or baseline version experience
              const mainExp = mainProfile?.experiences?.find(
                (m) => m && (m.id === exp.source_entity_id || m.company === exp.company)
              );
              const baselineVersionExp = baselineVersion?.tailored_content?.experiences?.find(
                (b) => b && (b.source_entity_id === exp.source_entity_id || b.company === exp.company)
              );

              // Collect baseline statements defensively
              const mainFacts =
                mainExp?.facts ??
                mainProfile?.facts?.filter(
                  (f) =>
                    f &&
                    (f.owner_id === exp.source_entity_id || (mainExp?.id && f.owner_id === mainExp.id))
                ) ??
                [];

              const baselineBulletsList = getExperienceBullets(baselineVersionExp);

              const baselineStatements: string[] = isComparingMain
                ? mainFacts.map((f) => f.statement || "")
                : baselineBulletsList.map(extractBulletText).filter(Boolean);

              // Bullets in current tailored version (handling both bullet_points and bullets)
              const currentBulletsList = getExperienceBullets(exp);
              const currentBullets = currentBulletsList.map(extractBulletText).filter(Boolean);

              // Compute omitted baseline statements
              const omittedStatements = baselineStatements.filter(
                (stmt) => !currentBullets.some((c) => c.toLowerCase().trim() === stmt.toLowerCase().trim())
              );

              const hasNoBullets = currentBullets.length === 0 && omittedStatements.length === 0;

              return (
                <div
                  key={exp.source_entity_id || exp.company}
                  className="border-t border-slate-100 dark:border-slate-800 pt-4 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-baseline justify-between mb-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {exp.role_title} <span className="font-normal text-slate-500 dark:text-slate-300">at</span> {exp.company}
                    </h4>
                    <span className="text-xs text-slate-500 dark:text-slate-300 font-mono">{exp.start_date}</span>
                  </div>

                  {hasNoBullets ? (
                    <p className="text-xs text-slate-500 dark:text-slate-300 italic py-1">
                      No bullet points recorded for this experience.
                    </p>
                  ) : (
                    <ul className="space-y-2 mt-3 list-none p-0">
                      {/* Current Tailored Bullets (Additions or Unchanged) */}
                      {currentBullets.map((bulletText, idx) => {
                        const isIdenticalToBaseline = baselineStatements.some(
                          (stmt) => stmt.toLowerCase().trim() === bulletText.toLowerCase().trim()
                        );
                        const diffType = isIdenticalToBaseline ? "unchanged" : "addition";

                        return (
                          <li
                            key={idx}
                            data-diff-type={diffType}
                            className={`p-3 rounded-md border text-xs leading-relaxed flex items-start gap-2.5 transition-colors ${
                              diffType === "addition"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 font-medium"
                                : "bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {diffType === "addition" ? (
                              <PlusCircle
                                className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                                aria-hidden="true"
                              />
                            ) : (
                              <Check
                                className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5"
                                aria-hidden="true"
                              />
                            )}
                            <div>
                              <span className="sr-only">
                                {diffType === "addition" ? "Added: " : "Unchanged: "}
                              </span>
                              <span>{bulletText}</span>
                            </div>
                          </li>
                        );
                      })}

                      {/* Omitted Baseline Facts / Statements (Deletions) */}
                      {omittedStatements.map((stmt, idx) => (
                        <li
                          key={`omitted-${idx}`}
                          data-diff-type="deletion"
                          className="p-3 rounded-md border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 text-red-900 dark:text-red-300 line-through text-xs leading-relaxed flex items-start gap-2.5"
                        >
                          <MinusCircle
                            className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <div>
                            <span className="sr-only">Omitted: </span>
                            <span>{stmt}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
