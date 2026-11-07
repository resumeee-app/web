/**
 * Native JavaScript Date utilities for parsing, formatting, and validating
 * calendar dates (year, month, day) across UI components.
 */

/**
 * Checks whether the given value represents a valid Date instance or parseable date string.
 */
export function isValidDate(value: unknown): boolean {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }
  if (typeof value === "string") {
    return parseDate(value) !== null;
  }
  return false;
}

/**
 * Parses a date string or Date object into a normalized UTC Date instance (midnight UTC).
 * Supports YYYY-MM-DD, YYYY-MM (defaulting day to 1), and standard ISO-8601 strings.
 * Returns null if input is null, undefined, empty, or unparseable.
 */
export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "present") {
    return null;
  }

  // Matches YYYY-MM-DD or YYYY-MM
  const match = trimmed.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (match && match[1] && match[2]) {
    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = match[3] ? Number.parseInt(match[3], 10) : 1;

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    // Verify date rollover (e.g., Feb 31 -> Mar 3)
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
      return null;
    }
    return d;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0)
  );
}

/**
 * Formats a Date or date string into an ISO-8601 date string ("YYYY-MM-DD")
 * suitable for HTML5 `<input type="date">` values.
 * Returns an empty string if value is null, undefined, or unparseable.
 */
export function formatDateInput(value: string | Date | null | undefined): string {
  const d = parseDate(value);
  if (!d) {
    return "";
  }
  const year = d.getUTCFullYear().toString().padStart(4, "0");
  const month = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date or date string for display in the UI.
 * Returns "YYYY-MM-DD" or empty string if invalid.
 */
export function formatDateDisplay(value: string | Date | null | undefined): string {
  return formatDateInput(value);
}

/**
 * Formats a start and end date into a standard range display string
 * (e.g. "2021-01-01 — Present" or "2021-01-01 — 2023-12-31").
 */
export function formatDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  isCurrent?: boolean
): string {
  const startDisplay = formatDateDisplay(startDate);
  const endDisplay = formatDateDisplay(endDate);

  if (!startDisplay && !endDisplay) {
    return "";
  }

  if (isCurrent || !endDisplay) {
    return startDisplay ? `${startDisplay} — Present` : (endDisplay || "Present");
  }

  if (!startDisplay) {
    return endDisplay;
  }

  return `${startDisplay} — ${endDisplay}`;
}
