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
import { GripVertical, Trash2, Pencil, Check, X, Palette } from "lucide-react";
import type { KanbanColumn, KanbanCard } from "@/types/kanban";
import { KanbanCardItem } from "./kanban-card";
import { KanbanAddCard } from "./kanban-add-card";
import { ColumnColorPicker } from "./column-color-picker";
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
  onColorColumn: (id: string, color: string | undefined) => void;
  onCardClick: (cardId: string) => void;
  onSetWipLimit: (id: string, limit: number | undefined) => void;
}

export function KanbanColumnItem({
  column,
  cards,
  onAddCard,
  onRemoveCard,
  onRemoveColumn,
  onRenameColumn,
  onColorColumn,
  onCardClick,
  onSetWipLimit,
}: KanbanColumnProps) {
  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(column.title);
  const [showColorPicker, setShowColorPicker] = useState(false);

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
    if (e.key === "Escape") {
      setTitleValue(column.title);
      setEditing(false);
    }
  }

  const setRef = (node: HTMLDivElement | null) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

  const activeCards = cards.filter((c) => !c.archived);
  const hasColor = !!column.color;

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
      <div
        className={cn(
          "relative flex items-center gap-2 rounded-t-lg px-3 py-2.5",
          hasColor ? "border-b border-black/10" : "border-b border-border"
        )}
        style={hasColor ? { background: column.color } : undefined}
      >
        <button
          {...attributes}
          {...listeners}
          className={cn(
            "cursor-grab touch-none transition-colors active:cursor-grabbing",
            hasColor
              ? "text-white/60 hover:text-white"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label="Drag column"
        >
          <GripVertical className="size-3.5" />
        </button>

        {editing ? (
          <div className="flex flex-1 flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 min-w-0 rounded border border-border bg-background px-2 py-0.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={commitRename}
                className={cn(
                  "shrink-0 transition-colors",
                  hasColor ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Check className="size-3.5" />
              </button>
              <button
                onClick={() => {
                  setTitleValue(column.title);
                  setEditing(false);
                }}
                className={cn(
                  "shrink-0 transition-colors",
                  hasColor ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={cn("text-xs", hasColor ? "text-white/70" : "text-muted-foreground")}>WIP</span>
              <input
                type="number"
                min="1"
                placeholder="No limit"
                defaultValue={column.wipLimit ?? ""}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  onSetWipLimit(column.id, val ? Math.max(1, parseInt(val, 10)) : undefined);
                }}
                className="w-20 rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        ) : (
          <>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm font-semibold",
                hasColor ? "text-white" : "text-foreground"
              )}
              onDoubleClick={() => setEditing(true)}
              title={column.title}
            >
              {column.title}
            </span>

            {/* Card count badge */}
            {(() => {
              const count = activeCards.length;
              const limit = column.wipLimit;
              const overLimit = limit !== undefined && count > limit;
              const atLimit = limit !== undefined && count === limit;
              return (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0 text-xs tabular-nums font-medium",
                    overLimit
                      ? "bg-destructive/20 text-destructive"
                      : atLimit
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                      : hasColor
                      ? "bg-black/20 text-white/90"
                      : "bg-muted text-muted-foreground"
                  )}
                  title={limit !== undefined ? `WIP limit: ${limit}` : undefined}
                >
                  {limit !== undefined ? `${count}/${limit}` : count}
                </span>
              );
            })()}

            {/* Color picker trigger */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowColorPicker((v) => !v)}
                className={cn(
                  "transition-colors",
                  hasColor ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Column color"
              >
                <Palette className="size-3.5" />
              </button>
              {showColorPicker && (
                <ColumnColorPicker
                  currentColor={column.color}
                  onSelect={(color) => onColorColumn(column.id, color)}
                  onClose={() => setShowColorPicker(false)}
                />
              )}
            </div>

            <button
              onClick={() => setEditing(true)}
              className={cn(
                "shrink-0 transition-colors",
                hasColor ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Rename column"
            >
              <Pencil className="size-3.5" />
            </button>

            <button
              onClick={() => onRemoveColumn(column.id, column.boardId)}
              className={cn(
                "shrink-0 transition-colors",
                hasColor
                  ? "text-white/70 hover:text-white"
                  : "text-muted-foreground hover:text-destructive"
              )}
              aria-label="Delete column"
            >
              <Trash2 className="size-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Cards — only non-archived */}
      <div className="flex flex-col gap-1.5 p-2 min-h-[2rem] flex-1">
        <SortableContext
          items={column.cardOrder.filter(
            (id) => !cards.find((c) => c.id === id)?.archived
          )}
          strategy={verticalListSortingStrategy}
        >
          <AnimatePresence>
            {column.cardOrder.map((cardId) => {
              const card = cards.find((c) => c.id === cardId);
              if (!card || card.archived) return null;
              return (
                <KanbanCardItem
                  key={card.id}
                  card={card}
                  onRemove={onRemoveCard}
                  onCardClick={onCardClick}
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
