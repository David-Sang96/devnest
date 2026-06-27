"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Columns3, Loader2 } from "lucide-react";
import { useKanban } from "@/hooks/use-kanban";
import { useKanbanLabels } from "@/hooks/use-kanban-labels";
import {
  KanbanBoardView,
  BoardTab,
  CreateBoardButton,
} from "@/components/kanban/kanban-board";
import { CardDetailPanel } from "@/components/kanban/card-detail-panel";
import { toast } from "sonner";

export default function KanbanPage() {
  const kanban = useKanban();
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("kanban-active-board");
    if (saved) setActiveBoardId(saved);
  }, []);

  useEffect(() => {
    if (activeBoardId) localStorage.setItem("kanban-active-board", activeBoardId);
  }, [activeBoardId]);

  useEffect(() => {
    if (!selectedCardId) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedCardId(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedCardId]);

  const activeBoard =
    kanban.boards.find((b) => b.id === activeBoardId) ?? kanban.boards[0] ?? null;

  const { labels, createLabel, removeLabel } = useKanbanLabels(activeBoard?.id ?? null);

  const selectedCard =
    selectedCardId != null
      ? kanban.cards.find((c) => c.id === selectedCardId) ?? null
      : null;

  const boardCards = kanban.cards.filter((c) => c.boardId === activeBoard?.id);
  const archivedCards = boardCards.filter((c) => c.archived);

  function handleRemoveLabel(labelId: string) {
    removeLabel(labelId);
    kanban.cards
      .filter((c) => c.boardId === activeBoard?.id)
      .forEach((card) => {
        if (card.labelIds?.includes(labelId)) {
          kanban.updateCard(card.id, {
            labelIds: card.labelIds.filter((id) => id !== labelId),
          });
        }
      });
  }

  function handleDeleteBoard(id: string) {
    if (!window.confirm("Delete this board and all its cards? This cannot be undone.")) return;
    const remaining = kanban.boards.filter((b) => b.id !== id);
    if (activeBoardId === id || activeBoardId === null) {
      setActiveBoardId(remaining[0]?.id ?? null);
    }
    if (selectedCard?.boardId === id) setSelectedCardId(null);
    kanban.removeBoard(id);
  }

  if (kanban.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (kanban.boards.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.22 }}
          className="flex flex-col items-center gap-3"
        >
          <motion.div
            initial={{ rotate: -8 }}
            animate={{ rotate: 0 }}
            transition={{ delay: 0.1, duration: 0.3, type: "spring" }}
          >
            <Columns3 className="size-12 text-muted-foreground/50" />
          </motion.div>
          <p className="text-lg font-medium text-foreground">No boards yet</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Create a board to start organizing your work with columns and cards.
          </p>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.2 }}
          >
            <CreateBoardButton
              onCreate={async (title) => {
                const board = await kanban.createBoard(title);
                setActiveBoardId(board.id);
              }}
            />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Board tabs */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-1 border-b border-border px-4 py-2 overflow-x-auto"
      >
        {kanban.boards.map((board) => (
          <BoardTab
            key={board.id}
            board={board}
            active={(activeBoard?.id ?? null) === board.id}
            onClick={() => {
              setActiveBoardId(board.id);
              setSelectedCardId(null);
            }}
            onRename={(title) => kanban.updateBoard(board.id, { title })}
            onDelete={() => handleDeleteBoard(board.id)}
          />
        ))}
        <CreateBoardButton
          onCreate={async (title) => {
            const board = await kanban.createBoard(title);
            setActiveBoardId(board.id);
          }}
        />
      </motion.div>

      {/* Board + panel row */}
      <div className="flex flex-1 overflow-hidden">
        {/* Board scroll area */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {activeBoard && (
              <motion.div
                key={activeBoard.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
                className="min-h-full p-4"
              >
                <KanbanBoardView
                  board={activeBoard}
                  columns={kanban.columns.filter(
                    (c) => c.boardId === activeBoard.id
                  )}
                  cards={boardCards}
                  archivedCards={archivedCards}
                  onAddColumn={kanban.createColumn}
                  onRemoveColumn={kanban.removeColumn}
                  onRenameColumn={(id, title) =>
                    kanban.updateColumn(id, { title })
                  }
                  onColorColumn={(id, color) =>
                    kanban.updateColumn(id, { color })
                  }
                  onSetWipLimit={(id, limit) =>
                    kanban.updateColumn(id, { wipLimit: limit })
                  }
                  onAddCard={kanban.createCard}
                  onRemoveCard={kanban.removeCard}
                  onUpdateCard={kanban.updateCard}
                  onRestoreCard={kanban.restoreCard}
                  onMoveCard={kanban.moveCard}
                  onReorderCards={kanban.reorderCards}
                  onReorderColumns={kanban.reorderColumns}
                  onCardClick={setSelectedCardId}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card detail panel — slides in from right */}
        <AnimatePresence>
          {selectedCard && (
            <motion.div
              key="card-panel"
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex-shrink-0"
            >
              <CardDetailPanel
                card={selectedCard}
                labels={labels}
                boards={kanban.boards}
                allColumns={kanban.columns}
                onMoveToBoard={(cardId, boardId, columnId) => {
                  kanban.moveBetweenBoards(cardId, boardId, columnId);
                  setSelectedCardId(null);
                }}
                onClose={() => setSelectedCardId(null)}
                onUpdateCard={kanban.updateCard}
                onArchive={(id) => {
                  kanban.archiveCard(id);
                  setSelectedCardId(null);
                }}
                onDelete={async (id, colId) => {
                  const card = kanban.cards.find((c) => c.id === id);
                  const deleted = await kanban.removeCard(id, colId);
                  setSelectedCardId(null);
                  if (card && deleted) {
                    toast("Card deleted", {
                      duration: 5000,
                      action: {
                        label: "Undo",
                        onClick: () => kanban.restoreDeletedCard(card),
                      },
                    });
                  }
                }}
                onCreateLabel={createLabel}
                onRemoveLabel={handleRemoveLabel}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
