"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, RotateCcw, Trash2 } from "lucide-react";
import type { KanbanCard, KanbanColumn } from "@/types/kanban";

interface ArchiveDrawerProps {
  cards: KanbanCard[];
  columns: KanbanColumn[];
  onRestore: (id: string) => void;
  onDelete: (id: string, columnId: string) => void;
}

export function ArchiveDrawer({
  cards,
  columns,
  onRestore,
  onDelete,
}: ArchiveDrawerProps) {
  const [open, setOpen] = useState(false);

  if (cards.length === 0) return null;

  return (
    <div className="mt-4 w-full min-w-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {open ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
        🗃 Archived ({cards.length})
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-1">
          {cards.map((card) => {
            const col = columns.find((c) => c.id === card.columnId);
            return (
              <div
                key={card.id}
                className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground line-through">
                  {card.title}
                </span>
                {col && (
                  <span className="shrink-0 text-xs text-muted-foreground/60">
                    {col.title}
                  </span>
                )}
                <button
                  onClick={() => onRestore(card.id)}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Restore card"
                >
                  <RotateCcw className="size-3.5" />
                </button>
                <button
                  onClick={() => onDelete(card.id, card.columnId)}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                  aria-label="Delete permanently"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
