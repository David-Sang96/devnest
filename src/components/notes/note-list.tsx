"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteListItem } from "./note-list-item";
import type { Note } from "@/types";

interface Props {
  notes: Note[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function NoteList({ notes, selectedId, onSelect, onNew, onDelete }: Props) {
  return (
    <div className="w-64 flex flex-col border-r border-border h-full shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold text-foreground">Notes</span>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={onNew}
          aria-label="New note"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {notes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center gap-2 py-12 text-center"
            >
              <StickyNote className="size-6 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">No notes yet</p>
            </motion.div>
          ) : (
            notes.map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                selected={note.id === selectedId}
                onSelect={() => onSelect(note.id)}
                onDelete={() => onDelete(note.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
