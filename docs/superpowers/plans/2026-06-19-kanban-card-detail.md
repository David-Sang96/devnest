# Kanban Card Detail & Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add card detail side panel (with Tiptap description, priority, due date, labels), column color theming, card count badge, and archive drawer to the Kanban board.

**Architecture:** `selectedCardId` state lives in `KanbanPage` alongside `useKanbanLabels`; `CardDetailPanel` and `ArchiveDrawer` are rendered at page level as siblings to the board scroll area. Cards and columns gain new optional fields persisted to IndexedDB v2.

**Tech Stack:** Next.js 16 App Router, React, IndexedDB via `idb`, Tiptap (`@tiptap/react` + `@tiptap/starter-kit`), `motion/react`, `@dnd-kit/core`, Tailwind v4, `lucide-react`

## Global Constraints

- All IDB access must be in `"use client"` files
- DB name stays `"developer-workspace"`, bump version `1 → 2`
- Upgrade callback must use `if (oldVersion < N)` guards so existing users only run new migrations
- `@tiptap/extension-placeholder` is NOT installed — do not use it
- `motion/react` import path: `import { motion } from "motion/react"`
- `cn()` from `@/lib/utils` for conditional classes
- All new component files go in `src/components/kanban/`
- All new hook files go in `src/hooks/`
- Run tests with `npx vitest run` (or `rtk vitest run`)
- Commit with `rtk git add … && rtk git commit -m "…"`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/types/kanban.ts` | Modify | Add `Priority` type, new fields on `KanbanCard`/`KanbanColumn`, add `KanbanLabel` |
| `src/lib/db.ts` | Modify | Bump to v2, add `kanban_labels` store |
| `src/lib/backup.ts` | Modify | Include `kanban_labels` in export/import/parse |
| `src/hooks/use-kanban.ts` | Modify | Widen `updateCard`/`updateColumn` pick types; add `archiveCard`, `restoreCard`; clean labels on `removeBoard` |
| `src/hooks/use-kanban-labels.ts` | Create | CRUD for board-scoped labels |
| `src/components/kanban/column-color-picker.tsx` | Create | Swatch popover for column header color |
| `src/components/kanban/kanban-column.tsx` | Modify | Colored header, card count badge, color picker trigger; filter archived cards |
| `src/components/kanban/kanban-card.tsx` | Modify | Show priority dot, due date, label chips; add `onCardClick` prop |
| `src/components/kanban/label-picker.tsx` | Create | Popover to assign/create labels |
| `src/components/kanban/card-detail-panel.tsx` | Create | Slide-over with Tiptap editor + metadata |
| `src/components/kanban/archive-drawer.tsx` | Create | Collapsible list of archived cards |
| `src/components/kanban/kanban-board.tsx` | Modify | Add new props, wire `ArchiveDrawer` |
| `src/app/(workspace)/kanban/page.tsx` | Modify | Add `selectedCardId`, `useKanbanLabels`, render `CardDetailPanel` |
| `test/hooks/use-kanban.test.ts` | Modify | Add tests for new `updateCard`/`updateColumn` fields, `archiveCard`, `restoreCard` |
| `test/hooks/use-kanban-labels.test.ts` | Create | Tests for label CRUD hook |

---

### Task 1: Types, DB v2, backup

**Files:**
- Modify: `src/types/kanban.ts`
- Modify: `src/lib/db.ts`
- Modify: `src/lib/backup.ts`

**Interfaces:**
- Produces: `Priority`, updated `KanbanCard`, `KanbanColumn`, `KanbanLabel` types; `getDB()` now includes `kanban_labels` store

- [ ] **Step 1: Update `src/types/kanban.ts`**

```ts
export type Priority = "low" | "medium" | "high" | "urgent";

export interface KanbanBoard {
  id: string;
  title: string;
  columnOrder: string[];
  createdAt: number;
  updatedAt: number;
}

export interface KanbanColumn {
  id: string;
  boardId: string;
  title: string;
  cardOrder: string[];
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  boardId: string;
  title: string;
  description: string;
  priority?: Priority;
  dueDate?: number;
  labelIds?: string[];
  archived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface KanbanLabel {
  id: string;
  boardId: string;
  name: string;
  color: string;
  createdAt: number;
}
```

- [ ] **Step 2: Update `src/lib/db.ts`**

```ts
import { openDB as idbOpenDB, type IDBPDatabase } from "idb";
import type { Note } from "@/types/notes";
import type { KanbanBoard, KanbanColumn, KanbanCard, KanbanLabel } from "@/types/kanban";

const DB_NAME = "developer-workspace";
const DB_VERSION = 2;

interface DevNestDB {
  notes: { key: string; value: Note; indexes: { updatedAt: number } };
  kanban_boards: { key: string; value: KanbanBoard };
  kanban_columns: { key: string; value: KanbanColumn; indexes: { boardId: string } };
  kanban_cards: { key: string; value: KanbanCard; indexes: { columnId: string; boardId: string } };
  kanban_labels: { key: string; value: KanbanLabel; indexes: { boardId: string } };
}

let dbPromise: Promise<IDBPDatabase<DevNestDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<DevNestDB>> {
  if (!dbPromise) {
    dbPromise = idbOpenDB<DevNestDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const notesStore = db.createObjectStore("notes", { keyPath: "id" });
          notesStore.createIndex("updatedAt", "updatedAt");
          db.createObjectStore("kanban_boards", { keyPath: "id" });
          const columnsStore = db.createObjectStore("kanban_columns", { keyPath: "id" });
          columnsStore.createIndex("boardId", "boardId");
          const cardsStore = db.createObjectStore("kanban_cards", { keyPath: "id" });
          cardsStore.createIndex("columnId", "columnId");
          cardsStore.createIndex("boardId", "boardId");
        }
        if (oldVersion < 2) {
          const labelsStore = db.createObjectStore("kanban_labels", { keyPath: "id" });
          labelsStore.createIndex("boardId", "boardId");
        }
      },
    });
  }
  return dbPromise;
}
```

- [ ] **Step 3: Update `src/lib/backup.ts`**

```ts
import { getDB } from "@/lib/db";
import type { Note } from "@/types/notes";
import type { KanbanBoard, KanbanColumn, KanbanCard, KanbanLabel } from "@/types/kanban";

