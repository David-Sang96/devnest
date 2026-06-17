"use client";

import { motion, AnimatePresence } from "motion/react";
import { AlertCircle } from "lucide-react";

interface JsonErrorBannerProps {
  error: string | null;
}

export function JsonErrorBanner({ error }: JsonErrorBannerProps) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.18 }}
          className="overflow-hidden"
        >
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span className="font-mono break-all">{error}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
