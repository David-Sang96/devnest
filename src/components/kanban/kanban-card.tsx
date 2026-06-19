"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import type { KanbanCard } from "@/types/kanban";
import { cn } from "@/lib/utils";

const cardVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
};

interface KanbanCardProps {
  card: KanbanCard;
  onRemove: (id: string, columnId: string) => void;
  onCardClick: (cardId: string) => void;
}

export function KanbanCardItem({ card, onRemove, onCardClick }: KanbanCardProps) {
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
      className={cn(
        "group relative flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-sm shadow-sm",
        isDragging && "opacity-40 ring-2 ring-primary"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        aria-label="Drag card"
      >
        <GripVertical className="size-3.5" />
      </button>

      <span
        className="flex-1 leading-snug text-foreground break-words cursor-pointer"
        onClick={() => onCardClick(card.id)}
      >
        {card.title}
      </span>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.1 }}
        onClick={() => onRemove(card.id, card.columnId)}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive transition-colors"
        aria-label="Delete card"
      >
        <Trash2 className="size-3.5" />
      </motion.button>
    </motion.div>
  );
}
