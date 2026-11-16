import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import "../../public/theme-init.js";

describe("Theme Initialization & CSP Anti-FOUC Architecture", () => {
  const indexHtmlPath = path.resolve(__dirname, "../../index.html");
  const themeInitScriptPath = path.resolve(__dirname, "../../public/theme-init.js");

  const readIndexHtml = () => fs.readFileSync(indexHtmlPath, "utf-8");
  const readThemeInitScript = () => fs.readFileSync(themeInitScriptPath, "utf-8");

  describe("index.html CSP Compliance", () => {
    it("references external /theme-init.js in <head>", () => {
      const html = readIndexHtml();
      expect(html).toContain('<script src="/theme-init.js"></script>');
    });

    it("ensures /theme-init.js is synchronous without async or defer to prevent FOUC", () => {
      const html = readIndexHtml();
      const scriptTagMatch = html.match(/<script\s+[^>]*src=["']\/theme-init\.js["'][^>]*><\/script>/i);
      expect(scriptTagMatch).not.toBeNull();
      const scriptTag = scriptTagMatch![0];
      expect(scriptTag).not.toMatch(/\basync\b/i);
      expect(scriptTag).not.toMatch(/\bdefer\b/i);
    });

    it("contains no inline <script> tags in <head>, complying with CSP script-src 'self'", () => {
      const html = readIndexHtml();
      const headMatch = html.match(/<head>([\s\S]*?)<\/head>/i);
      expect(headMatch).not.toBeNull();
      const headContent = headMatch?.[1] ?? "";

      // Match any <script> tag that does not have an external src attribute
      const inlineScripts = headContent.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi);
      expect(inlineScripts).toBeNull();
    });
  });

  describe("public/theme-init.js behavior", () => {
    let scriptCode: string;

    const executeThemeInit = () => {
      // Evaluate script in JSDOM global scope
      const runFn = new Function(scriptCode);
      runFn();
    };

    beforeEach(() => {
      scriptCode = readThemeInitScript();
      localStorage.clear();
      document.documentElement.className = "";
      vi.restoreAllMocks();
    });

    it("applies dark class when stored theme is 'dark'", () => {
      localStorage.setItem("resumeee-theme", "dark");
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });

      executeThemeInit();

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("removes dark class when stored theme is 'light'", () => {
      document.documentElement.classList.add("dark");
      localStorage.setItem("resumeee-theme", "light");
      window.matchMedia = vi.fn().mockReturnValue({ matches: true });

      executeThemeInit();

      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("applies dark class when stored theme is 'system' and OS prefers dark", () => {
      localStorage.setItem("resumeee-theme", "system");
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("dark"),
        media: query,
      }));

      executeThemeInit();

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("removes dark class when stored theme is 'system' and OS prefers light", () => {
      document.documentElement.classList.add("dark");
      localStorage.setItem("resumeee-theme", "system");
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });

      executeThemeInit();

      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("defaults to system theme when localStorage is empty and respects OS dark preference", () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("dark"),
        media: query,
      }));

      executeThemeInit();

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("defaults to system theme when localStorage is empty and respects OS light preference", () => {
      document.documentElement.classList.add("dark");
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });

      executeThemeInit();

      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("gracefully catches localStorage security exceptions without throwing or altering DOM", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new DOMException("The operation is insecure.", "SecurityError");
      });
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });

      expect(() => executeThemeInit()).not.toThrow();
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });
});
