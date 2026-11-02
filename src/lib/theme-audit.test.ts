import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Recursively scans directory to locate matching source files.
 *
 * @param dir - Root directory path.
 * @param pattern - Filter function evaluating each file path.
 * @returns Array of absolute file paths matching the criteria.
 */
export function findFiles(dir: string, pattern: (file: string) => boolean): string[] {
  const results: string[] = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath, pattern));
    } else if (entry.isFile() && pattern(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Checks whether a given class token is an unguarded light-only utility.
 *
 * An unguarded light-only utility is a Tailwind class that sets light-specific backgrounds,
 * borders, or texts without an accompanying dark-mode variant (e.g. `dark:`) in the same class cluster.
 *
 * @param classList - String containing CSS class names.
 * @returns Array of offending unguarded class names found.
 */
const COLOR_FAMILIES =
  "slate|gray|zinc|neutral|stone|red|rose|amber|yellow|emerald|green|blue|indigo|violet|purple";

const BG_LIGHT_REGEX = new RegExp(`^bg-(?:${COLOR_FAMILIES})-(?:50|100)(?:/\\d+)?$`);
const TEXT_DARK_REGEX = new RegExp(`^text-(?:${COLOR_FAMILIES})-(?:700|800|900|950)$`);
const BORDER_LIGHT_REGEX = new RegExp(`^border-(?:${COLOR_FAMILIES})-(?:200|300)(?:/\\d+)?$`);
const DIVIDE_LIGHT_REGEX = new RegExp(`^divide-(?:${COLOR_FAMILIES})-(?:100|200)(?:/\\d+)?$`);

const HOVER_BG_LIGHT_REGEX = new RegExp(`^hover:bg-(?:${COLOR_FAMILIES})-(?:50|100)(?:/\\d+)?$`);
const HOVER_TEXT_DARK_REGEX = new RegExp(`^hover:text-(?:${COLOR_FAMILIES})-(?:800|900|950)$`);

export function findUnguardedThemeClasses(classList: string): string[] {
  const tokens = classList.split(/\s+/).filter(Boolean);
  const violations: string[] = [];

  const hasDarkBg = tokens.some((t) => t.startsWith("dark:bg-"));
  const hasDarkText = tokens.some((t) => t.startsWith("dark:text-"));
  const hasDarkBorder = tokens.some((t) => t.startsWith("dark:border-"));
  const hasDarkDivide = tokens.some((t) => t.startsWith("dark:divide-"));
  const hasDarkHoverBg = tokens.some(
    (t) => t.startsWith("dark:hover:bg-") || t.startsWith("dark:bg-")
  );
  const hasDarkHoverText = tokens.some(
    (t) => t.startsWith("dark:hover:text-") || t.startsWith("dark:text-")
  );

  for (const token of tokens) {
    if (token.startsWith("print:")) continue;

    // Background checks
    if (
      (token === "bg-white" || BG_LIGHT_REGEX.test(token)) &&
      !hasDarkBg
    ) {
      violations.push(`unguarded background class "${token}" without dark:bg-* variant`);
    }

    // High-contrast text checks
    if (
      TEXT_DARK_REGEX.test(token) &&
      !hasDarkText
    ) {
      violations.push(`unguarded text class "${token}" without dark:text-* variant`);
    }

    // Border checks
    if (
      BORDER_LIGHT_REGEX.test(token) &&
      !hasDarkBorder
    ) {
      violations.push(`unguarded border class "${token}" without dark:border-* variant`);
    }

    // Divider checks
    if (
      DIVIDE_LIGHT_REGEX.test(token) &&
      !hasDarkDivide
    ) {
      violations.push(`unguarded divide class "${token}" without dark:divide-* variant`);
    }

    // Hover background checks
    if (HOVER_BG_LIGHT_REGEX.test(token) && !hasDarkHoverBg) {
      violations.push(`unguarded hover background class "${token}" without dark:hover:bg-* variant`);
    }

    // Hover text checks
    if (HOVER_TEXT_DARK_REGEX.test(token) && !hasDarkHoverText) {
      violations.push(`unguarded hover text class "${token}" without dark:hover:text-* variant`);
    }
  }

  return violations;
}

/**
 * Extracts class strings from JSX source code.
 *
 * Matches strings inside `className="..."`, `className='...'`, `className={cn(...)}`,
 * or multi-line template literals.
 *
 * @param sourceCode - TypeScript/JSX source code content.
 * @returns Array of extracted class strings.
 */
export function extractClassStrings(sourceCode: string): string[] {
  const classStrings: string[] = [];

  // Match standard className="...", className='...', and template literals
  const stringLiteralsRegex = /(?:className|class)\s*=\s*(?:\{`([^`]+)`\}|"([^"]+)"|'([^']+)')/g;
  let match: RegExpExecArray | null;
  while ((match = stringLiteralsRegex.exec(sourceCode)) !== null) {
    const value = match[1] ?? match[2] ?? match[3];
    if (value) {
      classStrings.push(value);
    }
  }

  // Also match string literals inside cn(...) or clsx(...)
  const cnBlockRegex = /(?:cn|clsx)\s*\(([\s\S]*?)\)/g;
  let cnMatch: RegExpExecArray | null;
  while ((cnMatch = cnBlockRegex.exec(sourceCode)) !== null) {
    const inner = cnMatch[1];
    if (inner) {
      const innerStringRegex = /(?:`([^`]+)`|"([^"]+)"|'([^']+)')/g;
      let strMatch: RegExpExecArray | null;
      while ((strMatch = innerStringRegex.exec(inner)) !== null) {
        const val = strMatch[1] ?? strMatch[2] ?? strMatch[3];
        if (val) {
          classStrings.push(val);
        }
      }
    }
  }

  return classStrings;
}

describe("Static Theme Guard (Audit JSX Components for Dark Theme Compatibility)", () => {
  const srcDir = path.resolve(__dirname, "..");
  const sourceFiles = findFiles(srcDir, (filePath) => {
    // Only check tsx files, excluding test files, d.ts, and sandbox / preview iframe files
    if (!filePath.endsWith(".tsx")) return false;
    if (filePath.endsWith(".test.tsx")) return false;
    if (filePath.endsWith(".d.ts")) return false;
    return true;
  });

  it("found production TSX files to audit", () => {
    expect(sourceFiles.length).toBeGreaterThan(10);
  });

  for (const file of sourceFiles) {
    const relativePath = path.relative(srcDir, file);
    it(`enforces dark theme pairing or semantic tokens in ${relativePath}`, () => {
      const content = fs.readFileSync(file, "utf-8");
      const classStrings = extractClassStrings(content);
      const allViolations: string[] = [];

      for (const classStr of classStrings) {
        const violations = findUnguardedThemeClasses(classStr);
        if (violations.length > 0) {
          allViolations.push(
            `In snippet: "${classStr.trim().slice(0, 80)}..." -> ${violations.join(", ")}`
          );
        }
      }

      expect(
        allViolations,
        `Found ${allViolations.length} unguarded theme classes in ${relativePath}:\n${allViolations.join("\n")}`
      ).toHaveLength(0);
    });
  }
});
