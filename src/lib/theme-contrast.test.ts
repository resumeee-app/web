import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Parses HSL color string into [h, s, l] numeric components.
 *
 * @param hslStr - CSS HSL value such as "210 40% 98%" or "222.2 84% 4.9%".
 * @returns Tuple of [hue (0-360), saturation (0-100), lightness (0-100)].
 */
export function parseHsl(hslStr: string): [number, number, number] {
  const parts = hslStr.trim().split(/\s+/);
  const p0 = parts[0];
  const p1 = parts[1];
  const p2 = parts[2];
  if (!p0 || !p1 || !p2) {
    throw new Error(`Invalid HSL string: "${hslStr}"`);
  }
  const h = parseFloat(p0);
  const s = parseFloat(p1.replace("%", ""));
  const l = parseFloat(p2.replace("%", ""));
  return [h, s, l];
}

/**
 * Converts HSL values to sRGB [0, 1] channels.
 *
 * @param h - Hue in degrees [0, 360].
 * @param s - Saturation in percent [0, 100].
 * @param l - Lightness in percent [0, 100].
 * @returns Tuple of [r, g, b] in [0, 1] range.
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) =>
    lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

/**
 * Computes the relative luminance of an sRGB color per W3C WCAG 2.1 specs.
 *
 * @param r - Red channel [0, 1].
 * @param g - Green channel [0, 1].
 * @param b - Blue channel [0, 1].
 * @returns Relative luminance value [0, 1].
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const transform = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const [rLin, gLin, bLin] = [transform(r), transform(g), transform(b)];
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Computes the contrast ratio between two luminance values according to WCAG 2.1.
 *
 * @param l1 - Relative luminance of color 1.
 * @param l2 - Relative luminance of color 2.
 * @returns Contrast ratio formatted as X:1 (number between 1 and 21).
 */
export function computeContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Computes the contrast ratio between two HSL color strings.
 *
 * @param hsl1 - First HSL color string.
 * @param hsl2 - Second HSL color string.
 * @returns Contrast ratio number.
 */
export function getHslContrastRatio(hsl1: string, hsl2: string): number {
  const [h1, s1, l1] = parseHsl(hsl1);
  const [h2, s2, l2] = parseHsl(hsl2);
  const [r1, g1, b1] = hslToRgb(h1, s1, l1);
  const [r2, g2, b2] = hslToRgb(h2, s2, l2);
  const lum1 = relativeLuminance(r1, g1, b1);
  const lum2 = relativeLuminance(r2, g2, b2);
  return computeContrastRatio(lum1, lum2);
}

/**
 * Extracts CSS custom properties declared within a specific CSS selector block.
 *
 * @param css - Full CSS file content.
 * @param selector - Target CSS selector (e.g. ":root" or ".dark").
 * @returns Record mapping variable name (without leading --) to its string value.
 */
export function extractCssVariables(css: string, selector: string): Record<string, string> {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockRegex = new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`, "m");
  const match = css.match(blockRegex);
  if (!match) {
    throw new Error(`Selector "${selector}" not found in CSS.`);
  }

  const vars: Record<string, string> = {};
  const blockContent = match[1];
  if (!blockContent) {
    return vars;
  }
  const varRegex = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let varMatch: RegExpExecArray | null;
  while ((varMatch = varRegex.exec(blockContent)) !== null) {
    const k = varMatch[1];
    const v = varMatch[2];
    if (k && v) {
      vars[k] = v.trim();
    }
  }
  return vars;
}

describe("Theme Token Contrast Compliance (WCAG 2.1 AA >= 4.5:1)", () => {
  const cssPath = path.resolve(__dirname, "../index.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  const rootVars = extractCssVariables(cssContent, ":root");
  const darkVars = extractCssVariables(cssContent, ".dark");

  const requiredPairs: Array<{
    name: string;
    foregroundKey: string;
    backgroundKey: string;
  }> = [
    {
      name: "Foreground / Background",
      foregroundKey: "foreground",
      backgroundKey: "background",
    },
    {
      name: "Card Foreground / Card",
      foregroundKey: "card-foreground",
      backgroundKey: "card",
    },
    {
      name: "Muted Foreground / Background",
      foregroundKey: "muted-foreground",
      backgroundKey: "background",
    },
    {
      name: "Muted Foreground / Card",
      foregroundKey: "muted-foreground",
      backgroundKey: "card",
    },
    {
      name: "Muted Foreground / Muted",
      foregroundKey: "muted-foreground",
      backgroundKey: "muted",
    },
    {
      name: "Primary Foreground / Primary",
      foregroundKey: "primary-foreground",
      backgroundKey: "primary",
    },
    {
      name: "Secondary Foreground / Secondary",
      foregroundKey: "secondary-foreground",
      backgroundKey: "secondary",
    },
    {
      name: "Destructive Foreground / Destructive",
      foregroundKey: "destructive-foreground",
      backgroundKey: "destructive",
    },
  ];

  describe("Light Theme (:root)", () => {
    for (const pair of requiredPairs) {
      it(`satisfies >= 4.5:1 AA contrast for ${pair.name}`, () => {
        const fg = rootVars[pair.foregroundKey];
        const bg = rootVars[pair.backgroundKey];

        expect(
          fg,
          `Missing variable --${pair.foregroundKey} in :root`
        ).toBeDefined();
        expect(
          bg,
          `Missing variable --${pair.backgroundKey} in :root`
        ).toBeDefined();

        if (!fg || !bg) return;
        const ratio = getHslContrastRatio(fg, bg);
        expect(
          ratio,
          `Expected ${pair.name} contrast ratio (${ratio.toFixed(2)}:1) to be >= 4.5:1 in :root`
        ).toBeGreaterThanOrEqual(4.5);
      });
    }
  });

  describe("Dark Theme (.dark)", () => {
    for (const pair of requiredPairs) {
      it(`satisfies >= 4.5:1 AA contrast for ${pair.name}`, () => {
        const fg = darkVars[pair.foregroundKey];
        const bg = darkVars[pair.backgroundKey];

        expect(
          fg,
          `Missing variable --${pair.foregroundKey} in .dark`
        ).toBeDefined();
        expect(
          bg,
          `Missing variable --${pair.backgroundKey} in .dark`
        ).toBeDefined();

        if (!fg || !bg) return;
        const ratio = getHslContrastRatio(fg, bg);
        expect(
          ratio,
          `Expected ${pair.name} contrast ratio (${ratio.toFixed(2)}:1) to be >= 4.5:1 in .dark`
        ).toBeGreaterThanOrEqual(4.5);
      });
    }
  });
});
