import { describe, it, expect } from "vitest";
import {
  parseDate,
  formatDateInput,
  formatDateDisplay,
  formatDateRange,
  isValidDate,
} from "./date";

describe("date utility", () => {
  describe("parseDate", () => {
    it("returns null for null, undefined, empty, or whitespace", () => {
      expect(parseDate(null)).toBeNull();
      expect(parseDate(undefined)).toBeNull();
      expect(parseDate("")).toBeNull();
      expect(parseDate("   ")).toBeNull();
    });

    it("returns valid Date for full ISO YYYY-MM-DD", () => {
      const d = parseDate("2024-05-15");
      expect(d).not.toBeNull();
      expect(d?.getUTCFullYear()).toBe(2024);
      expect(d?.getUTCMonth()).toBe(4); // 0-indexed May
      expect(d?.getUTCDate()).toBe(15);
    });

    it("returns valid Date for YYYY-MM defaulting day to 1", () => {
      const d = parseDate("2023-11");
      expect(d).not.toBeNull();
      expect(d?.getUTCFullYear()).toBe(2023);
      expect(d?.getUTCMonth()).toBe(10); // 0-indexed November
      expect(d?.getUTCDate()).toBe(1);
    });

    it("returns clone for existing valid Date object", () => {
      const original = new Date(Date.UTC(2022, 0, 1));
      const d = parseDate(original);
      expect(d).not.toBeNull();
      expect(d?.getTime()).toBe(original.getTime());
    });

    it("returns null for invalid date string or invalid Date", () => {
      expect(parseDate("not-a-date")).toBeNull();
      expect(parseDate("2024-99-99")).toBeNull();
      expect(parseDate(new Date(NaN))).toBeNull();
    });
  });

  describe("formatDateInput", () => {
    it("formats Date or string into YYYY-MM-DD", () => {
      expect(formatDateInput("2024-05-15")).toBe("2024-05-15");
      expect(formatDateInput("2024-05")).toBe("2024-05-01");
      const d = new Date(Date.UTC(2021, 8, 9));
      expect(formatDateInput(d)).toBe("2021-09-09");
    });

    it("returns empty string for null, undefined, or invalid", () => {
      expect(formatDateInput(null)).toBe("");
      expect(formatDateInput(undefined)).toBe("");
      expect(formatDateInput("")).toBe("");
      expect(formatDateInput("invalid")).toBe("");
    });
  });

  describe("formatDateDisplay", () => {
    it("formats valid date string", () => {
      expect(formatDateDisplay("2024-05-15")).toBe("2024-05-15");
      expect(formatDateDisplay("2024-05")).toBe("2024-05-01");
    });

    it("returns empty string for null, undefined, or invalid", () => {
      expect(formatDateDisplay(null)).toBe("");
      expect(formatDateDisplay("invalid")).toBe("");
    });
  });

  describe("formatDateRange", () => {
    it("formats current position", () => {
      expect(formatDateRange("2021-01-01", null, true)).toBe("2021-01-01 — Present");
      expect(formatDateRange("2021-01-01", "", true)).toBe("2021-01-01 — Present");
    });

    it("formats completed range", () => {
      expect(formatDateRange("2021-01-01", "2023-12-31", false)).toBe("2021-01-01 — 2023-12-31");
    });

    it("handles missing end date as Present if empty", () => {
      expect(formatDateRange("2021-01-01", null, false)).toBe("2021-01-01 — Present");
      expect(formatDateRange("2021-01-01", "", false)).toBe("2021-01-01 — Present");
    });

    it("handles empty start date gracefully", () => {
      expect(formatDateRange("", "2023-12-31", false)).toBe("2023-12-31");
      expect(formatDateRange(null, null, false)).toBe("");
    });
  });

  describe("isValidDate", () => {
    it("checks date validity correctly", () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(new Date(NaN))).toBe(false);
      expect(isValidDate("2024-01-01")).toBe(true);
      expect(isValidDate("invalid")).toBe(false);
      expect(isValidDate(null)).toBe(false);
    });
  });
});
