import { sha256 } from "./hash.util";

describe("sha256", () => {
  it("returns a 64-character hex string", () => {
    const result = sha256("hello");
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]+$/);
  });

  it("matches known SHA-256 digest", () => {
    expect(sha256("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("is deterministic — same input produces same output", () => {
    const input = "some article url https://example.com/article";
    expect(sha256(input)).toBe(sha256(input));
  });

  it("different inputs produce different hashes", () => {
    expect(sha256("a")).not.toBe(sha256("b"));
  });

  it("handles empty string", () => {
    expect(sha256("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
});
