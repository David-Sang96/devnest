"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCheck } from "lucide-react";
import type { Note } from "@/types";

interface Props {
  note: Note;
  onUpdate: (id: string, changes: Partial<Pick<Note, "content">>) => Promise<void>;
}

export function NoteEditor({ note, onUpdate }: Props) {
  const [content, setContent] = useState(note.content);
  const [showSaved, setShowSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    setContent(value);
    setShowSaved(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await onUpdate(note.id, { content: value });
      setShowSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setShowSaved(false), 2000);
    }, 500);
  }

  const title = content.split("\n")[0].trim() || "Untitled";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <h2 className="text-base font-semibold truncate text-foreground">{title}</h2>
        <AnimatePresence>
          {showSaved && (
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1 text-xs text-muted-foreground"
            >
              <CheckCheck className="size-3" />
              Saved
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <textarea
        className="flex-1 w-full resize-none bg-transparent px-6 py-5 text-sm leading-7 text-foreground placeholder:text-muted-foreground outline-none font-mono"
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Start writing..."
        autoFocus
      />
    </motion.div>
  );
}
