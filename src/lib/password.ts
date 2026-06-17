const CHARSETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers:   "0123456789",
  symbols:   "!@#$%^&*()_+-=[]{}|;:,.<>?",
} as const;

export type CharsetKey = keyof typeof CHARSETS;

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

export function generatePassword(opts: PasswordOptions): string {
  const pool = (Object.keys(CHARSETS) as CharsetKey[])
    .filter((k) => opts[k])
    .map((k) => CHARSETS[k])
    .join("");

  if (!pool) return "";

  const bytes = crypto.getRandomValues(new Uint32Array(opts.length));
  return Array.from(bytes, (b) => pool[b % pool.length]).join("");
}

export function calcEntropy(opts: PasswordOptions): number {
  const poolSize = (Object.keys(CHARSETS) as CharsetKey[])
    .filter((k) => opts[k])
    .reduce((acc, k) => acc + CHARSETS[k].length, 0);

  if (!poolSize) return 0;
  return opts.length * Math.log2(poolSize);
}

export type StrengthLevel = "Weak" | "Fair" | "Strong" | "Very Strong";

export function getStrength(entropy: number): StrengthLevel {
  if (entropy < 40)  return "Weak";
  if (entropy < 80)  return "Fair";
  if (entropy < 120) return "Strong";
  return "Very Strong";
}
