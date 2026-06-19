"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Columns3 } from "lucide-react";
import { useKanban } from "@/hooks/use-kanban";
import {
  KanbanBoardView,
  BoardTab,
  CreateBoardButton,
} from "@/components/kanban/kanban-board";

export default function KanbanPage() {
  const kanban = useKanban();
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

  const activeBoard =
    kanban.boards.find((b) => b.id === activeBoardId) ?? kanban.boards[0] ?? null;

  function handleDeleteBoard(id: string) {
    const remaining = kanban.boards.filter((b) => b.id !== id);
    if (activeBoardId === id || activeBoardId === null) {
      setActiveBoardId(remaining[0]?.id ?? null);
    }
    kanban.removeBoard(id);
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
      {/* Board tabs + create button */}
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
            onClick={() => setActiveBoardId(board.id)}
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

      {/* Board content */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <AnimatePresence mode="wait">
          {activeBoard && (
            <motion.div
              key={activeBoard.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
              className="flex h-full gap-3 p-4"
            >
              <KanbanBoardView
                board={activeBoard}
                columns={kanban.columns.filter(
                  (c) => c.boardId === activeBoard.id
                )}
                cards={kanban.cards.filter((c) => c.boardId === activeBoard.id)}
                onAddColumn={kanban.createColumn}
                onRemoveColumn={kanban.removeColumn}
                onRenameColumn={(id, title) =>
                  kanban.updateColumn(id, { title })
                }
                onAddCard={kanban.createCard}
                onRemoveCard={kanban.removeCard}
                onMoveCard={kanban.moveCard}
                onReorderCards={kanban.reorderCards}
                onReorderColumns={kanban.reorderColumns}
                onColorColumn={(id, color) =>
                  kanban.updateColumn(id, { color })
                }
                onCardClick={() => {}}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
