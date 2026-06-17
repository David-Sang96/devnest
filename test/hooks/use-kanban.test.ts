import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useKanban } from "@/hooks/use-kanban";
import type { KanbanBoard, KanbanColumn, KanbanCard } from "@/types/kanban";

// ─── In-memory DB mock ───────────────────────────────────────────────────────

type Stores = {
  kanban_boards: Map<string, KanbanBoard>;
  kanban_columns: Map<string, KanbanColumn>;
  kanban_cards: Map<string, KanbanCard>;
};

let stores: Stores = {
  kanban_boards: new Map(),
  kanban_columns: new Map(),
  kanban_cards: new Map(),
};

function resetStores() {
  stores = {
    kanban_boards: new Map(),
    kanban_columns: new Map(),
    kanban_cards: new Map(),
  };
}

// Returns a fresh mock object store backed by the shared in-memory maps
function mockObjectStore(name: keyof Stores) {
  const map = stores[name] as Map<string, object>;
  return {
    delete: vi.fn().mockImplementation((id: string) => {
      map.delete(id);
      return Promise.resolve();
    }),
    put: vi.fn().mockImplementation((value: { id: string }) => {
      map.set(value.id, value);
      return Promise.resolve();
    }),
    get: vi.fn().mockImplementation((id: string) => Promise.resolve(map.get(id))),
    getAll: vi.fn().mockImplementation(() => Promise.resolve([...map.values()])),
    clear: vi.fn().mockImplementation(() => { map.clear(); return Promise.resolve(); }),
    index: vi.fn().mockImplementation((field: string) => ({
      getAllKeys: vi.fn().mockImplementation((value: unknown) =>
        Promise.resolve(
          [...map.entries()]
            .filter(([, rec]) => (rec as Record<string, unknown>)[field] === value)
            .map(([key]) => key)
        )
      ),
    })),
  };
}

const mockDB = {
  getAll: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
};

vi.mock("@/lib/db", () => ({
  getDB: () => Promise.resolve(mockDB),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeBoard(overrides: Partial<KanbanBoard> = {}): KanbanBoard {
  const now = Date.now();
  return { id: crypto.randomUUID(), title: "Board", columnOrder: [], createdAt: now, updatedAt: now, ...overrides };
}

function makeColumn(overrides: Partial<KanbanColumn> = {}): KanbanColumn {
  const now = Date.now();
  return { id: crypto.randomUUID(), boardId: "", title: "Column", cardOrder: [], createdAt: now, updatedAt: now, ...overrides };
}

function makeCard(overrides: Partial<KanbanCard> = {}): KanbanCard {
  const now = Date.now();
  return { id: crypto.randomUUID(), columnId: "", boardId: "", title: "Card", description: "", createdAt: now, updatedAt: now, ...overrides };
}

function seedAndConfigureMocks(
  boards: KanbanBoard[] = [],
  columns: KanbanColumn[] = [],
  cards: KanbanCard[] = []
) {
  resetStores();
  boards.forEach((b) => stores.kanban_boards.set(b.id, b));
  columns.forEach((c) => stores.kanban_columns.set(c.id, c));
  cards.forEach((c) => stores.kanban_cards.set(c.id, c));

  // getAll reads straight from the in-memory stores
  mockDB.getAll.mockImplementation((storeName: keyof Stores) =>
    Promise.resolve([...(stores[storeName]?.values() ?? [])])
  );

  // direct put / delete
  mockDB.put.mockImplementation((storeName: keyof Stores, value: { id: string }) => {
    (stores[storeName] as Map<string, object>).set(value.id, value);
    return Promise.resolve();
  });
  mockDB.delete.mockImplementation((storeName: keyof Stores, id: string) => {
    (stores[storeName] as Map<string, object>).delete(id);
    return Promise.resolve();
  });

  // transaction uses per-store mock object stores
  mockDB.transaction.mockImplementation(() => ({
    objectStore: (name: keyof Stores) => mockObjectStore(name),
    done: Promise.resolve(),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  seedAndConfigureMocks();
});

// ─── Initial load ─────────────────────────────────────────────────────────────

describe("useKanban() — initial load", () => {
  it("starts with empty arrays before data loads", () => {
    const { result } = renderHook(() => useKanban());
    expect(result.current.boards).toEqual([]);
  });

  it("loads boards from the DB on mount", async () => {
    const board = makeBoard({ id: "b1" });
    seedAndConfigureMocks([board]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.boards).toHaveLength(1));
    expect(result.current.boards[0].id).toBe("b1");
  });

  it("loads columns and cards on mount", async () => {
    const board = makeBoard({ id: "b1" });
    const col = makeColumn({ id: "c1", boardId: "b1" });
    const card = makeCard({ id: "k1", boardId: "b1", columnId: "c1" });
    seedAndConfigureMocks([board], [col], [card]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.boards).toHaveLength(1));
    expect(result.current.columns).toHaveLength(1);
    expect(result.current.cards).toHaveLength(1);
  });
});

// ─── createBoard ─────────────────────────────────────────────────────────────

describe("createBoard()", () => {
  it("adds a board to state", async () => {
    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.boards).toBeDefined());

    await act(async () => {
      await result.current.createBoard("Sprint 1");
    });

    expect(result.current.boards).toHaveLength(1);
    expect(result.current.boards[0].title).toBe("Sprint 1");
  });

  it("initialises the board with an empty columnOrder", async () => {
    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.boards).toBeDefined());

    let board!: KanbanBoard;
    await act(async () => {
      board = await result.current.createBoard("My Board");
    });

    expect(board.columnOrder).toEqual([]);
  });

  it("persists the board to the mock DB", async () => {
    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.boards).toBeDefined());

    await act(async () => {
      await result.current.createBoard("Stored");
    });

    expect(mockDB.put).toHaveBeenCalledWith("kanban_boards", expect.objectContaining({ title: "Stored" }));
  });
});

