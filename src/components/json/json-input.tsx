"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface JsonInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function JsonInput({ value, onChange }: JsonInputProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col flex-1 min-h-0"
    >
      <label className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Input
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'{\n  "paste": "your JSON here"\n}'}
        spellCheck={false}
        className={cn(
          "flex-1 resize-none rounded-md border border-border bg-muted/30 px-4 py-3",
          "font-mono text-sm text-foreground placeholder:text-muted-foreground/50",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          "transition-colors"
        )}
      />
    </motion.div>
  );
}
