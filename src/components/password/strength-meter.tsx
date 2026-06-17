"use client";

import { motion } from "motion/react";
import type { StrengthLevel } from "@/lib/password";
import { cn } from "@/lib/utils";

const LEVELS: StrengthLevel[] = ["Weak", "Fair", "Strong", "Very Strong"];

const levelStyle: Record<StrengthLevel, { bar: string; label: string }> = {
  "Weak":        { bar: "bg-rose-500",   label: "text-rose-500"   },
  "Fair":        { bar: "bg-amber-500",  label: "text-amber-500"  },
  "Strong":      { bar: "bg-emerald-500",label: "text-emerald-500"},
  "Very Strong": { bar: "bg-sky-500",    label: "text-sky-500"    },
};

interface StrengthMeterProps {
  strength: StrengthLevel;
  entropy: number;
}

export function StrengthMeter({ strength, entropy }: StrengthMeterProps) {
  const filled = LEVELS.indexOf(strength) + 1;
  const { label } = levelStyle[strength];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Strength</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground tabular-nums">
            {entropy.toFixed(0)} bits
          </span>
          <motion.span
            key={strength}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className={cn("font-semibold", label)}
          >
            {strength}
          </motion.span>
        </div>
      </div>

      <div className="flex gap-1">
        {LEVELS.map((level, i) => {
          const active = i < filled;
          const { bar } = levelStyle[level];
          return (
            <div key={level} className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", active ? bar : "")}
                initial={{ width: 0 }}
                animate={{ width: active ? "100%" : "0%" }}
                transition={{ duration: 0.25, delay: i * 0.04, ease: "easeOut" }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
