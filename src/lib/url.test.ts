import { describe, it, expect } from "vitest";
import { isValidHttpUrl } from "./url";

describe("isValidHttpUrl", () => {
  it("accepts valid https URLs", () => {
    expect(isValidHttpUrl("https://example.com")).toBe(true);
    expect(isValidHttpUrl("https://subdomain.domain.org/path?query=1#hash")).toBe(true);
  });

  it("accepts valid http URLs", () => {
    expect(isValidHttpUrl("http://localhost:3000")).toBe(true);
    expect(isValidHttpUrl("http://example.com/api/v1")).toBe(true);
  });

  it("rejects dangerous or non-http protocols", () => {
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isValidHttpUrl("javascript:/*--></title></style></textarea></script>alert(1)")).toBe(false);
    expect(isValidHttpUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBe(false);
    expect(isValidHttpUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isValidHttpUrl("file:///etc/passwd")).toBe(false);
    expect(isValidHttpUrl("ftp://ftp.example.com")).toBe(false);
  });

  it("rejects relative URLs or malformed strings", () => {
    expect(isValidHttpUrl("/relative/path")).toBe(false);
    expect(isValidHttpUrl("not-a-url")).toBe(false);
    expect(isValidHttpUrl("://missing-scheme.com")).toBe(false);
  });

  it("rejects empty or whitespace-only strings", () => {
    expect(isValidHttpUrl("")).toBe(false);
    expect(isValidHttpUrl("   ")).toBe(false);
    expect(isValidHttpUrl(null as unknown as string)).toBe(false);
    expect(isValidHttpUrl(undefined as unknown as string)).toBe(false);
  });
});
