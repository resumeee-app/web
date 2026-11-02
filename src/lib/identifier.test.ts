import { describe, it, expect } from "vitest";
import { shortenId, getEffectiveShortId } from "./identifier";

describe("shortenId utility", () => {
  it("returns empty string for empty or whitespace-only input", () => {
    expect(shortenId("")).toBe("");
    expect(shortenId("   ")).toBe("");
  });

  it("returns already short strings as-is (<= 12 chars)", () => {
    expect(shortenId("exp-1")).toBe("exp-1");
    expect(shortenId("short-id")).toBe("short-id");
    expect(shortenId("123456789012")).toBe("123456789012");
  });

  it("extracts the first 8 characters of a bare UUID", () => {
    expect(shortenId("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d")).toBe("9b1deb4d");
  });

  it("preserves entity prefix and truncates cleaned suffix to 8 chars", () => {
    expect(
      shortenId("exp-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d")
    ).toBe("exp-9b1deb4d");
    expect(
      shortenId("fact-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d")
    ).toBe("fact-9b1deb4d");
  });

  it("truncates long strings without hyphen to 8 chars", () => {
    expect(shortenId("abcdefghijklmnop")).toBe("abcdefgh");
  });

  it("getEffectiveShortId uses explicit short_id if present", () => {
    expect(
      getEffectiveShortId({
        id: "exp-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        short_id: "exp-custom",
      })
    ).toBe("exp-custom");
  });

  it("getEffectiveShortId falls back to shortenId(id) if short_id is missing", () => {
    expect(
      getEffectiveShortId({
        id: "exp-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      })
    ).toBe("exp-9b1deb4d");
  });
});
