import * as React from "react";
import { cn } from "@/lib/utils";
import type { components } from "@/api/schema";

/**
 * Represents either a raw skill token string or a Skill entity schema.
 */
export type SkillItem = string | components["schemas"]["Skill"];

/**
 * Parses a comma-separated string of skill tokens into a trimmed, non-empty, deduplicated array.
 * Preserves the original token casing of the first occurrence while deduplicating case-insensitively.
 *
 * @param input - Raw comma-separated string of skills.
 * @returns Deduplicated array of trimmed skill tokens.
 */
export function parseSkillTokens(input: string): string[] {
  if (!input) {
    return [];
  }
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const raw of input.split(",")) {
    const trimmed = raw.trim();
    if (trimmed) {
      const lower = trimmed.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        tokens.push(trimmed);
      }
    }
  }
  return tokens;
}

/**
 * Determines whether a skill is considered selected against a set of active lowercased tokens.
 * Matches against either the skill's name or its id.
 *
 * @param skill - Skill object or token string to check.
 * @param activeSet - Set of lowercased active skill tokens.
 * @returns True if either the skill name or id matches an active token.
 */
export function isSkillSelected(
  skill: SkillItem,
  activeSet: ReadonlySet<string>
): boolean {
  if (typeof skill === "string") {
    const lower = skill.trim().toLowerCase();
    return lower !== "" && activeSet.has(lower);
  }
  const nameLower = (skill.name ?? "").trim().toLowerCase();
  const idLower = (skill.id ?? "").trim().toLowerCase();
  return (
    (nameLower !== "" && activeSet.has(nameLower)) ||
    (idLower !== "" && activeSet.has(idLower))
  );
}

/**
 * Toggles a skill token or skill entity in an array of tokens.
 * If present (matching either name or ID case-insensitively), removes the token;
 * otherwise appends the token's display name or ID.
 *
 * @param currentTokens - Current array of skill tokens.
 * @param tokenOrSkill - Skill token name/ID or Skill entity to toggle.
 * @returns Updated array of tokens without duplicates.
 */
export function toggleSkillToken(
  currentTokens: string[],
  tokenOrSkill: SkillItem
): string[] {
  let nameLower = "";
  let idLower = "";
  let displayName = "";

  if (typeof tokenOrSkill === "string") {
    const trimmed = tokenOrSkill.trim();
    nameLower = trimmed.toLowerCase();
    idLower = nameLower;
    displayName = trimmed;
  } else {
    nameLower = (tokenOrSkill.name ?? "").trim().toLowerCase();
    idLower = (tokenOrSkill.id ?? "").trim().toLowerCase();
    displayName = tokenOrSkill.name || tokenOrSkill.id || "";
  }

  if (!displayName) {
    return currentTokens;
  }

  const exists = currentTokens.some((tok) => {
    const tokLower = tok.trim().toLowerCase();
    return (
      (nameLower !== "" && tokLower === nameLower) ||
      (idLower !== "" && tokLower === idLower)
    );
  });

  if (exists) {
    return currentTokens.filter((tok) => {
      const tokLower = tok.trim().toLowerCase();
      return (
        (nameLower === "" || tokLower !== nameLower) &&
        (idLower === "" || tokLower !== idLower)
      );
    });
  }

  return [...currentTokens, displayName];
}

/**
 * Resolves skill tokens to canonical skill IDs from a lookup pool.
 * Tokens matching a skill's name or ID (case-insensitively) are mapped to that skill's ID;
 * unrecognised tokens are preserved as raw IDs. The resulting list is deduplicated.
 *
 * @param tokens - Array of raw skill tokens.
 * @param pool - Pool of available or existing skill entities.
 * @returns Deduplicated array of canonical or raw skill IDs.
 */
export function resolveSkillIds(
  tokens: string[],
  pool: components["schemas"]["Skill"][]
): string[] {
  const resolvedIds: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const tokenLower = token.trim().toLowerCase();
    if (!tokenLower) {
      continue;
    }

    const matched = pool.find((s) => {
      const sName = (s.name ?? "").trim().toLowerCase();
      const sId = (s.id ?? "").trim().toLowerCase();
      return (
        (sName !== "" && sName === tokenLower) ||
        (sId !== "" && sId === tokenLower)
      );
    });

    const resolvedId = (matched?.id || token).trim();
    if (!seen.has(resolvedId)) {
      seen.add(resolvedId);
      resolvedIds.push(resolvedId);
    }
  }

  return resolvedIds;
}

/**
 * Determines whether a skill entity is a pre-seeded system global skill.
 *
 * @param skill - Skill entity to check.
 * @returns True if the skill has is_global true or user_id 'system'.
 */
export function isGlobalSkill(
  skill?: components["schemas"]["Skill"] | null
): boolean {
  if (!skill) {
    return false;
  }
  return Boolean(skill.is_global || skill.user_id === "system");
}

/**
 * Props for the SkillSelector component.
 */
export interface SkillSelectorProps {
  /** HTML id for the text input element */
  id?: string;
  /** Accessible text label for the input element */
  label?: string;
  /** Placeholder text for the input element */
  placeholder?: string;
  /** Optional helper text or instructions displayed below the label */
  helperText?: string;
  /** Current comma-separated string of selected skills */
  value: string;
  /** Callback triggered whenever the input value changes via typing or chip clicks */
  onChange: (value: string) => void;
  /** Optional list of available master skills to render as quick-add badges */
  availableSkills?: components["schemas"]["Skill"][];
  /** Whether the input and chips are disabled */
  disabled?: boolean;
  /** Optional container class name */
  className?: string;
  /** Optional input element class name */
  inputClassName?: string;
}

