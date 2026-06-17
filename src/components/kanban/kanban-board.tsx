"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Plus, X } from "lucide-react";
import type { KanbanBoard, KanbanColumn, KanbanCard } from "@/types/kanban";
import { KanbanColumnItem } from "./kanban-column";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

interface KanbanBoardProps {
  board: KanbanBoard;
  columns: KanbanColumn[];
  cards: KanbanCard[];
  onAddColumn: (boardId: string, title: string) => void;
  onRemoveColumn: (id: string, boardId: string) => void;
  onRenameColumn: (id: string, title: string) => void;
  onAddCard: (columnId: string, boardId: string, title: string) => void;
  onRemoveCard: (id: string, columnId: string) => void;
  onMoveCard: (
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
    newCardOrder: string[],
    fromCardOrder: string[]
  ) => void;
  onReorderCards: (columnId: string, newCardOrder: string[]) => void;
  onReorderColumns: (boardId: string, newColumnOrder: string[]) => void;
}

export function KanbanBoardView({
  board,
  columns,
  cards,
  onAddColumn,
  onRemoveColumn,
  onRenameColumn,
  onAddCard,
  onRemoveCard,
  onMoveCard,
  onReorderCards,
  onReorderColumns,
}: KanbanBoardProps) {
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);
  const [activeColumn, setActiveColumn] = useState<KanbanColumn | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const boardColumns = board.columnOrder
    .map((id) => columns.find((c) => c.id === id))
    .filter(Boolean) as KanbanColumn[];

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.type === "card") setActiveCard(data.card);
    if (data?.type === "column") setActiveColumn(data.column);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    if (activeData?.type !== "card") return;

    const activeCard = activeData.card as KanbanCard;
    const overData = over.data.current;

    const targetColumnId =
      overData?.type === "column"
        ? over.id as string
        : overData?.type === "card"
        ? (overData.card as KanbanCard).columnId
        : null;

    if (!targetColumnId || activeCard.columnId === targetColumnId) return;

    const fromCol = columns.find((c) => c.id === activeCard.columnId);
    const toCol = columns.find((c) => c.id === targetColumnId);
    if (!fromCol || !toCol) return;

    const fromOrder = fromCol.cardOrder.filter((id) => id !== activeCard.id);
    const overCardIndex = toCol.cardOrder.indexOf(over.id as string);
    const insertAt = overCardIndex >= 0 ? overCardIndex : toCol.cardOrder.length;
    const toOrder = [...toCol.cardOrder];
    toOrder.splice(insertAt, 0, activeCard.id);

    onMoveCard(activeCard.id, fromCol.id, toCol.id, toOrder, fromOrder);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);
    setActiveColumn(null);
    if (!over || active.id === over.id) return;

    const activeData = active.data.current;

    if (activeData?.type === "column") {
      const oldIndex = board.columnOrder.indexOf(active.id as string);
      const newIndex = board.columnOrder.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderColumns(board.id, arrayMove(board.columnOrder, oldIndex, newIndex));
      }
      return;
    }

    if (activeData?.type === "card") {
      const card = activeData.card as KanbanCard;
      const col = columns.find((c) => c.id === card.columnId);
      if (!col) return;

      const oldIndex = col.cardOrder.indexOf(active.id as string);
      const newIndex = col.cardOrder.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderCards(col.id, arrayMove(col.cardOrder, oldIndex, newIndex));
      }
    }
  }

  function submitAddColumn() {
    const trimmed = newColTitle.trim();
    if (!trimmed) return;
    onAddColumn(board.id, trimmed);
    setNewColTitle("");
    setAddingColumn(false);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 h-full items-start">
        <SortableContext
          items={board.columnOrder}
          strategy={horizontalListSortingStrategy}
        >
          <AnimatePresence>
            {boardColumns.map((col) => (
              <KanbanColumnItem
                key={col.id}
                column={col}
                cards={cards.filter((c) => c.columnId === col.id)}
                onAddCard={(columnId, title) =>
                  onAddCard(columnId, board.id, title)
                }
                onRemoveCard={onRemoveCard}
                onRemoveColumn={onRemoveColumn}
                onRenameColumn={onRenameColumn}
              />
            ))}
          </AnimatePresence>
        </SortableContext>

        {/* Add column */}
        <div className="w-64 shrink-0">
          <AnimatePresence mode="wait">
            {addingColumn ? (
              <motion.div
                key="col-form"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="rounded-lg border border-border bg-muted/40 p-3"
              >
                <input
                  autoFocus
                  value={newColTitle}
                  onChange={(e) => setNewColTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitAddColumn();
                    if (e.key === "Escape") { setNewColTitle(""); setAddingColumn(false); }
                  }}
                  placeholder="Column title..."
                  className={cn(
                    "w-full rounded-md border border-border bg-background px-3 py-1.5",
                    "text-sm text-foreground placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring"
                  )}
                />
                <div className="mt-2 flex gap-1.5">
                  <button
                    onClick={submitAddColumn}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Add column
                  </button>
                  <button
                    onClick={() => { setNewColTitle(""); setAddingColumn(false); }}
                    className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="col-trigger"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                onClick={() => setAddingColumn(true)}
                className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
              >
                <Plus className="size-4" />
                Add a column
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <DragOverlay>
        {activeCard && (
          <div className="rotate-1 opacity-90">
            <div className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-sm shadow-lg">
              <span className="flex-1 leading-snug text-foreground">{activeCard.title}</span>
            </div>
          </div>
        )}
        {activeColumn && (
          <div className="opacity-90 w-64">
            <div className="rounded-lg border border-primary bg-muted/40 px-3 py-2.5 text-sm font-semibold text-foreground shadow-lg">
              {activeColumn.title}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

interface BoardTabProps {
  board: KanbanBoard;
  active: boolean;
  onClick: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export function BoardTab({ board, active, onClick, onRename, onDelete }: BoardTabProps) {
  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(board.title);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function commitRename() {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== board.title) onRename(trimmed);
    else setTitleValue(board.title);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={titleValue}
        onChange={(e) => setTitleValue(e.target.value)}
        onBlur={commitRename}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitRename();
          if (e.key === "Escape") { setTitleValue(board.title); setEditing(false); }
        }}
        className="w-28 rounded-md border border-border bg-background px-2 py-1 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    );
  }

  return (
    <>
      <motion.div layout className="group relative flex items-center">
        <motion.button
          layout
          onClick={onClick}
          onDoubleClick={() => { setTitleValue(board.title); setEditing(true); }}
          className={cn(
            "relative py-1.5 pl-3 pr-7 text-sm font-medium rounded-md transition-colors",
            active
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          {active && (
            <motion.div
              layoutId="board-tab-bg"
              className="absolute inset-0 bg-primary rounded-md"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <span className="relative z-10">{board.title}</span>
        </motion.button>
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
          className={cn(
            "absolute right-1 z-20 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
            active
              ? "text-primary-foreground/70 hover:text-primary-foreground"
              : "text-muted-foreground hover:text-destructive"
          )}
          aria-label="Delete board"
        >
          <X className="size-3" />
        </button>
      </motion.div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{board.title}&rdquo;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            All columns and cards will be permanently deleted.
          </p>
          <DialogFooter>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { setConfirmDelete(false); onDelete(); }}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface CreateBoardButtonProps {
  onCreate: (title: string) => void;
}

export function CreateBoardButton({ onCreate }: CreateBoardButtonProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setValue("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setValue(""); }}>
      <DialogTrigger
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Create board"
      >
        <Plus className="size-4" />
        <span className="text-xs">New board</span>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New board</DialogTitle>
        </DialogHeader>

        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Board name..."
          className={cn(
            "w-full rounded-md border border-border bg-background px-3 py-2",
            "text-sm text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring"
          )}
        />

        <DialogFooter>
          <button
            onClick={submit}
            disabled={!value.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Create
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
