"use client";

import { motion } from "motion/react";
import { Trash2, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { extractPlainText } from "@/lib/note-content";
import type { Note } from "@/types";

interface Props {
  note: Note;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

export function NoteListItem({ note, selected, onSelect, onDelete, onTogglePin }: Props) {
  const preview = extractPlainText(note.content);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "group flex items-start justify-between gap-2 rounded-md px-3 py-2.5 mb-0.5 cursor-pointer transition-colors",
        selected
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-foreground"
      )}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{note.title}</p>
        <p
          className={cn(
            "text-xs truncate mt-0.5",
            selected ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {preview || new Date(note.updatedAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
        <Button
          size="icon-xs"
          variant="ghost"
          className={cn(
            "transition-opacity",
            note.pinned ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            selected && "hover:bg-white/20 text-primary-foreground"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          aria-label={note.pinned ? "Unpin note" : "Pin note"}
        >
          <Pin className={cn("size-3", note.pinned && "fill-current")} />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          className={cn(
            "opacity-0 group-hover:opacity-100 shrink-0 transition-opacity",
            selected && "hover:bg-white/20 text-primary-foreground"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete note"
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
    </motion.div>
  );
}
