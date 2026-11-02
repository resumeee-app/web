/**
 * Identifier Utility for Compact Entity Identification.
 *
 * Implements token-efficient short entity identifiers matching the canonical Resumeee
 * domain specification (internal/domain/identifier.go, Issue #84).
 */

/**
 * Deterministically derives a compact short identifier from an existing long UUID or arbitrary identifier string.
 *
 * Behavior:
 * - Empty or whitespace-only strings return empty string `""`.
 * - Strings with length <= 12 characters are already compact and returned as-is.
 * - Standard UUIDv4 values (`xxxxxxxx-xxxx-...`) return the first 8-character chunk.
 * - Prefixed UUIDs (`<prefix>-<uuid>`) retain the prefix and append the first 8 characters of the cleaned suffix (e.g. `exp-9b1deb4d`).
 * - Non-hyphenated strings longer than 8 characters are truncated to the first 8 characters.
 *
 * @param id - The canonical long identifier or UUID string to shorten.
 * @returns Deterministic, URL-safe compact representation of the identifier.
 */
export function shortenId(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) {
    return "";
  }

  // Already compact (<= 12 chars)
  if (trimmed.length <= 12) {
    return trimmed;
  }

  // If it contains a hyphen, check if it's prefixed or a bare UUID
  const firstHyphenIndex = trimmed.indexOf("-");
  if (firstHyphenIndex !== -1) {
    const parts = trimmed.split("-");
    const p0 = parts[0];
    const p1 = parts[1];
    if (parts.length === 5 && p0 && p0.length === 8 && p1 && p1.length === 4) {
      // Bare UUID: return first 8 chars
      return p0;
    }

    const prefix = trimmed.slice(0, firstHyphenIndex);
    const suffix = trimmed.slice(firstHyphenIndex + 1);
    const suffixClean = suffix.replace(/-/g, "");
    const truncatedSuffix =
      suffixClean.length > 8 ? suffixClean.slice(0, 8) : suffixClean;
    return `${prefix}-${truncatedSuffix}`;
  }

  if (trimmed.length > 8) {
    return trimmed.slice(0, 8);
  }

  return trimmed;
}

/**
 * Domain entity interface carrying a canonical ID and optional persisted ShortID.
 */
export interface EntityWithId {
  /** Canonical full UUID identifier */
  id: string;
  /** Explicit persisted short identifier, if available */
  short_id?: string;
}

/**
 * Resolves the effective compact short identifier for a domain entity.
 * Evaluates the explicit persisted `short_id` first, falling back to deterministic
 * derivation from `id` via `shortenId`.
 *
 * @param entity - Entity object implementing EntityWithId.
 * @returns The effective short identifier string.
 */
export function getEffectiveShortId(entity: EntityWithId): string {
  if (entity.short_id && entity.short_id.trim() !== "") {
    return entity.short_id.trim();
  }
  return shortenId(entity.id);
}
