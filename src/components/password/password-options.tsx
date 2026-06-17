"use client";

import { motion } from "motion/react";
import type { PasswordOptions, CharsetKey } from "@/lib/password";
import { cn } from "@/lib/utils";

const TOGGLES: { key: CharsetKey; label: string; example: string }[] = [
  { key: "uppercase", label: "Uppercase",  example: "A–Z" },
  { key: "lowercase", label: "Lowercase",  example: "a–z" },
  { key: "numbers",   label: "Numbers",    example: "0–9" },
  { key: "symbols",   label: "Symbols",    example: "!@#$" },
];

const itemVariants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
};

interface PasswordOptionsProps {
  options: PasswordOptions;
  onUpdate: <K extends keyof PasswordOptions>(key: K, value: PasswordOptions[K]) => void;
}

export function PasswordOptionsPanel({ options, onUpdate }: PasswordOptionsProps) {
  return (
    <div className="space-y-5">
      {/* Length slider */}
      <motion.div
        variants={itemVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.2 }}
        className="space-y-2"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Length</span>
          <motion.span
            key={options.length}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.12 }}
            className="tabular-nums font-mono font-semibold text-foreground"
          >
            {options.length}
          </motion.span>
        </div>
        <input
          type="range"
          min={4}
          max={64}
          value={options.length}
          onChange={(e) => onUpdate("length", Number(e.target.value))}
          className="w-full accent-primary cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>4</span>
          <span>64</span>
        </div>
      </motion.div>

      {/* Character set toggles */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Character sets</p>
        <div className="grid grid-cols-2 gap-2">
          {TOGGLES.map(({ key, label, example }, i) => {
            const active = options[key];
            return (
              <motion.button
                key={key}
                variants={itemVariants}
                initial="initial"
                animate="animate"
                transition={{ delay: i * 0.05, duration: 0.2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onUpdate(key, !active)}
                className={cn(
                  "flex items-center justify-between rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                )}
              >
                <span className="font-medium">{label}</span>
                <span className="font-mono text-xs opacity-70">{example}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
