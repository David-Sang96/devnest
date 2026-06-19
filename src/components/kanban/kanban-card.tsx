"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import type { KanbanCard, KanbanLabel, Priority } from "@/types/kanban";
import { cn } from "@/lib/utils";

const PRIORITY_COLOR: Record<Priority, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  urgent: "#ef4444",
};

const cardVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
};

interface KanbanCardProps {
  card: KanbanCard;
  labels?: KanbanLabel[];
  onRemove: (id: string, columnId: string) => void;
  onCardClick: (cardId: string) => void;
}

export function KanbanCardItem({
  card,
  labels = [],
  onRemove,
  onCardClick,
}: KanbanCardProps) {
  const [hovered, setHovered] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { type: "card", card } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cardLabels = (card.labelIds ?? [])
    .map((id) => labels.find((l) => l.id === id))
    .filter(Boolean) as KanbanLabel[];

  const visibleLabels = cardLabels.slice(0, 3);
  const extraCount = cardLabels.length - visibleLabels.length;

  const isOverdue = !!card.dueDate && card.dueDate < Date.now();
  const dueDateDisplay = card.dueDate
    ? new Date(card.dueDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  const hasMeta =
    card.priority || card.dueDate || (card.labelIds?.length ?? 0) > 0;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.15 }}
      layout
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => onCardClick(card.id)}
      className={cn(
        "group relative flex cursor-pointer items-start gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-sm shadow-sm hover:border-primary/50 transition-colors",
        isDragging && "opacity-40 ring-2 ring-primary"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        aria-label="Drag card"
      >
        <GripVertical className="size-3.5" />
      </button>

      <div className="min-w-0 flex-1">
        <span className="leading-snug text-foreground break-words">
          {card.title}
        </span>

        {hasMeta && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {card.priority && (
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: PRIORITY_COLOR[card.priority] }}
                title={card.priority}
              />
            )}
            {dueDateDisplay && (
              <span
                className={cn(
                  "text-xs",
                  isOverdue ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {dueDateDisplay}
              </span>
            )}
            {visibleLabels.map((l) => (
              <span
                key={l.id}
                className="rounded-full px-1.5 py-px text-xs font-medium text-white"
                style={{ background: l.color }}
              >
                {l.name}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="text-xs text-muted-foreground">
                +{extraCount}
              </span>
            )}
          </div>
        )}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.1 }}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(card.id, card.columnId);
        }}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive transition-colors"
        aria-label="Delete card"
      >
        <Trash2 className="size-3.5" />
      </motion.button>
    </motion.div>
  );
}
