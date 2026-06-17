"use client";

import { motion, AnimatePresence } from "motion/react";
import { tokenizeJson, type JsonToken } from "@/lib/json-format";

const tokenClass: Record<JsonToken["type"], string> = {
  key:         "json-key",
  string:      "json-string",
  number:      "json-number",
  boolean:     "json-bool",
  null:        "json-null",
  punctuation: "",
};

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
              key="output"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="min-h-full p-4 font-mono text-sm whitespace-pre"
            >
              {tokenizeJson(value).map((token, i) => (
                <span key={i} className={tokenClass[token.type]}>
                  {token.value}
                </span>
              ))}
            </motion.pre>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex h-full min-h-30 items-center justify-center text-sm text-muted-foreground/50 font-mono"
            >
              output appears here
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
