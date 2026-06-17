"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Check, Loader2 } from "lucide-react";
import { exportAllData, downloadBackup } from "@/lib/backup";

interface ExportButtonProps {
  onExported: (timestamp: number) => void;
}

export function ExportButton({ onExported }: ExportButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function handleExport() {
    setState("loading");
    try {
      const data = await exportAllData();
      downloadBackup(data);
      onExported(data.exportedAt);
      setState("done");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("idle");
    }
  }

  const icons = {
    idle:    <Download className="size-4" />,
    loading: <Loader2 className="size-4 animate-spin" />,
    done:    <Check className="size-4 text-emerald-500" />,
  };

  const labels = {
    idle:    "Export backup",
    loading: "Exporting…",
    done:    "Exported!",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleExport}
      disabled={state === "loading"}
      className="flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={state}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.12 }}
          className="flex items-center gap-2"
        >
          {icons[state]}
          {labels[state]}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
