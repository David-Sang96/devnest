"use client";

import { motion, AnimatePresence } from "motion/react";

interface JsonOutputProps {
  value: string;
}

export function JsonOutput({ value }: JsonOutputProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.05 }}
      className="flex flex-col flex-1 min-h-0"
    >
      <label className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Output
      </label>
      <div className="flex-1 overflow-auto rounded-md border border-border bg-muted/30">
        <AnimatePresence mode="wait">
          {value ? (
            <motion.pre
              key={value.slice(0, 40)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="min-h-full p-4 font-mono text-sm text-foreground whitespace-pre-wrap break-all"
            >
              {value}
            </motion.pre>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex h-full min-h-[120px] items-center justify-center text-sm text-muted-foreground/50 font-mono"
            >
              output appears here
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
