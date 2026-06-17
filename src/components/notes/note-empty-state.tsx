"use client";

import { motion } from "motion/react";
import { StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onNew: () => void;
}

export function NoteEmptyState({ onNew }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col items-center justify-center h-full gap-4 text-center px-8"
    >
      <motion.div
        initial={{ rotate: -8, scale: 0.8 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.05, ease: "easeOut" }}
        className="rounded-full bg-muted p-5"
      >
        <StickyNote className="size-8 text-muted-foreground" />
      </motion.div>

      <div>
        <p className="text-sm font-medium text-foreground">No note selected</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
          Pick a note from the list or start a new one.
        </p>
      </div>

      <Button size="sm" onClick={onNew}>
        New Note
      </Button>
    </motion.div>
  );
}
