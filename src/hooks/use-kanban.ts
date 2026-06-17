"use client";

import { useState, useEffect, useCallback } from "react";
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

  useEffect(() => {
    async function load() {
      const db = await getDB();
      const [boards, columns, cards] = await Promise.all([
        db.getAll("kanban_boards"),
        db.getAll("kanban_columns"),
        db.getAll("kanban_cards"),
      ]);
      boards.sort((a, b) => a.createdAt - b.createdAt);
      setState({ boards, columns, cards });
    }
    load();
  }, []);

  const createBoard = useCallback(async (title: string) => {
    const db = await getDB();
    const now = Date.now();
    const board: KanbanBoard = {
      id: crypto.randomUUID(),
      title,
      columnOrder: [],
      createdAt: now,
      updatedAt: now,
    };
    await db.put("kanban_boards", board);
    setState((prev) => ({ ...prev, boards: [...prev.boards, board] }));
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
        db.put("kanban_boards", updated);
        return { ...prev, boards };
      });
    },
    []
  );

  const removeBoard = useCallback(async (id: string) => {
    const db = await getDB();
    const tx = db.transaction(
      ["kanban_boards", "kanban_columns", "kanban_cards"],
      "readwrite"
    );
    await tx.objectStore("kanban_boards").delete(id);
    const colIds = (await tx.objectStore("kanban_columns").index("boardId").getAllKeys(id)) as string[];
    for (const colId of colIds) {
      const cardKeys = (await tx.objectStore("kanban_cards").index("columnId").getAllKeys(colId)) as string[];
      for (const cardKey of cardKeys) {
        await tx.objectStore("kanban_cards").delete(cardKey);
      }
      await tx.objectStore("kanban_columns").delete(colId);
    }
    await tx.done;
    setState((prev) => ({
      boards: prev.boards.filter((b) => b.id !== id),
      columns: prev.columns.filter((c) => c.boardId !== id),
      cards: prev.cards.filter((c) => c.boardId !== id),
    }));
  }, []);

  const createColumn = useCallback(async (boardId: string, title: string) => {
    const db = await getDB();
    const now = Date.now();
    const column: KanbanColumn = {
      id: crypto.randomUUID(),
      boardId,
      title,
      cardOrder: [],
      createdAt: now,
      updatedAt: now,
    };
    await db.put("kanban_columns", column);

    setState((prev) => {
      const boards = prev.boards.map((b) => {
        if (b.id !== boardId) return b;
        const updated = {
          ...b,
          columnOrder: [...b.columnOrder, column.id],
          updatedAt: now,
        };
        db.put("kanban_boards", updated);
        return updated;
      });
      return { ...prev, boards, columns: [...prev.columns, column] };
    });

    return column;
  }, []);

  const updateColumn = useCallback(
    async (id: string, changes: Partial<Pick<KanbanColumn, "title" | "cardOrder">>) => {
      const db = await getDB();
      setState((prev) => {
        const columns = prev.columns.map((c) =>
          c.id === id ? { ...c, ...changes, updatedAt: Date.now() } : c
        );
        const updated = columns.find((c) => c.id === id)!;
        db.put("kanban_columns", updated);
        return { ...prev, columns };
      });
    },
    []
  );

  const removeColumn = useCallback(async (id: string, boardId: string) => {
    const db = await getDB();
    const tx = db.transaction(
      ["kanban_boards", "kanban_columns", "kanban_cards"],
      "readwrite"
    );
    await tx.objectStore("kanban_columns").delete(id);
    const cardKeys = (await tx.objectStore("kanban_cards").index("columnId").getAllKeys(id)) as string[];
    for (const cardKey of cardKeys) {
      await tx.objectStore("kanban_cards").delete(cardKey);
    }
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
        b.id === boardId
          ? { ...b, columnOrder: b.columnOrder.filter((cid) => cid !== id) }
          : b
      ),
      columns: prev.columns.filter((c) => c.id !== id),
      cards: prev.cards.filter((c) => c.columnId !== id),
    }));
  }, []);

  const createCard = useCallback(
    async (columnId: string, boardId: string, title: string) => {
      const db = await getDB();
      const now = Date.now();
      const card: KanbanCard = {
        id: crypto.randomUUID(),
        columnId,
        boardId,
        title,
        description: "",
        createdAt: now,
        updatedAt: now,
      };
      await db.put("kanban_cards", card);

      setState((prev) => {
        const columns = prev.columns.map((c) => {
          if (c.id !== columnId) return c;
          const updated = {
            ...c,
            cardOrder: [...c.cardOrder, card.id],
            updatedAt: now,
          };
          db.put("kanban_columns", updated);
          return updated;
        });
        return { ...prev, columns, cards: [...prev.cards, card] };
      });

      return card;
    },
    []
  );

  const updateCard = useCallback(
    async (id: string, changes: Partial<Pick<KanbanCard, "title" | "description">>) => {
      const db = await getDB();
      setState((prev) => {
        const cards = prev.cards.map((c) =>
          c.id === id ? { ...c, ...changes, updatedAt: Date.now() } : c
        );
        const updated = cards.find((c) => c.id === id)!;
        db.put("kanban_cards", updated);
        return { ...prev, cards };
      });
    },
    []
  );

  const removeCard = useCallback(async (id: string, columnId: string) => {
    const db = await getDB();
    await db.delete("kanban_cards", id);
    setState((prev) => {
      const columns = prev.columns.map((c) => {
        if (c.id !== columnId) return c;
        const updated = {
          ...c,
          cardOrder: c.cardOrder.filter((cid) => cid !== id),
          updatedAt: Date.now(),
        };
        db.put("kanban_columns", updated);
        return updated;
      });
      return { ...prev, columns, cards: prev.cards.filter((c) => c.id !== id) };
    });
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
        db.put("kanban_cards", updated);

        const columns = prev.columns.map((c) => {
          if (c.id === fromColumnId) {
            const col = { ...c, cardOrder: fromCardOrder, updatedAt: now };
            db.put("kanban_columns", col);
            return col;
          }
          if (c.id === toColumnId) {
            const col = { ...c, cardOrder: newCardOrder, updatedAt: now };
            db.put("kanban_columns", col);
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
          db.put("kanban_columns", updated);
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
          db.put("kanban_boards", updated);
          return updated;
        });
        return { ...prev, boards };
      });
    },
    []
  );

  return {
    ...state,
    createBoard,
    updateBoard,
    removeBoard,
    createColumn,
    updateColumn,
    removeColumn,
    createCard,
    updateCard,
    removeCard,
    moveCard,
    reorderCards,
    reorderColumns,
  };
}
