"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Copy, Check, RefreshCw } from "lucide-react";

interface PasswordDisplayProps {
  password: string;
  onRegenerate: () => void;
}

export function PasswordDisplay({ password, onRegenerate }: PasswordDisplayProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-3 min-h-10">
        <AnimatePresence mode="wait">
          <motion.span
            key={password}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex-1 font-mono text-lg font-medium tracking-wider text-foreground break-all select-all"
          >
            {password || <span className="text-muted-foreground">—</span>}
          </motion.span>
        </AnimatePresence>

        <div className="flex shrink-0 gap-1.5">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onRegenerate}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Regenerate password"
          >
            <RefreshCw className="size-4" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleCopy}
            disabled={!password}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40"
            aria-label="Copy password"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={copied ? "check" : "copy"}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.12 }}
              >
                {copied ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <Copy className="size-4" />
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
