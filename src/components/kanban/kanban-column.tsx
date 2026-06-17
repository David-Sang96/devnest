"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { GripVertical, Trash2, Pencil, Check, X } from "lucide-react";
import type { KanbanColumn, KanbanCard } from "@/types/kanban";
import { KanbanCardItem } from "./kanban-card";
import { KanbanAddCard } from "./kanban-add-card";
import { cn } from "@/lib/utils";

const columnVariants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
};

interface KanbanColumnProps {
  column: KanbanColumn;
  cards: KanbanCard[];
  onAddCard: (columnId: string, title: string) => void;
  onRemoveCard: (id: string, columnId: string) => void;
  onRemoveColumn: (id: string, boardId: string) => void;
  onRenameColumn: (id: string, title: string) => void;
}

export function KanbanColumnItem({
  column,
  cards,
  onAddCard,
  onRemoveCard,
  onRemoveColumn,
  onRenameColumn,
}: KanbanColumnProps) {
  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(column.title);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id, data: { type: "column", column } });

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: column.id,
    data: { type: "column", column },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function commitRename() {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== column.title) onRenameColumn(column.id, trimmed);
    else setTitleValue(column.title);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") { setTitleValue(column.title); setEditing(false); }
  }

  const setRef = (node: HTMLDivElement | null) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

  return (
    <motion.div
      ref={setRef}
      style={style}
      variants={columnVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.18 }}
      layout
      className={cn(
        "flex w-64 shrink-0 flex-col rounded-lg border border-border bg-muted/40",
        isDragging && "opacity-40 ring-2 ring-primary"
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground transition-colors active:cursor-grabbing"
          aria-label="Drag column"
        >
          <GripVertical className="size-3.5" />
        </button>

        {editing ? (
          <div className="flex flex-1 items-center gap-1 min-w-0">
            <input
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-w-0 rounded border border-border bg-background px-2 py-0.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={commitRename} className="shrink-0 text-muted-foreground hover:text-foreground">
              <Check className="size-3.5" />
            </button>
            <button onClick={() => { setTitleValue(column.title); setEditing(false); }} className="shrink-0 text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <>
            <span
              className="flex-1 text-sm font-semibold text-foreground cursor-pointer truncate"
              onDoubleClick={() => setEditing(true)}
              title={column.title}
            >
              {column.title}
            </span>

            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{cards.length}</span>

            <button
              onClick={() => setEditing(true)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Rename column"
            >
              <Pencil className="size-3.5" />
            </button>

            <button
              onClick={() => onRemoveColumn(column.id, column.boardId)}
              className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Delete column"
            >
              <Trash2 className="size-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-1.5 p-2 min-h-[2rem] flex-1">
        <SortableContext items={column.cardOrder} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {column.cardOrder.map((cardId) => {
              const card = cards.find((c) => c.id === cardId);
              if (!card) return null;
              return (
                <KanbanCardItem
                  key={card.id}
                  card={card}
                  onRemove={onRemoveCard}
                />
              );
            })}
          </AnimatePresence>
        </SortableContext>
      </div>

      {/* Add card */}
      <KanbanAddCard onAdd={(title) => onAddCard(column.id, title)} />
    </motion.div>
  );
}
