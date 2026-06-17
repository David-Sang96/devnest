"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  generatePassword,
  calcEntropy,
  getStrength,
  type PasswordOptions,
  type StrengthLevel,
} from "@/lib/password";

const DEFAULT_OPTIONS: PasswordOptions = {
  length:    16,
  uppercase: true,
  lowercase: true,
  numbers:   true,
  symbols:   false,
};

export function usePasswordGenerator() {
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_OPTIONS);
  const [password, setPassword] = useState("");

  useEffect(() => {
    setPassword(generatePassword(DEFAULT_OPTIONS));
  }, []);

  const entropy = useMemo(() => calcEntropy(options), [options]);
  const strength: StrengthLevel = useMemo(() => getStrength(entropy), [entropy]);

  const regenerate = useCallback(() => {
    setPassword(generatePassword(options));
  }, [options]);

  const updateOption = useCallback(
    <K extends keyof PasswordOptions>(key: K, value: PasswordOptions[K]) => {
      setOptions((prev) => {
        const next = { ...prev, [key]: value };
        setPassword(generatePassword(next));
        return next;
      });
    },
    []
  );

  return { password, options, entropy, strength, regenerate, updateOption };
}
