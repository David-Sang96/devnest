import { describe, it, expect } from "vitest";
import {
  generatePassword,
  calcEntropy,
  getStrength,
  type PasswordOptions,
} from "@/lib/password";

const ALL: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

const NONE: PasswordOptions = {
  length: 16,
  uppercase: false,
  lowercase: false,
  numbers: false,
  symbols: false,
};

// ─── calcEntropy ─────────────────────────────────────────────────────────────

describe("calcEntropy()", () => {
  it("returns 0 when no charsets are enabled", () => {
    expect(calcEntropy(NONE)).toBe(0);
  });

  it("increases as length grows", () => {
    const short = calcEntropy({ ...ALL, length: 8 });
    const long = calcEntropy({ ...ALL, length: 32 });
    expect(long).toBeGreaterThan(short);
  });

  it("increases as more charsets are added", () => {
    const lowerOnly = calcEntropy({ length: 16, uppercase: false, lowercase: true, numbers: false, symbols: false });
    const withNumbers = calcEntropy({ length: 16, uppercase: false, lowercase: true, numbers: true, symbols: false });
    expect(withNumbers).toBeGreaterThan(lowerOnly);
  });

  it("computes entropy correctly for lowercase-only (pool=26)", () => {
    const opts: PasswordOptions = { length: 10, uppercase: false, lowercase: true, numbers: false, symbols: false };
    expect(calcEntropy(opts)).toBeCloseTo(10 * Math.log2(26));
  });

  it("computes entropy correctly for digits-only (pool=10)", () => {
    const opts: PasswordOptions = { length: 8, uppercase: false, lowercase: false, numbers: true, symbols: false };
    expect(calcEntropy(opts)).toBeCloseTo(8 * Math.log2(10));
  });
});

// ─── getStrength ─────────────────────────────────────────────────────────────

describe("getStrength()", () => {
  it("returns 'Weak' for entropy below 40", () => {
    expect(getStrength(0)).toBe("Weak");
    expect(getStrength(39.9)).toBe("Weak");
  });

  it("returns 'Fair' for entropy in [40, 80)", () => {
    expect(getStrength(40)).toBe("Fair");
    expect(getStrength(79.9)).toBe("Fair");
  });

  it("returns 'Strong' for entropy in [80, 120)", () => {
    expect(getStrength(80)).toBe("Strong");
    expect(getStrength(119.9)).toBe("Strong");
  });

  it("returns 'Very Strong' for entropy ≥ 120", () => {
    expect(getStrength(120)).toBe("Very Strong");
    expect(getStrength(256)).toBe("Very Strong");
  });
});

// ─── generatePassword ────────────────────────────────────────────────────────

describe("generatePassword()", () => {
  it("returns empty string when no charsets are enabled", () => {
    expect(generatePassword(NONE)).toBe("");
  });

  it("returns a password of exactly the requested length", () => {
    expect(generatePassword({ ...ALL, length: 12 })).toHaveLength(12);
    expect(generatePassword({ ...ALL, length: 32 })).toHaveLength(32);
  });

  it("produces only lowercase letters when only lowercase is enabled", () => {
    const pw = generatePassword({ length: 50, uppercase: false, lowercase: true, numbers: false, symbols: false });
    expect(pw).toMatch(/^[a-z]+$/);
  });

  it("produces only uppercase letters when only uppercase is enabled", () => {
    const pw = generatePassword({ length: 50, uppercase: true, lowercase: false, numbers: false, symbols: false });
    expect(pw).toMatch(/^[A-Z]+$/);
  });

  it("produces only digits when only numbers are enabled", () => {
    const pw = generatePassword({ length: 50, uppercase: false, lowercase: false, numbers: true, symbols: false });
    expect(pw).toMatch(/^[0-9]+$/);
  });

  it("produces only symbol characters when only symbols are enabled", () => {
    const pw = generatePassword({ length: 50, uppercase: false, lowercase: false, numbers: false, symbols: true });
    expect(pw).toMatch(/^[!@#$%^&*()_+\-=[\]{}|;:,.<>?]+$/);
  });

  it("generates unique passwords on successive calls (probabilistic)", () => {
    const passwords = new Set(Array.from({ length: 5 }, () => generatePassword(ALL)));
    // All 5 passwords are unique (collision probability is astronomically low)
    expect(passwords.size).toBe(5);
  });

  it("handles minimum length of 1", () => {
    expect(generatePassword({ ...ALL, length: 1 })).toHaveLength(1);
  });

  it("handles maximum slider length of 64", () => {
    expect(generatePassword({ ...ALL, length: 64 })).toHaveLength(64);
  });
});
