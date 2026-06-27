"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { KanbanBoard, KanbanColumn, KanbanCard } from "@/types/kanban";
import { getDB } from "@/lib/db";

interface KanbanState {
  boards: KanbanBoard[];
  columns: KanbanColumn[];
  cards: KanbanCard[];
}

export function useKanban() {
  const [state, setState] = useState<KanbanState>({
    boards: [],
    columns: [],
    cards: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const db = await getDB();
        const [boards, columns, cards] = await Promise.all([
          db.getAll("kanban_boards"),
          db.getAll("kanban_columns"),
          db.getAll("kanban_cards"),
        ]);
        boards.sort((a, b) => a.createdAt - b.createdAt);
        setState({ boards, columns, cards });
      } catch {
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const createBoard = useCallback(async (title: string) => {
    const now = Date.now();
    const board: KanbanBoard = { id: crypto.randomUUID(), title, columnOrder: [], createdAt: now, updatedAt: now };
    try {
      const db = await getDB();
      await db.put("kanban_boards", board);
      setState((prev) => ({ ...prev, boards: [...prev.boards, board] }));
    } catch {
      toast.error("Failed to save");
    }
    return board;
  }, []);

  const updateBoard = useCallback(
    async (id: string, changes: Partial<Pick<KanbanBoard, "title" | "columnOrder">>) => {
      const db = await getDB();
      setState((prev) => {
        const boards = prev.boards.map((b) =>
          b.id === id ? { ...b, ...changes, updatedAt: Date.now() } : b
        );
        const updated = boards.find((b) => b.id === id)!;
        db.put("kanban_boards", updated).catch(() => toast.error("Failed to save"));
        return { ...prev, boards };
      });
    },
    []
  );

  const removeBoard = useCallback(async (id: string) => {
    try {
      const db = await getDB();
      const tx = db.transaction(
        ["kanban_boards", "kanban_columns", "kanban_cards", "kanban_labels"],
        "readwrite"
      );
      await tx.objectStore("kanban_boards").delete(id);
      const colIds = (await tx.objectStore("kanban_columns").index("boardId").getAllKeys(id)) as string[];
      for (const colId of colIds) {
        const cardKeys = (await tx.objectStore("kanban_cards").index("columnId").getAllKeys(colId)) as string[];
        for (const cardKey of cardKeys) await tx.objectStore("kanban_cards").delete(cardKey);
        await tx.objectStore("kanban_columns").delete(colId);
      }
      const labelKeys = (await tx.objectStore("kanban_labels").index("boardId").getAllKeys(id)) as string[];
      for (const labelKey of labelKeys) await tx.objectStore("kanban_labels").delete(labelKey);
      await tx.done;
      setState((prev) => ({
        boards: prev.boards.filter((b) => b.id !== id),
        columns: prev.columns.filter((c) => c.boardId !== id),
        cards: prev.cards.filter((c) => c.boardId !== id),
      }));
    } catch {
      toast.error("Failed to save");
    }
  }, []);

  const createColumn = useCallback(async (boardId: string, title: string) => {
    const now = Date.now();
    const column: KanbanColumn = { id: crypto.randomUUID(), boardId, title, cardOrder: [], createdAt: now, updatedAt: now };
    try {
      const db = await getDB();
      await db.put("kanban_columns", column);
      setState((prev) => {
        const boards = prev.boards.map((b) => {
          if (b.id !== boardId) return b;
          const updated = { ...b, columnOrder: [...b.columnOrder, column.id], updatedAt: now };
          db.put("kanban_boards", updated).catch(() => toast.error("Failed to save"));
          return updated;
        });
        return { ...prev, boards, columns: [...prev.columns, column] };
      });
    } catch {
      toast.error("Failed to save");
    }
    return column;
  }, []);

  const updateColumn = useCallback(
    async (id: string, changes: Partial<Pick<KanbanColumn, "title" | "cardOrder" | "color">>) => {
      const db = await getDB();
      setState((prev) => {
        const columns = prev.columns.map((c) =>
          c.id === id ? { ...c, ...changes, updatedAt: Date.now() } : c
        );
        const updated = columns.find((c) => c.id === id)!;
        db.put("kanban_columns", updated).catch(() => toast.error("Failed to save"));
        return { ...prev, columns };
      });
    },
    []
  );

  const removeColumn = useCallback(async (id: string, boardId: string) => {
    try {
      const db = await getDB();
      const tx = db.transaction(
        ["kanban_boards", "kanban_columns", "kanban_cards"],
        "readwrite"
      );
      await tx.objectStore("kanban_columns").delete(id);
      const cardKeys = (await tx.objectStore("kanban_cards").index("columnId").getAllKeys(id)) as string[];
      for (const cardKey of cardKeys) await tx.objectStore("kanban_cards").delete(cardKey);
      const board = await tx.objectStore("kanban_boards").get(boardId);
      if (board) {
        const updated = {
          ...board,
          columnOrder: board.columnOrder.filter((cid: string) => cid !== id),
          updatedAt: Date.now(),
        };
        await tx.objectStore("kanban_boards").put(updated);
      }
      await tx.done;
      setState((prev) => ({
        boards: prev.boards.map((b) =>
          b.id === boardId ? { ...b, columnOrder: b.columnOrder.filter((cid) => cid !== id) } : b
        ),
        columns: prev.columns.filter((c) => c.id !== id),
        cards: prev.cards.filter((c) => c.columnId !== id),
      }));
    } catch {
      toast.error("Failed to save");
    }
  }, []);

  const createCard = useCallback(
    async (columnId: string, boardId: string, title: string) => {
      const now = Date.now();
      const card: KanbanCard = { id: crypto.randomUUID(), columnId, boardId, title, description: "", createdAt: now, updatedAt: now };
      try {
        const db = await getDB();
        await db.put("kanban_cards", card);
        setState((prev) => {
          const columns = prev.columns.map((c) => {
            if (c.id !== columnId) return c;
            const updated = { ...c, cardOrder: [...c.cardOrder, card.id], updatedAt: now };
            db.put("kanban_columns", updated).catch(() => toast.error("Failed to save"));
            return updated;
          });
          return { ...prev, columns, cards: [...prev.cards, card] };
        });
      } catch {
        toast.error("Failed to save");
      }
      return card;
    },
    []
  );

  const updateCard = useCallback(
    async (id: string, changes: Partial<Pick<KanbanCard, "title" | "description" | "priority" | "dueDate" | "labelIds" | "archived">>) => {
      const db = await getDB();
      setState((prev) => {
        const cards = prev.cards.map((c) =>
          c.id === id ? { ...c, ...changes, updatedAt: Date.now() } : c
        );
        const updated = cards.find((c) => c.id === id)!;
        db.put("kanban_cards", updated).catch(() => toast.error("Failed to save"));
        return { ...prev, cards };
      });
    },
    []
  );

  const removeCard = useCallback(async (id: string, columnId: string) => {
    try {
      const db = await getDB();
      await db.delete("kanban_cards", id);
      setState((prev) => {
        const columns = prev.columns.map((c) => {
          if (c.id !== columnId) return c;
          const updated = { ...c, cardOrder: c.cardOrder.filter((cid) => cid !== id), updatedAt: Date.now() };
          db.put("kanban_columns", updated).catch(() => toast.error("Failed to save"));
          return updated;
        });
        return { ...prev, columns, cards: prev.cards.filter((c) => c.id !== id) };
      });
    } catch {
      toast.error("Failed to save");
    }
  }, []);

  const moveCard = useCallback(
    async (
      cardId: string,
      fromColumnId: string,
      toColumnId: string,
      newCardOrder: string[],
      fromCardOrder: string[]
    ) => {
      const db = await getDB();
      setState((prev) => {
        const now = Date.now();
        const cards = prev.cards.map((c) =>
          c.id === cardId ? { ...c, columnId: toColumnId, updatedAt: now } : c
        );
        const updated = cards.find((c) => c.id === cardId)!;
        db.put("kanban_cards", updated).catch(() => toast.error("Failed to save"));

        const columns = prev.columns.map((c) => {
          if (c.id === fromColumnId) {
            const col = { ...c, cardOrder: fromCardOrder, updatedAt: now };
            db.put("kanban_columns", col).catch(() => toast.error("Failed to save"));
            return col;
          }
          if (c.id === toColumnId) {
            const col = { ...c, cardOrder: newCardOrder, updatedAt: now };
            db.put("kanban_columns", col).catch(() => toast.error("Failed to save"));
            return col;
          }
          return c;
        });

        return { ...prev, columns, cards };
      });
    },
    []
  );

  const reorderCards = useCallback(
    async (columnId: string, newCardOrder: string[]) => {
      const db = await getDB();
      setState((prev) => {
        const columns = prev.columns.map((c) => {
          if (c.id !== columnId) return c;
          const updated = { ...c, cardOrder: newCardOrder, updatedAt: Date.now() };
          db.put("kanban_columns", updated).catch(() => toast.error("Failed to save"));
          return updated;
        });
        return { ...prev, columns };
      });
    },
    []
  );

  const reorderColumns = useCallback(
    async (boardId: string, newColumnOrder: string[]) => {
      const db = await getDB();
      setState((prev) => {
        const boards = prev.boards.map((b) => {
          if (b.id !== boardId) return b;
          const updated = { ...b, columnOrder: newColumnOrder, updatedAt: Date.now() };
          db.put("kanban_boards", updated).catch(() => toast.error("Failed to save"));
          return updated;
        });
        return { ...prev, boards };
      });
    },
    []
  );

  const archiveCard = useCallback(
    async (id: string) => {
      const db = await getDB();
      setState((prev) => {
        const cards = prev.cards.map((c) =>
          c.id === id ? { ...c, archived: true, updatedAt: Date.now() } : c
        );
        const updated = cards.find((c) => c.id === id)!;
        db.put("kanban_cards", updated).catch(() => toast.error("Failed to save"));
        return { ...prev, cards };
      });
    },
    []
  );

  const restoreCard = useCallback(
    async (id: string) => {
      const db = await getDB();
      setState((prev) => {
        const cards = prev.cards.map((c) =>
          c.id === id ? { ...c, archived: false, updatedAt: Date.now() } : c
        );
        const updated = cards.find((c) => c.id === id)!;
        db.put("kanban_cards", updated).catch(() => toast.error("Failed to save"));
        return { ...prev, cards };
      });
    },
    []
  );

  const moveBetweenBoards = useCallback(
    async (cardId: string, targetBoardId: string, targetColumnId: string) => {
      try {
        const db = await getDB();
        setState((prev) => {
          const card = prev.cards.find((c) => c.id === cardId);
          if (!card) return prev;
          const now = Date.now();
          const updatedCard = { ...card, boardId: targetBoardId, columnId: targetColumnId, updatedAt: now };
          db.put("kanban_cards", updatedCard).catch(() => toast.error("Failed to save"));
          const columns = prev.columns.map((c) => {
            if (c.id === card.columnId) {
              const col = { ...c, cardOrder: c.cardOrder.filter((id) => id !== cardId), updatedAt: now };
              db.put("kanban_columns", col).catch(() => toast.error("Failed to save"));
              return col;
            }
            if (c.id === targetColumnId) {
              const col = { ...c, cardOrder: [...c.cardOrder, cardId], updatedAt: now };
              db.put("kanban_columns", col).catch(() => toast.error("Failed to save"));
              return col;
            }
            return c;
          });
          return { ...prev, cards: prev.cards.map((c) => c.id === cardId ? updatedCard : c), columns };
        });
      } catch {
        toast.error("Failed to save");
      }
    },
    []
  );

  const restoreDeletedCard = useCallback(async (card: KanbanCard) => {
    try {
      const db = await getDB();
      await db.put("kanban_cards", card);
      setState((prev) => {
        const columns = prev.columns.map((c) => {
          if (c.id !== card.columnId) return c;
          if (c.cardOrder.includes(card.id)) return c;
          const updated = { ...c, cardOrder: [...c.cardOrder, card.id], updatedAt: Date.now() };
          db.put("kanban_columns", updated).catch(() => toast.error("Failed to save"));
          return updated;
        });
        return { ...prev, columns, cards: [...prev.cards, card] };
      });
    } catch {
      toast.error("Failed to restore card");
    }
  }, []);

  return {
    ...state,
    isLoading,
    createBoard,
    updateBoard,
    removeBoard,
    createColumn,
    updateColumn,
    removeColumn,
    createCard,
    updateCard,
    removeCard,
    archiveCard,
    restoreCard,
    restoreDeletedCard,
    moveBetweenBoards,
    moveCard,
    reorderCards,
    reorderColumns,
  };
}