export interface BackupData {
  version: 2;
  exportedAt: number;
  notes: Note[];
  kanban_boards: KanbanBoard[];
  kanban_columns: KanbanColumn[];
  kanban_cards: KanbanCard[];
  kanban_labels: KanbanLabel[];
}

export async function exportAllData(): Promise<BackupData> {
  const db = await getDB();
  const [notes, kanban_boards, kanban_columns, kanban_cards, kanban_labels] =
    await Promise.all([
      db.getAll("notes"),
      db.getAll("kanban_boards"),
      db.getAll("kanban_columns"),
      db.getAll("kanban_cards"),
      db.getAll("kanban_labels"),
    ]);
  return {
    version: 2,
    exportedAt: Date.now(),
    notes,
    kanban_boards,
    kanban_columns,
    kanban_cards,
    kanban_labels,
  };
}

export function downloadBackup(data: BackupData): void {
  const date = new Date(data.exportedAt).toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `devnest-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseBackup(json: string): BackupData | null {
  try {
    const data = JSON.parse(json);
    if (data?.version !== 2) return null;
    if (!Array.isArray(data.notes)) return null;
    if (!Array.isArray(data.kanban_boards)) return null;
    if (!Array.isArray(data.kanban_columns)) return null;
    if (!Array.isArray(data.kanban_cards)) return null;
    if (!Array.isArray(data.kanban_labels)) return null;
    return data as BackupData;
  } catch {
    return null;
  }
}

export async function importData(data: BackupData): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ["notes", "kanban_boards", "kanban_columns", "kanban_cards", "kanban_labels"],
    "readwrite"
  );
  await Promise.all([
    tx.objectStore("notes").clear(),
    tx.objectStore("kanban_boards").clear(),
    tx.objectStore("kanban_columns").clear(),
    tx.objectStore("kanban_cards").clear(),
    tx.objectStore("kanban_labels").clear(),
  ]);
  await Promise.all([
    ...data.notes.map((n) => tx.objectStore("notes").put(n)),
    ...data.kanban_boards.map((b) => tx.objectStore("kanban_boards").put(b)),
    ...data.kanban_columns.map((c) => tx.objectStore("kanban_columns").put(c)),
    ...data.kanban_cards.map((c) => tx.objectStore("kanban_cards").put(c)),
    ...data.kanban_labels.map((l) => tx.objectStore("kanban_labels").put(l)),
  ]);
  await tx.done;
}
```

- [ ] **Step 4: Commit**

```bash
rtk git add src/types/kanban.ts src/lib/db.ts src/lib/backup.ts
rtk git commit -m "feat: kanban types v2 — priority, dueDate, labelIds, archived, color, KanbanLabel"
```

---

### Task 2: `useKanban` hook updates + tests

**Files:**
- Modify: `src/hooks/use-kanban.ts`
- Modify: `test/hooks/use-kanban.test.ts`

**Interfaces:**
- Consumes: updated `KanbanCard`, `KanbanColumn` types from Task 1
- Produces: `archiveCard(id)`, `restoreCard(id)` on the hook return; `updateCard` now accepts `priority`, `dueDate`, `labelIds`, `archived`; `updateColumn` now accepts `color`

- [ ] **Step 1: Add tests for new behaviour in `test/hooks/use-kanban.test.ts`**

Add the following describe blocks at the end of the file (after the existing `reorderColumns` suite). The Stores type and mock setup at the top of the file need `kanban_labels` added — update that section first:

In the `Stores` type definition at the top of `test/hooks/use-kanban.test.ts`, add `kanban_labels`:

```ts
// Change:
type Stores = {
  kanban_boards: Map<string, KanbanBoard>;
  kanban_columns: Map<string, KanbanColumn>;
  kanban_cards: Map<string, KanbanCard>;
};

// To:
import type { KanbanLabel } from "@/types/kanban";

type Stores = {
  kanban_boards: Map<string, KanbanBoard>;
  kanban_columns: Map<string, KanbanColumn>;
  kanban_cards: Map<string, KanbanCard>;
  kanban_labels: Map<string, KanbanLabel>;
};
```

In `resetStores()`, add `kanban_labels: new Map()`.

In `seedAndConfigureMocks`, add `kanban_labels?: KanbanLabel[]` parameter (default `[]`) and seed it.

Then add these test suites at the bottom of the file:

```ts
// ─── updateCard (new fields) ─────────────────────────────────────────────────

describe("updateCard() — new fields", () => {
  it("sets priority on a card", async () => {
    const board = makeBoard({ id: "b1" });
    const col = makeColumn({ id: "c1", boardId: "b1", cardOrder: ["k1"] });
    const card = makeCard({ id: "k1", columnId: "c1", boardId: "b1" });
    seedAndConfigureMocks([board], [col], [card]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.cards).toHaveLength(1));

    await act(async () => {
      await result.current.updateCard("k1", { priority: "high" });
    });

    expect(result.current.cards[0].priority).toBe("high");
  });

  it("sets dueDate on a card", async () => {
    const board = makeBoard({ id: "b1" });
    const col = makeColumn({ id: "c1", boardId: "b1", cardOrder: ["k1"] });
    const card = makeCard({ id: "k1", columnId: "c1", boardId: "b1" });
    seedAndConfigureMocks([board], [col], [card]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.cards).toHaveLength(1));

    const due = Date.now() + 86_400_000;
    await act(async () => {
      await result.current.updateCard("k1", { dueDate: due });
    });

    expect(result.current.cards[0].dueDate).toBe(due);
  });

  it("sets labelIds on a card", async () => {
    const board = makeBoard({ id: "b1" });
    const col = makeColumn({ id: "c1", boardId: "b1", cardOrder: ["k1"] });
    const card = makeCard({ id: "k1", columnId: "c1", boardId: "b1" });
    seedAndConfigureMocks([board], [col], [card]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.cards).toHaveLength(1));

    await act(async () => {
      await result.current.updateCard("k1", { labelIds: ["label-a", "label-b"] });
    });

    expect(result.current.cards[0].labelIds).toEqual(["label-a", "label-b"]);
  });
});

// ─── updateColumn (color) ────────────────────────────────────────────────────

describe("updateColumn() — color", () => {
  it("sets color on a column", async () => {
    const board = makeBoard({ id: "b1", columnOrder: ["c1"] });
    const col = makeColumn({ id: "c1", boardId: "b1" });
    seedAndConfigureMocks([board], [col]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.columns).toHaveLength(1));

    await act(async () => {
      await result.current.updateColumn("c1", { color: "#1d4ed8" });
    });

    expect(result.current.columns[0].color).toBe("#1d4ed8");
  });

  it("clears color when set to undefined", async () => {
    const board = makeBoard({ id: "b1", columnOrder: ["c1"] });
    const col = makeColumn({ id: "c1", boardId: "b1", color: "#1d4ed8" } as KanbanColumn);
    seedAndConfigureMocks([board], [col]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.columns).toHaveLength(1));

    await act(async () => {
      await result.current.updateColumn("c1", { color: undefined });
    });

    expect(result.current.columns[0].color).toBeUndefined();
  });
});

// ─── archiveCard / restoreCard ───────────────────────────────────────────────

describe("archiveCard()", () => {
  it("sets archived: true on the card", async () => {
    const board = makeBoard({ id: "b1" });
    const col = makeColumn({ id: "c1", boardId: "b1", cardOrder: ["k1"] });
    const card = makeCard({ id: "k1", columnId: "c1", boardId: "b1" });
    seedAndConfigureMocks([board], [col], [card]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.cards).toHaveLength(1));

    await act(async () => {
      await result.current.archiveCard("k1");
    });

    expect(result.current.cards[0].archived).toBe(true);
  });
});

describe("restoreCard()", () => {
  it("sets archived: false on the card", async () => {
    const board = makeBoard({ id: "b1" });
    const col = makeColumn({ id: "c1", boardId: "b1", cardOrder: ["k1"] });
    const card = makeCard({ id: "k1", columnId: "c1", boardId: "b1", archived: true } as KanbanCard);
    seedAndConfigureMocks([board], [col], [card]);

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.cards).toHaveLength(1));

    await act(async () => {
      await result.current.restoreCard("k1");
    });

    expect(result.current.cards[0].archived).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx vitest run test/hooks/use-kanban.test.ts
```

Expected: failures on the new `updateCard`, `updateColumn`, `archiveCard`, `restoreCard` suites.

- [ ] **Step 3: Update `src/hooks/use-kanban.ts`**

Make these targeted changes:

**a) Widen `updateColumn` pick type** (find and replace the function signature):
```ts
// Change:
async (id: string, changes: Partial<Pick<KanbanColumn, "title" | "cardOrder">>) => {
// To:
async (id: string, changes: Partial<Pick<KanbanColumn, "title" | "cardOrder" | "color">>) => {
```