// ─── updateBoard ─────────────────────────────────────────────────────────────

describe("updateBoard()", () => {
  it("updates the board title in state", async () => {
    const board = makeBoard({ id: "b1", title: "Old" });
    seedAndConfigureMocks([board]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.boards).toHaveLength(1));

    await act(async () => {
      await result.current.updateBoard("b1", { title: "New" });
    });

    expect(result.current.boards[0].title).toBe("New");
  });
});

// ─── removeBoard ─────────────────────────────────────────────────────────────

describe("removeBoard()", () => {
  it("removes the board from state", async () => {
    const board = makeBoard({ id: "b1" });
    seedAndConfigureMocks([board]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.boards).toHaveLength(1));

    await act(async () => {
      await result.current.removeBoard("b1");
    });

    expect(result.current.boards).toHaveLength(0);
  });

  it("cascades — removes associated columns and cards from state", async () => {
    const board = makeBoard({ id: "b1", columnOrder: ["c1"] });
    const col = makeColumn({ id: "c1", boardId: "b1" });
    const card = makeCard({ id: "k1", boardId: "b1", columnId: "c1" });
    seedAndConfigureMocks([board], [col], [card]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.boards).toHaveLength(1));

    await act(async () => {
      await result.current.removeBoard("b1");
    });

    expect(result.current.columns.filter((c) => c.boardId === "b1")).toHaveLength(0);
    expect(result.current.cards.filter((c) => c.boardId === "b1")).toHaveLength(0);
  });
});

// ─── createColumn ─────────────────────────────────────────────────────────────

describe("createColumn()", () => {
  it("adds a column to state", async () => {
    const board = makeBoard({ id: "b1" });
    seedAndConfigureMocks([board]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.boards).toHaveLength(1));

    await act(async () => {
      await result.current.createColumn("b1", "To Do");
    });

    expect(result.current.columns).toHaveLength(1);
    expect(result.current.columns[0].title).toBe("To Do");
  });

  it("appends the column ID to the board's columnOrder", async () => {
    const board = makeBoard({ id: "b1" });
    seedAndConfigureMocks([board]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.boards).toHaveLength(1));

    let col!: KanbanColumn;
    await act(async () => {
      col = await result.current.createColumn("b1", "To Do");
    });

    expect(result.current.boards[0].columnOrder).toContain(col.id);
  });
});

// ─── removeColumn ─────────────────────────────────────────────────────────────

describe("removeColumn()", () => {
  it("removes the column from state and updates the board's columnOrder", async () => {
    const board = makeBoard({ id: "b1", columnOrder: ["c1"] });
    const col = makeColumn({ id: "c1", boardId: "b1" });
    seedAndConfigureMocks([board], [col]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.columns).toHaveLength(1));

    await act(async () => {
      await result.current.removeColumn("c1", "b1");
    });

    expect(result.current.columns).toHaveLength(0);
    expect(result.current.boards[0].columnOrder).not.toContain("c1");
  });

  it("removes cards that belong to the deleted column", async () => {
    const board = makeBoard({ id: "b1", columnOrder: ["c1"] });
    const col = makeColumn({ id: "c1", boardId: "b1", cardOrder: ["k1"] });
    const card = makeCard({ id: "k1", columnId: "c1", boardId: "b1" });
    seedAndConfigureMocks([board], [col], [card]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.cards).toHaveLength(1));

    await act(async () => {
      await result.current.removeColumn("c1", "b1");
    });

    expect(result.current.cards.filter((c) => c.columnId === "c1")).toHaveLength(0);
  });
});

