/**
 * Validates whether a string is a valid absolute HTTP or HTTPS URL.
 * Strictly disallows dangerous schemes such as javascript:, data:, vbscript:, and file:.
 *
 * @param value - Candidate URL string to validate.
 * @returns true if value is a valid URL with http: or https: scheme, false otherwise.
 */
export function isValidHttpUrl(value: string): boolean {
  if (!value || typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