**b) Widen `updateCard` pick type**:
```ts
// Change:
async (id: string, changes: Partial<Pick<KanbanCard, "title" | "description">>) => {
// To:
async (id: string, changes: Partial<Pick<KanbanCard, "title" | "description" | "priority" | "dueDate" | "labelIds" | "archived">>) => {
```

**c) Add `archiveCard` and `restoreCard` before the `return` statement**:
```ts
const archiveCard = useCallback(
  async (id: string) => {
    const db = await getDB();
    setState((prev) => {
      const cards = prev.cards.map((c) =>
        c.id === id ? { ...c, archived: true, updatedAt: Date.now() } : c
      );
      const updated = cards.find((c) => c.id === id)!;
      db.put("kanban_cards", updated);
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
      db.put("kanban_cards", updated);
      return { ...prev, cards };
    });
  },
  []
);
```

**d) Add `archiveCard` and `restoreCard` to the return object**:
```ts
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
  archiveCard,
  restoreCard,
  moveCard,
  reorderCards,
  reorderColumns,
};
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx vitest run test/hooks/use-kanban.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
rtk git add src/hooks/use-kanban.ts test/hooks/use-kanban.test.ts
rtk git commit -m "feat: useKanban — widen updateCard/updateColumn, add archiveCard/restoreCard"
```