/**
 * Standardized, accessible skill selection component with comma-separated text entry
 * and interactive quick-add chips featuring visual indicators (+ for unselected, ✓ for selected).
 *
 * @param props - SkillSelectorProps
 * @returns Accessible skill selection element
 */
export const SkillSelector: React.FC<SkillSelectorProps> = ({
  id = "skills-input",
  label = "Skills",
  placeholder = "Comma-separated skill names or IDs (e.g. Go, Rust, React)",
  helperText,
  value,
  onChange,
  availableSkills,
  disabled = false,
  className,
  inputClassName,
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");

  const activeTokens = React.useMemo(() => parseSkillTokens(value), [value]);

  const activeSet = React.useMemo(
    () => new Set(activeTokens.map((t) => t.toLowerCase())),
    [activeTokens]
  );

  const handleChipClick = React.useCallback(
    (skill: components["schemas"]["Skill"]) => {
      if (disabled) {
        return;
      }
      const nextTokens = toggleSkillToken(activeTokens, skill);
      onChange(nextTokens.join(", "));
    },
    [activeTokens, disabled, onChange]
  );

  const query = searchQuery.trim().toLowerCase();

  const filteredSkills = React.useMemo(() => {
    if (!availableSkills) return [];
    if (!query) return availableSkills;
    return availableSkills.filter((s) => {
      const name = (s.name ?? "").toLowerCase();
      const sId = (s.id ?? "").toLowerCase();
      const category = (s.category ?? "").toLowerCase();
      const keywords = (s.keywords ?? []).map((k) => k.toLowerCase());
      return (
        name.includes(query) ||
        sId.includes(query) ||
        category.includes(query) ||
        keywords.some((k) => k.includes(query))
      );
    });
  }, [availableSkills, query]);

  const customSkills = React.useMemo(
    () => filteredSkills.filter((s) => !isGlobalSkill(s)),
    [filteredSkills]
  );

  const globalSkills = React.useMemo(
    () => filteredSkills.filter((s) => isGlobalSkill(s)),
    [filteredSkills]
  );

  const hasBothGroups = React.useMemo(() => {
    if (!availableSkills) return false;
    let hasCustom = false;
    let hasGlobal = false;
    for (const s of availableSkills) {
      if (isGlobalSkill(s)) {
        hasGlobal = true;
      } else {
        hasCustom = true;
      }
      if (hasCustom && hasGlobal) return true;
    }
    return false;
  }, [availableSkills]);

  const renderChip = (s: components["schemas"]["Skill"]) => {
    const isSelected = isSkillSelected(s, activeSet);
    const isGlobal = isGlobalSkill(s);
    const displayName = s.name || s.id;

    return (
      <button
        key={s.id}
        type="button"
        disabled={disabled}
        onClick={() => handleChipClick(s)}
        aria-pressed={isSelected}
        aria-label={displayName}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed",
          isSelected
            ? "bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300"
            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
        )}
      >
        <span aria-hidden="true">{isSelected ? "✓ " : "+ "}</span>
        <span>{displayName}</span>
        {isGlobal && (
          <span
            className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium"
            title="Global verified skill"
          >
            Global
          </span>
        )}
      </button>
    );
  };

  const renderSkillGroup = (
    title: string | null,
    skills: components["schemas"]["Skill"][],
    ariaLabel: string
  ) => {
    if (skills.length === 0) {
      return null;
    }
    return (
      <div>
        {title && (
          <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
            {title}
          </h4>
        )}
        <div
          role="group"
          aria-label={ariaLabel}
          className="flex flex-wrap gap-1.5 items-center"
        >
          {skills.map(renderChip)}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
      </label>

      {helperText && (
        <p
          id={`${id}-helper`}
          className="text-xs text-slate-500 dark:text-slate-400"
        >
          {helperText}
        </p>
      )}

      <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        aria-describedby={helperText ? `${id}-helper` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed",
          inputClassName
        )}
      />

      {availableSkills && availableSkills.length > 0 && (
        <div className="mt-2 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Quick add:
            </span>
            <div className="relative">
              <label htmlFor={`${id}-search`} className="sr-only">
                Filter options
              </label>
              <input
                id={`${id}-search`}
                type="text"
                placeholder="Filter available options..."
                value={searchQuery}
                disabled={disabled}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-48 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:opacity-50"
              />
            </div>
          </div>

          {filteredSkills.length === 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
              No matching skills found.
            </p>
          )}

          {filteredSkills.length > 0 && hasBothGroups && (
            <div className="space-y-2">
              {renderSkillGroup("Custom Skills", customSkills, "Custom skill options")}
              {renderSkillGroup(
                "Pre-seeded Global Technologies",
                globalSkills,
                "Pre-seeded Global Technologies options"
              )}
            </div>
          )}

          {filteredSkills.length > 0 && !hasBothGroups && (
            globalSkills.length > 0
              ? renderSkillGroup(
                  "Pre-seeded Global Technologies",
                  globalSkills,
                  "Pre-seeded Global Technologies options"
                )
              : renderSkillGroup(null, customSkills, "Available skill options")
          )}
        </div>
      )}
    </div>
  );
};