// ─── createCard ──────────────────────────────────────────────────────────────

describe("createCard()", () => {
  it("adds a card to state", async () => {
    const board = makeBoard({ id: "b1" });
    const col = makeColumn({ id: "c1", boardId: "b1" });
    seedAndConfigureMocks([board], [col]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.columns).toHaveLength(1));

    await act(async () => {
      await result.current.createCard("c1", "b1", "Fix bug");
    });

    expect(result.current.cards).toHaveLength(1);
    expect(result.current.cards[0].title).toBe("Fix bug");
  });

  it("appends card ID to the column's cardOrder", async () => {
    const board = makeBoard({ id: "b1" });
    const col = makeColumn({ id: "c1", boardId: "b1" });
    seedAndConfigureMocks([board], [col]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.columns).toHaveLength(1));

    let card!: KanbanCard;
    await act(async () => {
      card = await result.current.createCard("c1", "b1", "Card");
    });

    const updatedCol = result.current.columns.find((c) => c.id === "c1");
    expect(updatedCol?.cardOrder).toContain(card.id);
  });
});

// ─── removeCard ──────────────────────────────────────────────────────────────

describe("removeCard()", () => {
  it("removes the card from state", async () => {
    const board = makeBoard({ id: "b1" });
    const col = makeColumn({ id: "c1", boardId: "b1", cardOrder: ["k1"] });
    const card = makeCard({ id: "k1", columnId: "c1", boardId: "b1" });
    seedAndConfigureMocks([board], [col], [card]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.cards).toHaveLength(1));

    await act(async () => {
      await result.current.removeCard("k1", "c1");
    });

    expect(result.current.cards).toHaveLength(0);
    expect(result.current.columns[0].cardOrder).not.toContain("k1");
  });
});

// ─── moveCard ────────────────────────────────────────────────────────────────

describe("moveCard()", () => {
  it("updates the card's columnId when moved to another column", async () => {
    const board = makeBoard({ id: "b1" });
    const col1 = makeColumn({ id: "c1", boardId: "b1", cardOrder: ["k1"] });
    const col2 = makeColumn({ id: "c2", boardId: "b1", cardOrder: [] });
    const card = makeCard({ id: "k1", columnId: "c1", boardId: "b1" });
    seedAndConfigureMocks([board], [col1, col2], [card]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.cards).toHaveLength(1));

    await act(async () => {
      await result.current.moveCard("k1", "c1", "c2", ["k1"], []);
    });

    const movedCard = result.current.cards.find((c) => c.id === "k1");
    expect(movedCard?.columnId).toBe("c2");
  });

  it("updates both columns' cardOrder after a cross-column move", async () => {
    const board = makeBoard({ id: "b1" });
    const col1 = makeColumn({ id: "c1", boardId: "b1", cardOrder: ["k1"] });
    const col2 = makeColumn({ id: "c2", boardId: "b1", cardOrder: [] });
    const card = makeCard({ id: "k1", columnId: "c1", boardId: "b1" });
    seedAndConfigureMocks([board], [col1, col2], [card]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.cards).toHaveLength(1));

    await act(async () => {
      await result.current.moveCard("k1", "c1", "c2", ["k1"], []);
    });

    const fromCol = result.current.columns.find((c) => c.id === "c1");
    const toCol = result.current.columns.find((c) => c.id === "c2");
    expect(fromCol?.cardOrder).toEqual([]);
    expect(toCol?.cardOrder).toContain("k1");
  });
});

// ─── reorderCards ────────────────────────────────────────────────────────────

describe("reorderCards()", () => {
  it("updates the column's cardOrder", async () => {
    const board = makeBoard({ id: "b1" });
    const col = makeColumn({ id: "c1", boardId: "b1", cardOrder: ["k1", "k2"] });
    seedAndConfigureMocks([board], [col]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.columns).toHaveLength(1));

    await act(async () => {
      await result.current.reorderCards("c1", ["k2", "k1"]);
    });

    const col1 = result.current.columns.find((c) => c.id === "c1");
    expect(col1?.cardOrder).toEqual(["k2", "k1"]);
  });
});

// ─── reorderColumns ───────────────────────────────────────────────────────────

describe("reorderColumns()", () => {
  it("updates the board's columnOrder", async () => {
    const board = makeBoard({ id: "b1", columnOrder: ["c1", "c2"] });
    seedAndConfigureMocks([board]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.boards).toHaveLength(1));

    await act(async () => {
      await result.current.reorderColumns("b1", ["c2", "c1"]);
    });

    expect(result.current.boards[0].columnOrder).toEqual(["c2", "c1"]);
  });
});