---

### Task 3: `useKanbanLabels` hook

**Files:**
- Create: `src/hooks/use-kanban-labels.ts`
- Create: `test/hooks/use-kanban-labels.test.ts`

**Interfaces:**
- Consumes: `KanbanLabel` from Task 1, `getDB()` from Task 1
- Produces: `useKanbanLabels(boardId)` returning `{ labels, createLabel, updateLabel, removeLabel }`

- [ ] **Step 1: Write the test file `test/hooks/use-kanban-labels.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useKanbanLabels } from "@/hooks/use-kanban-labels";
import type { KanbanLabel } from "@/types/kanban";

// ─── In-memory mock ───────────────────────────────────────────────────────────

let labelsMap = new Map<string, KanbanLabel>();

const mockDB = {
  getAllFromIndex: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock("@/lib/db", () => ({
  getDB: () => Promise.resolve(mockDB),
}));

function resetMock(initial: KanbanLabel[] = []) {
  labelsMap = new Map(initial.map((l) => [l.id, l]));
  mockDB.getAllFromIndex.mockImplementation(
    (_store: string, _field: string, value: string) =>
      Promise.resolve([...labelsMap.values()].filter((l) => l.boardId === value))
  );
  mockDB.put.mockImplementation((_store: string, value: KanbanLabel) => {
    labelsMap.set(value.id, value);
    return Promise.resolve();
  });
  mockDB.delete.mockImplementation((_store: string, id: string) => {
    labelsMap.delete(id);
    return Promise.resolve();
  });
}

function makeLabel(overrides: Partial<KanbanLabel> = {}): KanbanLabel {
  return {
    id: crypto.randomUUID(),
    boardId: "board-1",
    name: "label",
    color: "#ef4444",
    createdAt: Date.now(),
    ...overrides,
  };
}

beforeEach(() => resetMock());

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useKanbanLabels()", () => {
  it("loads labels for the given board on mount", async () => {
    const label = makeLabel({ boardId: "board-1" });
    resetMock([label]);

    const { result } = renderHook(() => useKanbanLabels("board-1"));
    await waitFor(() => expect(result.current.labels).toHaveLength(1));
    expect(result.current.labels[0].id).toBe(label.id);
  });

  it("returns empty array when boardId is null", async () => {
    const { result } = renderHook(() => useKanbanLabels(null));
    await waitFor(() => expect(result.current.labels).toEqual([]));
  });

  it("createLabel adds label to state and IDB", async () => {
    resetMock();

    const { result } = renderHook(() => useKanbanLabels("board-1"));
    await waitFor(() => expect(result.current.labels).toEqual([]));

    await act(async () => {
      await result.current.createLabel("bug", "#ef4444");
    });

    expect(result.current.labels).toHaveLength(1);
    expect(result.current.labels[0].name).toBe("bug");
    expect(result.current.labels[0].color).toBe("#ef4444");
    expect(result.current.labels[0].boardId).toBe("board-1");
    expect(mockDB.put).toHaveBeenCalled();
  });

  it("updateLabel changes name and color in state", async () => {
    const label = makeLabel({ id: "l1", name: "old", color: "#000000" });
    resetMock([label]);

    const { result } = renderHook(() => useKanbanLabels("board-1"));
    await waitFor(() => expect(result.current.labels).toHaveLength(1));

    await act(async () => {
      await result.current.updateLabel("l1", { name: "new", color: "#3b82f6" });
    });

    expect(result.current.labels[0].name).toBe("new");
    expect(result.current.labels[0].color).toBe("#3b82f6");
  });

  it("removeLabel removes label from state", async () => {
    const label = makeLabel({ id: "l1" });
    resetMock([label]);

    const { result } = renderHook(() => useKanbanLabels("board-1"));
    await waitFor(() => expect(result.current.labels).toHaveLength(1));

    await act(async () => {
      await result.current.removeLabel("l1");
    });

    expect(result.current.labels).toHaveLength(0);
    expect(mockDB.delete).toHaveBeenCalled();
  });

  it("reloads labels when boardId changes", async () => {
    const label1 = makeLabel({ id: "l1", boardId: "board-1" });
    const label2 = makeLabel({ id: "l2", boardId: "board-2" });
    resetMock([label1, label2]);

    const { result, rerender } = renderHook(
      ({ boardId }: { boardId: string }) => useKanbanLabels(boardId),
      { initialProps: { boardId: "board-1" } }
    );
    await waitFor(() => expect(result.current.labels).toHaveLength(1));
    expect(result.current.labels[0].id).toBe("l1");

    rerender({ boardId: "board-2" });
    await waitFor(() => expect(result.current.labels[0].id).toBe("l2"));
  });
});
```

