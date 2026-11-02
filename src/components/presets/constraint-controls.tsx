import React, { useState } from "react";
import { ArrowUp, ArrowDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Props for the ConstraintControls component.
 */
export interface ConstraintControlsProps {
  /** If true, disables all input elements, dropdowns, and reorder buttons (e.g. for system presets) */
  disabled?: boolean;
  /** Callback invoked when the user clicks 'Apply Constraints to Instructions' */
  onApplyInstructions?: (synthesizedInstructions: string) => void;
  /** Optional custom CSS class name for styling the container */
  className?: string;
}

/**
 * Represents a single resume section in the reorderable priority list.
 */
export interface SectionItem {
  /** Unique key for the section */
  id: string;
  /** Human-readable display title */
  name: string;
}

/**
 * Default resume sections available for tailoring priority reordering.
 */
const DEFAULT_SECTIONS: SectionItem[] = [
  { id: "experience", name: "Experience" },
  { id: "skills", name: "Skills" },
  { id: "projects", name: "Projects" },
  { id: "education", name: "Education" },
  { id: "certifications", name: "Certifications" },
];

/**
 * Description mapping table for page length constraints.
 */
const PAGE_LENGTH_DESCRIPTIONS: Record<string, string> = {
  "1-page": "Strict 1-page max",
  "2-page": "Standard 2-page max",
  unlimited: "Comprehensive / Unlimited",
};

/**
 * Description mapping table for tailoring tone and focus.
 */
const TONE_DESCRIPTIONS: Record<string, string> = {
  tactical: "Tactical & Hands-on",
  strategic: "Strategic & Leadership focused",
  concise: "Concise & Direct",
  narrative: "Narrative & Contextual",
};

/**
 * ConstraintControls provides an interactive builder for resume tailoring heuristics:
 * - Target page length constraints (1-page max, 2-page max, comprehensive)
 * - Maximum bullet count per role
 * - Tone and seniority focus (tactical, strategic, concise, narrative)
 * - Accessible keyboard reordering of resume sections (up/down buttons with focus visible states)
 *
 * Synthesizes these heuristics into the canonical Tier-2 system instructions prompt string,
 * bridging user configuration with the backend OpenAPI schema without inventing unsupported fields.
 */
export const ConstraintControls: React.FC<ConstraintControlsProps> = ({
  disabled = false,
  onApplyInstructions,
  className = "",
}) => {
  const [pageLength, setPageLength] = useState<string>("1-page");
  const [maxBullets, setMaxBullets] = useState<number | "">(4);
  const [tone, setTone] = useState<string>("tactical");
  const [sections, setSections] = useState<SectionItem[]>(DEFAULT_SECTIONS);

  /**
   * Reorders a section up or down in the section array.
   * Disables operation if the component is disabled or the move would exceed bounds.
   */
  const moveSection = (index: number, direction: "up" | "down") => {
    if (disabled) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    setSections((prev) => {
      const next = [...prev];
      const current = next[index];
      const target = next[targetIndex];
      if (current && target) {
        next[index] = target;
        next[targetIndex] = current;
      }
      return next;
    });
  };

  /**
   * Synthesizes the active constraints and ordered section priority into
   * a structured prompt instruction string and invokes the onApplyInstructions callback.
   */
  const handleApply = () => {
    if (!onApplyInstructions || disabled) return;

    const lengthDescription =
      PAGE_LENGTH_DESCRIPTIONS[pageLength] ?? "Strict 1-page max";
    const toneDescription =
      TONE_DESCRIPTIONS[tone] ?? "Tactical & Hands-on";

    const sectionPriorityList = sections.map((s, i) => `${i + 1}. ${s.name}`).join(", ");
    const bulletCount = typeof maxBullets === "number" ? maxBullets : 4;

    const synthesized = [
      `Target Length: ${lengthDescription}.`,
      `Max ${bulletCount} bullets per role.`,
      `Tone & Focus: ${toneDescription}.`,
      `Section Priority: ${sectionPriorityList}.`,
    ].join(" ");

    onApplyInstructions(synthesized);
  };

  return (
    <div
      className={`rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 space-y-4 ${className}`}
    >
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Tailoring Constraints Builder
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure prompt constraints and section priorities. These synthesize
          directly into the preset system instructions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Page Constraint */}
        <div>
          <label
            htmlFor="constraint-page-length"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Target Page Length
          </label>
          <select
            id="constraint-page-length"
            value={pageLength}
            disabled={disabled}
            onChange={(e) => setPageLength(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500"
          >
            <option value="1-page">Strict 1-Page Max</option>
            <option value="2-page">Standard 2-Page Max</option>
            <option value="unlimited">Comprehensive / Unlimited</option>
          </select>
        </div>

        {/* Max Bullets Per Role */}
        <div>
          <label
            htmlFor="constraint-max-bullets"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Maximum Bullets per Role
          </label>
          <input
            id="constraint-max-bullets"
            type="number"
            min={1}
            max={15}
            value={maxBullets}
            disabled={disabled}
            onChange={(e) => {
              if (e.target.value === "") {
                setMaxBullets("");
                return;
              }
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                setMaxBullets(Math.max(1, Math.min(15, val)));
              }
            }}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500"
          />
        </div>

        {/* Tone & Seniority Focus */}
        <div>
          <label
            htmlFor="constraint-tone"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Tone & Focus
          </label>
          <select
            id="constraint-tone"
            value={tone}
            disabled={disabled}
            onChange={(e) => setTone(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500"
          >
            <option value="tactical">Tactical / Hands-on</option>
            <option value="strategic">Strategic / Leadership</option>
            <option value="concise">Concise & Direct</option>
            <option value="narrative">Narrative & Contextual</option>
          </select>
        </div>
      </div>

      {/* Accessible Section Reordering */}
      <div>
        <span
          id="section-priority-label"
          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Section Priority & Ordering
        </span>
        <ul
          aria-labelledby="section-priority-label"
          className="divide-y divide-slate-200 dark:divide-slate-800 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        >
          {sections.map((section, index) => {
            const isFirst = index === 0;
            const isLast = index === sections.length - 1;

            return (
              <li
                key={section.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-5 text-xs font-semibold text-slate-400 dark:text-slate-500">
                    {index + 1}.
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {section.name}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled || isFirst}
                    onClick={() => moveSection(index, "up")}
                    aria-label={`Move ${section.name} up`}
                    className="h-7 w-7 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled || isLast}
                    onClick={() => moveSection(index, "down")}
                    aria-label={`Move ${section.name} down`}
                    className="h-7 w-7 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {onApplyInstructions && (
        <div className="pt-1 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={handleApply}
            className="flex items-center space-x-1.5 text-xs text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 focus-visible:ring-indigo-500"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span>Apply Constraints to Instructions</span>
          </Button>
        </div>
      )}
    </div>
  );
};
