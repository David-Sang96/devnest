"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, AlertCircle, Check } from "lucide-react";
import { parseBackup, importData } from "@/lib/backup";

type ImportState = "idle" | "confirm" | "loading" | "done" | "error";

interface ImportButtonProps {
  onImported: () => void;
}

export function ImportButton({ onImported }: ImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ImportState>("idle");
  const [pendingJson, setPendingJson] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const json = ev.target?.result as string;
      const parsed = parseBackup(json);
      if (!parsed) {
        setErrorMsg("Invalid backup file — not a DevNest backup.");
        setState("error");
        setTimeout(() => setState("idle"), 3000);
      } else {
        setPendingJson(json);
        setState("confirm");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function confirmImport() {
    if (!pendingJson) return;
    const parsed = parseBackup(pendingJson);
    if (!parsed) return;
    setState("loading");
    try {
      await importData(parsed);
      setState("done");
      onImported();
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setErrorMsg("Import failed — please try again.");
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
    setPendingJson(null);
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {state === "confirm" ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span className="flex-1">This will overwrite all current data.</span>
            <button
              onClick={confirmImport}
              className="rounded px-2 py-0.5 font-medium text-amber-700 hover:bg-amber-500/20 dark:text-amber-300 transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => { setPendingJson(null); setState("idle"); }}
              className="rounded px-2 py-0.5 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        ) : state === "error" ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <AlertCircle className="size-4 shrink-0" />
            {errorMsg}
          </motion.div>
        ) : (
          <motion.button
            key="trigger"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => inputRef.current?.click()}
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
                {state === "done" ? (
                  <><Check className="size-4 text-emerald-500" /> Imported!</>
                ) : (
                  <><Upload className="size-4" /> Import backup</>
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