- [ ] **Step 2: Run — confirm tests fail**

```bash
npx vitest run test/hooks/use-kanban-labels.test.ts
```

Expected: FAIL — `useKanbanLabels` not found.

- [ ] **Step 3: Create `src/hooks/use-kanban-labels.ts`**

```ts
"use client";

import { useState, useEffect, useCallback } from "react";
import type { KanbanLabel } from "@/types/kanban";
import { getDB } from "@/lib/db";

export function useKanbanLabels(boardId: string | null) {
  const [labels, setLabels] = useState<KanbanLabel[]>([]);

  useEffect(() => {
    if (!boardId) {
      setLabels([]);
      return;
    }
    getDB()
      .then((db) => db.getAllFromIndex("kanban_labels", "boardId", boardId))
      .then(setLabels);
  }, [boardId]);

  const createLabel = useCallback(
    async (name: string, color: string) => {
      if (!boardId) return;
      const db = await getDB();
      const label: KanbanLabel = {
        id: crypto.randomUUID(),
        boardId,
        name,
        color,
        createdAt: Date.now(),
      };
      await db.put("kanban_labels", label);
      setLabels((prev) => [...prev, label]);
      return label;
    },
    [boardId]
  );

  const updateLabel = useCallback(
    async (id: string, patch: Partial<Pick<KanbanLabel, "name" | "color">>) => {
      const db = await getDB();
      const existing = await db.get("kanban_labels", id);
      if (!existing) return;
      const updated = { ...existing, ...patch };
      await db.put("kanban_labels", updated);
      setLabels((prev) => prev.map((l) => (l.id === id ? updated : l)));
    },
    []
  );

  const removeLabel = useCallback(async (id: string) => {
    const db = await getDB();
    await db.delete("kanban_labels", id);
    setLabels((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return { labels, createLabel, updateLabel, removeLabel };
}
```

- [ ] **Step 4: Run — confirm tests pass**

```bash
npx vitest run test/hooks/use-kanban-labels.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
rtk git add src/hooks/use-kanban-labels.ts test/hooks/use-kanban-labels.test.ts
rtk git commit -m "feat: add useKanbanLabels hook with createLabel/updateLabel/removeLabel"
```

---

### Task 4: Column color — `ColumnColorPicker` + `KanbanColumnItem` updates

**Files:**
- Create: `src/components/kanban/column-color-picker.tsx`
- Modify: `src/components/kanban/kanban-column.tsx`
- Modify: `src/components/kanban/kanban-board.tsx` (add `onColorColumn` prop)

**Interfaces:**
- Consumes: `updateColumn` with `color` from Task 2
- Produces: `KanbanColumnItem` now accepts `onColorColumn: (id: string, color: string | undefined) => void`; column header has colored background + count badge

- [ ] **Step 1: Create `src/components/kanban/column-color-picker.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";

const SWATCHES = [
  "#1d4ed8",
  "#065f46",
  "#4c1d95",
  "#9a3412",
  "#134e4a",
  "#713f12",
  "#1e3a5f",
  "#7f1d1d",
  "#0f172a",
];

interface ColumnColorPickerProps {
  currentColor?: string;
  onSelect: (color: string | undefined) => void;
  onClose: () => void;
}

export function ColumnColorPicker({
  currentColor,
  onSelect,
  onClose,
}: ColumnColorPickerProps) {
  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-border bg-popover p-3 shadow-lg">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Column color
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SWATCHES.map((color) => (
            <button
              key={color}
              onClick={() => {
                onSelect(color);
                onClose();
              }}
              className={cn(
                "size-6 rounded-md transition-transform hover:scale-110",
                currentColor === color && "ring-2 ring-ring ring-offset-1 ring-offset-popover"
              )}
              style={{ background: color }}
              aria-label={color}
            />
          ))}
          <button
            onClick={() => {
              onSelect(undefined);
              onClose();
            }}
            className={cn(
              "flex size-6 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground transition-colors hover:bg-accent",
              !currentColor && "ring-2 ring-ring ring-offset-1 ring-offset-popover"
            )}
            aria-label="No color"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Update `src/components/kanban/kanban-column.tsx`**

Replace the full file:

```tsx
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
          <div className="flex flex-1 items-center gap-1 min-w-0">
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
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0 text-xs tabular-nums",
                hasColor
                  ? "bg-black/20 text-white/90"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {activeCards.length}
            </span>

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
```

- [ ] **Step 3: Add `onColorColumn` and `onCardClick` props to `KanbanBoardView` in `src/components/kanban/kanban-board.tsx`**

In the `KanbanBoardProps` interface, add:
```ts
onColorColumn: (id: string, color: string | undefined) => void;
onCardClick: (cardId: string) => void;
```

Destructure them in `KanbanBoardView`:
```ts
export function KanbanBoardView({
  ...
  onColorColumn,
  onCardClick,
}: KanbanBoardProps) {
```

Pass them to each `KanbanColumnItem`:
```tsx
<KanbanColumnItem
  key={col.id}
  column={col}
  cards={cards.filter((c) => c.columnId === col.id)}
  onAddCard={(columnId, title) => onAddCard(columnId, board.id, title)}
  onRemoveCard={onRemoveCard}
  onRemoveColumn={onRemoveColumn}
  onRenameColumn={onRenameColumn}
  onColorColumn={onColorColumn}
  onCardClick={onCardClick}
/>
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: all existing tests pass (TypeScript compiler will catch prop mismatches via `tsc --noEmit`).

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/kanban/column-color-picker.tsx src/components/kanban/kanban-column.tsx src/components/kanban/kanban-board.tsx
rtk git commit -m "feat: column color theming — colored header, card count badge, color picker"
```

---

### Task 5: Card face — priority dot, due date, label chips

**Files:**
- Modify: `src/components/kanban/kanban-card.tsx`

**Interfaces:**
- Consumes: updated `KanbanCard` (Task 1), `KanbanLabel` (Task 1)
- Produces: `KanbanCardItem` now accepts `onCardClick: (id: string) => void`; card face shows metadata

- [ ] **Step 1: Replace `src/components/kanban/kanban-card.tsx`**

```tsx
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
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/kanban/kanban-card.tsx
rtk git commit -m "feat: kanban card face — priority dot, due date, label chips, click handler"
```

---

### Task 6: `LabelPicker` + `CardDetailPanel`

**Files:**
- Create: `src/components/kanban/label-picker.tsx`
- Create: `src/components/kanban/card-detail-panel.tsx`

**Interfaces:**
- Consumes: `KanbanCard`, `KanbanLabel`, `Priority` (Task 1); `useEditor`/`EditorContent` from `@tiptap/react`; `StarterKit` from `@tiptap/starter-kit`
- Produces: `<CardDetailPanel>` component; `<LabelPicker>` component

- [ ] **Step 1: Create `src/components/kanban/label-picker.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { KanbanLabel } from "@/types/kanban";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];

