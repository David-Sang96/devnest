"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HardDrive, Clock } from "lucide-react";
import { ExportButton } from "@/components/settings/export-button";
import { ImportButton } from "@/components/settings/import-button";

const sectionVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

export default function SettingsPage() {
  const [lastExport, setLastExport] = useState<number | null>(null);
  const [importKey, setImportKey] = useState(0);

  return (
    <div className="flex h-full items-start justify-center p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="w-full max-w-md space-y-6"
      >
        <motion.h1
          variants={sectionVariants}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.2 }}
          className="text-lg font-semibold text-foreground"
        >
          Settings
        </motion.h1>

        {/* Backup section */}
        <motion.div
          variants={sectionVariants}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.2, delay: 0.06 }}
          className="rounded-lg border border-border bg-card p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <HardDrive className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Data backup</h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            All data is stored locally in your browser&apos;s IndexedDB. Export a backup
            to save a copy, or import one to restore your workspace on a new device.
          </p>

          <div className="flex flex-col gap-3 pt-1">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Export</p>
              <ExportButton onExported={(ts) => setLastExport(ts)} />
              <AnimatePresence>
                {lastExport && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <Clock className="size-3" />
                    Last exported {new Date(lastExport).toLocaleString()}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Import</p>
              <ImportButton
                key={importKey}
                onImported={() => setImportKey((k) => k + 1)}
              />
              <p className="text-xs text-muted-foreground">
                Importing will replace all existing notes, boards, columns, and cards.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Storage info */}
        <motion.div
          variants={sectionVariants}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.2, delay: 0.12 }}
          className="rounded-lg border border-border bg-card p-5 space-y-2"
        >
          <h2 className="text-sm font-semibold text-foreground">Storage</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            DevNest stores everything in <span className="font-mono text-foreground">IndexedDB</span> — a browser-native database.
            No data is ever sent to a server. Clearing your browser&apos;s site data will erase all content.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