interface LabelPickerProps {
  labels: KanbanLabel[];
  selectedIds: string[];
  onToggle: (labelId: string) => void;
  onCreateLabel: (name: string, color: string) => void;
  onClose: () => void;
}

export function LabelPicker({
  labels,
  selectedIds,
  onToggle,
  onCreateLabel,
  onClose,
}: LabelPickerProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreateLabel(trimmed, newColor);
    setNewName("");
    setNewColor(PRESET_COLORS[0]);
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-full left-0 z-50 mb-1 w-60 rounded-lg border border-border bg-popover p-3 shadow-lg">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Labels</p>

        <div className="mb-3 flex max-h-36 flex-col gap-0.5 overflow-y-auto">
          {labels.length === 0 && (
            <p className="text-xs text-muted-foreground">No labels yet.</p>
          )}
          {labels.map((label) => (
            <label
              key={label.id}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-accent"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(label.id)}
                onChange={() => onToggle(label.id)}
                className="size-3 accent-primary"
              />
              <span
                className="size-3 shrink-0 rounded-sm"
                style={{ background: label.color }}
              />
              <span className="flex-1 truncate text-sm text-foreground">
                {label.name}
              </span>
            </label>
          ))}
        </div>

        <div className="border-t border-border pt-2">
          <p className="mb-1.5 text-xs text-muted-foreground">Create label</p>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            placeholder="Label name…"
            className="mb-2 w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="mb-2 flex gap-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={cn(
                  "size-4 rounded-sm transition-transform hover:scale-110",
                  newColor === c && "ring-2 ring-ring ring-offset-1 ring-offset-popover"
                )}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="w-full rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `src/components/kanban/card-detail-panel.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { X, Archive, Trash2 } from "lucide-react";
import type { KanbanCard, KanbanLabel, Priority } from "@/types/kanban";
import { LabelPicker } from "./label-picker";
import { cn } from "@/lib/utils";

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  low:    { label: "Low",    color: "#22c55e" },
  medium: { label: "Medium", color: "#eab308" },
  high:   { label: "High",   color: "#f97316" },
  urgent: { label: "Urgent", color: "#ef4444" },
};

interface CardDetailPanelProps {
  card: KanbanCard;
  labels: KanbanLabel[];
  onClose: () => void;
  onUpdateCard: (
    id: string,
    changes: Partial<
      Pick<KanbanCard, "title" | "description" | "priority" | "dueDate" | "labelIds" | "archived">
    >
  ) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string, columnId: string) => void;
  onCreateLabel: (name: string, color: string) => void;
}

export function CardDetailPanel({
  card,
  labels,
  onClose,
  onUpdateCard,
  onArchive,
  onDelete,
  onCreateLabel,
}: CardDetailPanelProps) {
  const [title, setTitle] = useState(card.title);
  const [showLabelPicker, setShowLabelPicker] = useState(false);

  useEffect(() => {
    setTitle(card.title);
    setShowLabelPicker(false);
  }, [card.id]);

  const editor = useEditor(
    {
      extensions: [StarterKit],
      content: (() => {
        if (!card.description) return "";
        try {
          return JSON.parse(card.description);
        } catch {
          return card.description;
        }
      })(),
      onBlur: ({ editor: e }) => {
        const isEmpty = e.isEmpty;
        onUpdateCard(card.id, {
          description: isEmpty ? "" : JSON.stringify(e.getJSON()),
        });
      },
      editorProps: {
        attributes: {
          class:
            "prose prose-sm prose-invert max-w-none min-h-[80px] focus:outline-none px-3 py-2 text-sm text-foreground",
        },
      },
    },
    [card.id]
  );

  const selectedIds = card.labelIds ?? [];
  const cardLabels = labels.filter((l) => selectedIds.includes(l.id));

  const dueDateValue = card.dueDate
    ? new Date(card.dueDate).toISOString().slice(0, 10)
    : "";

  function handleToggleLabel(labelId: string) {
    const next = selectedIds.includes(labelId)
      ? selectedIds.filter((id) => id !== labelId)
      : [...selectedIds, labelId];
    onUpdateCard(card.id, { labelIds: next });
  }

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-start gap-2 border-b border-border px-4 py-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            const trimmed = title.trim();
            if (trimmed && trimmed !== card.title) {
              onUpdateCard(card.id, { title: trimmed });
            } else {
              setTitle(card.title);
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground focus:outline-none"
        />
        <button
          onClick={onClose}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Close panel"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Description */}
        <div className="px-4 pb-1 pt-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Description
          </p>
          <div className="min-h-[80px] rounded-md border border-border bg-background">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-3 flex flex-col gap-2.5 border-t border-border px-4 pb-4 pt-3">
          {/* Priority */}
          <div className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-xs text-muted-foreground">
              Priority
            </span>
            <div className="flex flex-wrap gap-1">
              {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                const active = card.priority === p;
                return (
                  <button
                    key={p}
                    onClick={() =>
                      onUpdateCard(card.id, { priority: active ? undefined : p })
                    }
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                      active
                        ? "text-white"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    style={active ? { background: cfg.color } : undefined}
                  >
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ background: active ? "white" : cfg.color }}
                    />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due date */}
          <div className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-xs text-muted-foreground">
              Due
            </span>
            <input
              type="date"
              value={dueDateValue}
              onChange={(e) => {
                const ts = e.target.value
                  ? new Date(e.target.value).getTime()
                  : undefined;
                onUpdateCard(card.id, { dueDate: ts });
              }}
              className="rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Labels */}
          <div className="relative flex items-start gap-3">
            <span className="mt-0.5 w-14 shrink-0 text-xs text-muted-foreground">
              Labels
            </span>
            <div className="flex flex-wrap gap-1">
              {cardLabels.map((l) => (
                <span
                  key={l.id}
                  className="rounded-full px-2 py-px text-xs font-medium text-white"
                  style={{ background: l.color }}
                >
                  {l.name}
                </span>
              ))}
              <button
                onClick={() => setShowLabelPicker((v) => !v)}
                className="rounded-full border border-dashed border-border px-2 py-px text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                + Add
              </button>
            </div>
            {showLabelPicker && (
              <LabelPicker
                labels={labels}
                selectedIds={selectedIds}
                onToggle={handleToggleLabel}
                onCreateLabel={onCreateLabel}
                onClose={() => setShowLabelPicker(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <button
          onClick={() => {
            onArchive(card.id);
            onClose();
          }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Archive className="size-3.5" />
          Archive
        </button>
        <button
          onClick={() => {
            onDelete(card.id, card.columnId);
            onClose();
          }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add Tiptap mock aliases to `vitest.config.ts`**

The `@tiptap/extension-placeholder` package is NOT installed, so no alias needed. Verify `@tiptap/starter-kit` is already aliased in `vitest.config.ts`:
```ts
"@tiptap/starter-kit": path.resolve(__dirname, "./test/mocks/tiptap.tsx"),
```
It is — no change needed.

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/kanban/label-picker.tsx src/components/kanban/card-detail-panel.tsx
rtk git commit -m "feat: add LabelPicker and CardDetailPanel components"
```

---

### Task 7: `ArchiveDrawer`

**Files:**
- Create: `src/components/kanban/archive-drawer.tsx`

**Interfaces:**
- Consumes: `KanbanCard`, `KanbanColumn` (Task 1)
- Produces: `<ArchiveDrawer>` component; hidden when no archived cards

- [ ] **Step 1: Create `src/components/kanban/archive-drawer.tsx`**

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, RotateCcw, Trash2 } from "lucide-react";
import type { KanbanCard, KanbanColumn } from "@/types/kanban";

interface ArchiveDrawerProps {
  cards: KanbanCard[];
  columns: KanbanColumn[];
  onRestore: (id: string) => void;
  onDelete: (id: string, columnId: string) => void;
}

export function ArchiveDrawer({
  cards,
  columns,
  onRestore,
  onDelete,
}: ArchiveDrawerProps) {
  const [open, setOpen] = useState(false);

  if (cards.length === 0) return null;

  return (
    <div className="mt-4 w-full min-w-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {open ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
        🗃 Archived ({cards.length})
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-1">
          {cards.map((card) => {
            const col = columns.find((c) => c.id === card.columnId);
            return (
              <div
                key={card.id}
                className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground line-through">
                  {card.title}
                </span>
                {col && (
                  <span className="shrink-0 text-xs text-muted-foreground/60">
                    {col.title}
                  </span>
                )}
                <button
                  onClick={() => onRestore(card.id)}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Restore card"
                >
                  <RotateCcw className="size-3.5" />
                </button>
                <button
                  onClick={() => onDelete(card.id, card.columnId)}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                  aria-label="Delete permanently"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/kanban/archive-drawer.tsx
rtk git commit -m "feat: add ArchiveDrawer component"
```

---

### Task 8: Wire up `KanbanBoardView` + `KanbanPage`

**Files:**
- Modify: `src/components/kanban/kanban-board.tsx`
- Modify: `src/app/(workspace)/kanban/page.tsx`

**Interfaces:**
- Consumes: all components and hooks from Tasks 1–7
- Produces: fully wired feature — card click opens panel, archive works, column colors persist

- [ ] **Step 1: Update `src/components/kanban/kanban-board.tsx`**

Add to `KanbanBoardProps`:
```ts
onUpdateCard: (
  id: string,
  changes: Partial<Pick<KanbanCard, "title" | "description" | "priority" | "dueDate" | "labelIds" | "archived">>
) => void;
onRestoreCard: (id: string) => void;
archivedCards: KanbanCard[];
```

Also add `KanbanCard` import if not already present (it is).

Import `ArchiveDrawer`:
```ts
import { ArchiveDrawer } from "./archive-drawer";
```

Destructure new props in `KanbanBoardView`.

Change the return from a single `<DndContext>` to a fragment wrapping `<DndContext>` + `<ArchiveDrawer>`. Also remove `h-full` and `items-start` from the inner columns flex div so the board can grow naturally in a scrollable container:

```tsx
return (
  <>
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 items-start">
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
                onAddCard={(columnId, title) => onAddCard(columnId, board.id, title)}
                onRemoveCard={onRemoveCard}
                onRemoveColumn={onRemoveColumn}
                onRenameColumn={onRenameColumn}
                onColorColumn={onColorColumn}
                onCardClick={onCardClick}
              />
            ))}
          </AnimatePresence>
        </SortableContext>

        {/* Add column button */}
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

    <ArchiveDrawer
      cards={archivedCards}
      columns={columns}
      onRestore={onRestoreCard}
      onDelete={onRemoveCard}
    />
  </>
);
```

> **Note:** Keep the full add-column UI (the `<div className="w-64 shrink-0">` block) exactly as it is — just move it inside the updated inner `<div className="flex gap-3 items-start">`.

- [ ] **Step 2: Replace `src/app/(workspace)/kanban/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Columns3 } from "lucide-react";
import { useKanban } from "@/hooks/use-kanban";
import { useKanbanLabels } from "@/hooks/use-kanban-labels";
import {
  KanbanBoardView,
  BoardTab,
  CreateBoardButton,
} from "@/components/kanban/kanban-board";
import { CardDetailPanel } from "@/components/kanban/card-detail-panel";

export default function KanbanPage() {
  const kanban = useKanban();
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const activeBoard =
    kanban.boards.find((b) => b.id === activeBoardId) ?? kanban.boards[0] ?? null;

  const { labels, createLabel } = useKanbanLabels(activeBoard?.id ?? null);

  const selectedCard =
    selectedCardId != null
      ? kanban.cards.find((c) => c.id === selectedCardId) ?? null
      : null;

  const boardCards = kanban.cards.filter((c) => c.boardId === activeBoard?.id);
  const archivedCards = boardCards.filter((c) => c.archived);

  function handleDeleteBoard(id: string) {
    const remaining = kanban.boards.filter((b) => b.id !== id);
    if (activeBoardId === id || activeBoardId === null) {
      setActiveBoardId(remaining[0]?.id ?? null);
    }
    if (selectedCard?.boardId === id) setSelectedCardId(null);
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
                onClose={() => setSelectedCardId(null)}
                onUpdateCard={kanban.updateCard}
                onArchive={(id) => {
                  kanban.archiveCard(id);
                  setSelectedCardId(null);
                }}
                onDelete={(id, colId) => {
                  kanban.removeCard(id, colId);
                  setSelectedCardId(null);
                }}
                onCreateLabel={createLabel}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Start dev server and verify in browser**

```bash
npm run dev
```

Open `http://localhost:3000/kanban`. Verify:
- [ ] Click any card → panel slides in from right
- [ ] Title is editable (blur to save)
- [ ] Priority buttons toggle (click same to clear)
- [ ] Due date input saves and shows on card face
- [ ] Labels: "+ Add" opens picker; create a label; assign it; it appears as chip on card face and in panel
- [ ] Archive button → card disappears from column, appears in "🗃 Archived (n)" drawer below
- [ ] Restore → card reappears in its column
- [ ] Delete in archive drawer → card gone permanently
- [ ] Palette icon on column header → color picker → pick color → header turns that color
- [ ] Card count badge in column header counts only non-archived cards
- [ ] "None / ✕" in color picker clears the color

- [ ] **Step 5: Build check**

```bash
npm run build
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 6: Commit**

```bash
rtk git add src/components/kanban/kanban-board.tsx src/app/\(workspace\)/kanban/page.tsx
rtk git commit -m "feat: wire up card detail panel, archive drawer, column colors in KanbanPage"
```
