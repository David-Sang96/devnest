# DevNest 8 Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Sonner error toasts, loading states, undo/confirm for deletes, JSON localStorage, cross-board card move, note word/char count, kanban WIP limits, and compress CLAUDE.md.

**Architecture:** `sonner` installed once; all hooks import `toast` directly. Loading is a `isLoading: boolean` returned from `useKanban` and `useNotes`. Undo uses a 5-second snapshotted restore via `toast` action; board delete uses `window.confirm`. Cross-board move adds one hook function + UI section in `CardDetailPanel`. WIP limits live on `KanbanColumn.wipLimit?: number` and render in column edit mode.

**Tech Stack:** `sonner@^2`, vitest, `@testing-library/react`, TipTap (`editor.getText()` for word count), `localStorage` API, IndexedDB via `idb`

## Global Constraints

- Next.js 16 App Router; all mutable hooks are `"use client"` files
- Tests: `npx vitest run` must pass after every task
- Type check: `npx tsc --noEmit` must pass after every task
- No new IDB object stores; `wipLimit` is an optional field on existing `kanban_columns` store

---

### Task 1: Install Sonner + wire Toaster to root layout

**Files:**
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: `import { toast } from "sonner"` available for all subsequent tasks

- [ ] **Step 1: Install sonner**

```bash
npm install sonner
```

Expected: `sonner` in `package.json` dependencies.

- [ ] **Step 2: Modify `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DevNest",
  description: "Your personal developer workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx package.json package-lock.json
git commit -m "feat: install sonner and wire Toaster to root layout"
```

---

### Task 2: IDB error handling in all three hooks

**Files:**
- Modify: `src/hooks/use-notes.ts`
- Modify: `src/hooks/use-kanban.ts`
- Modify: `src/hooks/use-kanban-labels.ts`
- Modify: `test/hooks/use-notes.test.ts`
- Modify: `test/hooks/use-kanban.test.ts`
- Modify: `test/hooks/use-kanban-labels.test.ts`

**Interfaces:**
- Consumes: `toast` from `"sonner"` (Task 1)

Two patterns exist in these hooks:
- **Pattern A** — `await db.put/delete` at top-level of async function → wrap in `try/catch { toast.error("Failed to save") }`
- **Pattern B** — `db.put(...)` fire-and-forget inside `setState` callback → append `.catch(() => toast.error("Failed to save"))`

- [ ] **Step 1: Write failing test for `createNote` IDB error → `test/hooks/use-notes.test.ts`**

Add at the bottom of the `describe` block:

```ts
describe("error handling", () => {
  it("shows toast.error when createNote IDB write fails", async () => {
    const { toast } = await import("sonner");
    vi.spyOn(toast, "error");
    mockDB.put.mockRejectedValueOnce(new Error("IDB failure"));
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(mockDB.getAllFromIndex).toHaveBeenCalled());
    await act(async () => { await result.current.createNote(); });
    expect(toast.error).toHaveBeenCalledWith("Failed to save");
  });

  it("shows toast.error when removeNote IDB delete fails", async () => {
    const note = makeNote({ id: "n1" });
    seedStore([note]);
    const { toast } = await import("sonner");
    vi.spyOn(toast, "error");
    mockDB.delete.mockRejectedValueOnce(new Error("IDB failure"));
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toHaveLength(1));
    await act(async () => { await result.current.removeNote("n1"); });
    expect(toast.error).toHaveBeenCalledWith("Failed to save");
  });
});
```

- [ ] **Step 2: Run to verify fails**

```bash
npx vitest run test/hooks/use-notes.test.ts
```

Expected: FAIL — `toast.error` not called.

- [ ] **Step 3: Update `src/hooks/use-notes.ts`**

```ts
"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getDB } from "@/lib/db";
import type { Note } from "@/types";
import { extractTitle } from "@/lib/note-content";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    getDB()
      .then((db) => db.getAllFromIndex("notes", "updatedAt"))
      .then((all) => setNotes(all.reverse()))
      .catch(() => toast.error("Failed to load notes"));
  }, []);

  async function createNote(): Promise<Note> {
    const now = Date.now();
    const note: Note = {
      id: crypto.randomUUID(),
      title: "Untitled",
      content: "",
      createdAt: now,
      updatedAt: now,
    };
    try {
      const db = await getDB();
      await db.put("notes", note);
      setNotes((prev) => [note, ...prev]);
    } catch {
      toast.error("Failed to save");
    }
    return note;
  }

  async function updateNote(id: string, changes: Partial<Pick<Note, "content" | "title">>) {
    try {
      const db = await getDB();
      const existing = await db.get("notes", id);
      if (!existing) return;
      let derivedTitle = existing.title;
      if (changes.title !== undefined) {
        derivedTitle = changes.title.trim() || "Untitled";
      } else if (changes.content !== undefined) {
        derivedTitle = extractTitle(changes.content);
      }
      const updated: Note = { ...existing, ...changes, title: derivedTitle, updatedAt: Date.now() };
      await db.put("notes", updated);
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? updated : n)).sort((a, b) => b.updatedAt - a.updatedAt)
      );
    } catch {
      toast.error("Failed to save");
    }
  }

  async function removeNote(id: string) {
    try {
      const db = await getDB();
      await db.delete("notes", id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch {
      toast.error("Failed to save");
    }
  }

  async function togglePin(id: string) {
    try {
      const db = await getDB();
      const existing = await db.get("notes", id);
      if (!existing) return;
      const updated: Note = { ...existing, pinned: !existing.pinned };
      await db.put("notes", updated);
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch {
      toast.error("Failed to save");
    }
  }

  return { notes, createNote, updateNote, removeNote, togglePin };
}
```

- [ ] **Step 4: Run use-notes tests**

```bash
npx vitest run test/hooks/use-notes.test.ts
```

Expected: all pass.

- [ ] **Step 5: Write failing test for `createBoard` IDB error → `test/hooks/use-kanban.test.ts`**

Add to the existing test file:

```ts
describe("error handling", () => {
  it("shows toast.error when createBoard IDB write fails", async () => {
    const { toast } = await import("sonner");
    vi.spyOn(toast, "error");
    mockDB.put.mockRejectedValueOnce(new Error("IDB failure"));
    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(mockDB.getAll).toHaveBeenCalled());
    await act(async () => { await result.current.createBoard("Test"); });
    expect(toast.error).toHaveBeenCalledWith("Failed to save");
  });

  it("shows toast.error when removeCard IDB delete fails", async () => {
    const { toast } = await import("sonner");
    vi.spyOn(toast, "error");
    mockDB.delete.mockRejectedValueOnce(new Error("IDB failure"));
    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(mockDB.getAll).toHaveBeenCalled());
    await act(async () => { await result.current.removeCard("c1", "col1"); });
    expect(toast.error).toHaveBeenCalledWith("Failed to save");
  });
});
```

- [ ] **Step 6: Run to verify fails**

```bash
npx vitest run test/hooks/use-kanban.test.ts
```

Expected: FAIL on the new error handling tests.

- [ ] **Step 7: Update `src/hooks/use-kanban.ts`**

Add `import { toast } from "sonner";` after the existing imports.

Then apply these changes to each function:

**`createBoard`** — wrap body in try/catch:
```ts
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
```

**`updateBoard`** — add `.catch` to fire-and-forget `db.put`:
```ts
db.put("kanban_boards", updated).catch(() => toast.error("Failed to save"));
```

**`removeBoard`** — wrap transaction in try/catch:
```ts
const removeBoard = useCallback(async (id: string) => {
  try {
    const db = await getDB();
    const tx = db.transaction(["kanban_boards", "kanban_columns", "kanban_cards", "kanban_labels"], "readwrite");
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
```

**`createColumn`** — wrap `await db.put("kanban_columns", column)` in try/catch; add `.catch` to inner `db.put("kanban_boards", ...)`:
```ts
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
```

**`updateColumn`** — add `.catch` to fire-and-forget `db.put`:
```ts
db.put("kanban_columns", updated).catch(() => toast.error("Failed to save"));
```

**`removeColumn`** — wrap transaction in try/catch:
```ts
const removeColumn = useCallback(async (id: string, boardId: string) => {
  try {
    const db = await getDB();
    const tx = db.transaction(["kanban_boards", "kanban_columns", "kanban_cards"], "readwrite");
    await tx.objectStore("kanban_columns").delete(id);
    const cardKeys = (await tx.objectStore("kanban_cards").index("columnId").getAllKeys(id)) as string[];
    for (const cardKey of cardKeys) await tx.objectStore("kanban_cards").delete(cardKey);
    const board = await tx.objectStore("kanban_boards").get(boardId);
    if (board) {
      const updated = { ...board, columnOrder: board.columnOrder.filter((cid: string) => cid !== id), updatedAt: Date.now() };
      await tx.objectStore("kanban_boards").put(updated);
    }
    await tx.done;
    setState((prev) => ({
      boards: prev.boards.map((b) => b.id === boardId ? { ...b, columnOrder: b.columnOrder.filter((cid) => cid !== id) } : b),
      columns: prev.columns.filter((c) => c.id !== id),
      cards: prev.cards.filter((c) => c.columnId !== id),
    }));
  } catch {
    toast.error("Failed to save");
  }
}, []);
```

**`createCard`** — wrap `await db.put("kanban_cards", card)` in try/catch; add `.catch` to inner `db.put("kanban_columns", ...)`:
```ts
const createCard = useCallback(async (columnId: string, boardId: string, title: string) => {
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
}, []);
```

**`updateCard`** — add `.catch`:
```ts
db.put("kanban_cards", updated).catch(() => toast.error("Failed to save"));
```

**`removeCard`** — wrap in try/catch; add `.catch` to inner column update:
```ts
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
```

**`moveCard`, `reorderCards`, `reorderColumns`, `archiveCard`, `restoreCard`** — add `.catch(() => toast.error("Failed to save"))` to each `db.put(...)` call inside setState.

- [ ] **Step 8: Run use-kanban tests**

```bash
npx vitest run test/hooks/use-kanban.test.ts
```

Expected: all pass.

- [ ] **Step 9: Write failing test for `createLabel` error → `test/hooks/use-kanban-labels.test.ts`**

```ts
describe("error handling", () => {
  it("shows toast.error when createLabel IDB write fails", async () => {
    const { toast } = await import("sonner");
    vi.spyOn(toast, "error");
    mockDB.put.mockRejectedValueOnce(new Error("IDB failure"));
    const { result } = renderHook(() => useKanbanLabels("board-1"));
    await act(async () => { await result.current.createLabel("bug", "#ef4444"); });
    expect(toast.error).toHaveBeenCalledWith("Failed to save");
  });
});
```

- [ ] **Step 10: Run to verify fails**

```bash
npx vitest run test/hooks/use-kanban-labels.test.ts
```

Expected: FAIL.

- [ ] **Step 11: Update `src/hooks/use-kanban-labels.ts`**

```ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { KanbanLabel } from "@/types/kanban";
import { getDB } from "@/lib/db";

export function useKanbanLabels(boardId: string | null) {
  const [labels, setLabels] = useState<KanbanLabel[]>([]);

  useEffect(() => {
    if (!boardId) { setLabels([]); return; }
    getDB()
      .then((db) => db.getAllFromIndex("kanban_labels", "boardId", boardId))
      .then(setLabels)
      .catch(() => toast.error("Failed to load labels"));
  }, [boardId]);

  const createLabel = useCallback(async (name: string, color: string) => {
    if (!boardId) return;
    const now = Date.now();
    const label: KanbanLabel = { id: crypto.randomUUID(), boardId, name, color, createdAt: now, updatedAt: now };
    try {
      const db = await getDB();
      await db.put("kanban_labels", label);
      setLabels((prev) => [...prev, label]);
    } catch {
      toast.error("Failed to save");
    }
    return label;
  }, [boardId]);

  const updateLabel = useCallback(async (id: string, patch: Partial<Pick<KanbanLabel, "name" | "color">>) => {
    try {
      const db = await getDB();
      const existing = await db.get("kanban_labels", id);
      if (!existing) return;
      const updated = { ...existing, ...patch, updatedAt: Date.now() };
      await db.put("kanban_labels", updated);
      setLabels((prev) => prev.map((l) => (l.id === id ? updated : l)));
    } catch {
      toast.error("Failed to save");
    }
  }, []);

  const removeLabel = useCallback(async (id: string) => {
    try {
      const db = await getDB();
      await db.delete("kanban_labels", id);
      setLabels((prev) => prev.filter((l) => l.id !== id));
    } catch {
      toast.error("Failed to save");
    }
  }, []);

  return { labels, createLabel, updateLabel, removeLabel };
}
```

- [ ] **Step 12: Run all label tests**

```bash
npx vitest run test/hooks/use-kanban-labels.test.ts
```

Expected: all pass.

- [ ] **Step 13: Run full suite + type check**

```bash
npx vitest run && npx tsc --noEmit
```

Expected: all pass, no type errors.

- [ ] **Step 14: Commit**

```bash
git add src/hooks/use-notes.ts src/hooks/use-kanban.ts src/hooks/use-kanban-labels.ts \
  test/hooks/use-notes.test.ts test/hooks/use-kanban.test.ts test/hooks/use-kanban-labels.test.ts
git commit -m "feat: add IDB error handling with sonner toasts across all hooks"
```

---

### Task 3: Loading states in hooks + pages

**Files:**
- Modify: `src/hooks/use-kanban.ts`
- Modify: `src/hooks/use-notes.ts`
- Modify: `src/app/(workspace)/kanban/page.tsx`
- Modify: `src/app/(workspace)/notes/page.tsx`

**Interfaces:**
- Produces: `useKanban()` returns `isLoading: boolean`; `useNotes()` returns `isLoading: boolean`

- [ ] **Step 1: Write failing tests**

In `test/hooks/use-kanban.test.ts`, add:
```ts
it("isLoading is true before IDB resolves, false after", async () => {
  const { result } = renderHook(() => useKanban());
  expect(result.current.isLoading).toBe(true);
  await waitFor(() => expect(result.current.isLoading).toBe(false));
});
```

In `test/hooks/use-notes.test.ts`, add:
```ts
it("isLoading is true before IDB resolves, false after", async () => {
  const { result } = renderHook(() => useNotes());
  expect(result.current.isLoading).toBe(true);
  await waitFor(() => expect(result.current.isLoading).toBe(false));
});
```

- [ ] **Step 2: Run to verify fails**

```bash
npx vitest run test/hooks/use-kanban.test.ts test/hooks/use-notes.test.ts
```

Expected: FAIL — `isLoading` is `undefined`.

- [ ] **Step 3: Add `isLoading` to `src/hooks/use-kanban.ts`**

Change state shape:
```ts
const [isLoading, setIsLoading] = useState(true);
```

In `useEffect` load function, after `setState({ boards, columns, cards })` add `setIsLoading(false)`. Also add to `.catch` handler: `setIsLoading(false)`.

```ts
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
```

Add `isLoading` to return value:
```ts
return {
  ...state,
  isLoading,
  createBoard, updateBoard, removeBoard,
  createColumn, updateColumn, removeColumn,
  createCard, updateCard, removeCard,
  archiveCard, restoreCard,
  moveCard, reorderCards, reorderColumns,
};
```

- [ ] **Step 4: Add `isLoading` to `src/hooks/use-notes.ts`**

```ts
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  getDB()
    .then((db) => db.getAllFromIndex("notes", "updatedAt"))
    .then((all) => setNotes(all.reverse()))
    .catch(() => toast.error("Failed to load notes"))
    .finally(() => setIsLoading(false));
}, []);

// Add to return:
return { notes, isLoading, createNote, updateNote, removeNote, togglePin };
```

- [ ] **Step 5: Run hook tests**

```bash
npx vitest run test/hooks/use-kanban.test.ts test/hooks/use-notes.test.ts
```

Expected: all pass.

- [ ] **Step 6: Add loading UI to `src/app/(workspace)/kanban/page.tsx`**

Add import: `import { Loader2 } from "lucide-react";`

After `const kanban = useKanban();`, use `kanban.isLoading`:

```tsx
if (kanban.isLoading) {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}
```

Place this before the `if (kanban.boards.length === 0)` check.

- [ ] **Step 7: Add loading UI to `src/app/(workspace)/notes/page.tsx`**

```tsx
const { notes, isLoading, createNote, updateNote, removeNote, togglePin } = useNotes();
```

In the return, wrap the note list div:
```tsx
<div className={cn("flex flex-col border-r border-border h-full shrink-0", ...)}>
  {isLoading ? (
    <div className="flex flex-1 items-center justify-center">
      <Loader2 className="size-4 animate-spin text-muted-foreground" />
    </div>
  ) : (
    <NoteList ... />
  )}
</div>
```

Add import: `import { Loader2 } from "lucide-react";`

- [ ] **Step 8: Type check + full test run**

```bash
npx vitest run && npx tsc --noEmit
```

Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/hooks/use-kanban.ts src/hooks/use-notes.ts \
  src/app/\(workspace\)/kanban/page.tsx src/app/\(workspace\)/notes/page.tsx
git commit -m "feat: add isLoading state to hooks and spinner UI in pages"
```

---

### Task 4: Undo for note/card delete; confirm for board delete

**Files:**
- Modify: `src/app/(workspace)/notes/page.tsx`
- Modify: `src/app/(workspace)/kanban/page.tsx`

**Interfaces:**
- Consumes: `toast` from `"sonner"`, `removeNote` from `useNotes`, `removeCard`/`removeBoard` from `useKanban`
- Produces: 5-second undo toast for note + card delete; `window.confirm` gate on board delete

Sonner supports action buttons in toasts: `toast("Message", { action: { label: "Undo", onClick: fn }, duration: 5000 })`.

The undo pattern: capture the entity snapshot before deletion, apply the deletion optimistically in state (the hook already does this), then if user clicks Undo within 5s, re-insert via `createNote`/`updateCard` equivalent. 

**Simpler approach for undo:** Don't delete immediately. Instead show the toast first; on dismiss/timeout call the actual delete; on Undo, cancel. Use a `ref` to track whether deletion was cancelled.

```ts
// In notes page handleDelete:
async function handleDelete(id: string) {
  const note = notes.find((n) => n.id === id);
  if (!note) return;
  // Optimistically remove from UI
  setNotes((prev) => prev.filter((n) => n.id !== id)); // need hook to expose setter or use separate shadow state
```

Actually the hook's `removeNote` both deletes from IDB AND removes from state. We can't easily cancel. Instead, the undo pattern here is:
1. Call `removeNote(id)` immediately (optimistic)
2. Show toast with Undo that calls a `restoreNote(note)` function — which puts the note back

So I need to add a `restoreNote(note: Note)` to `useNotes`. Similarly, `restoreCard(card: KanbanCard)` already exists in `useKanban` (for archiving) but not for deleted cards. I'll add `restoreDeletedCard`.

Wait — `useKanban` already has `restoreCard` but it only sets `archived: false`. For truly deleted cards, I need a separate function that `db.put`s the full card back.

Let me add:
- `useNotes`: `restoreNote(note: Note): Promise<void>` 
- `useKanban`: `restoreDeletedCard(card: KanbanCard): Promise<void>`

These are simple: put back to IDB and add back to state.

- [ ] **Step 1: Add `restoreNote` to `src/hooks/use-notes.ts`**

```ts
async function restoreNote(note: Note) {
  try {
    const db = await getDB();
    await db.put("notes", note);
    setNotes((prev) => [note, ...prev].sort((a, b) => b.updatedAt - a.updatedAt));
  } catch {
    toast.error("Failed to restore note");
  }
}

// Add to return:
return { notes, isLoading, createNote, updateNote, removeNote, restoreNote, togglePin };
```

- [ ] **Step 2: Add `restoreDeletedCard` to `src/hooks/use-kanban.ts`**

```ts
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

// Add to return value
```

- [ ] **Step 3: Update `handleDelete` in `src/app/(workspace)/notes/page.tsx`**

```tsx
import { toast } from "sonner";

// In component:
const { notes, isLoading, createNote, updateNote, removeNote, restoreNote, togglePin } = useNotes();

async function handleDelete(id: string) {
  const note = notes.find((n) => n.id === id);
  if (!note) return;
  await removeNote(id);
  if (selectedId === id) setSelectedId(null);
  toast("Note deleted", {
    duration: 5000,
    action: {
      label: "Undo",
      onClick: () => restoreNote(note),
    },
  });
}
```

- [ ] **Step 4: Update `handleDeleteBoard` and card delete in `src/app/(workspace)/kanban/page.tsx`**

```tsx
import { toast } from "sonner";

// Board delete — add confirm gate:
function handleDeleteBoard(id: string) {
  if (!window.confirm("Delete this board and all its cards? This cannot be undone.")) return;
  const remaining = kanban.boards.filter((b) => b.id !== id);
  if (activeBoardId === id || activeBoardId === null) {
    setActiveBoardId(remaining[0]?.id ?? null);
  }
  if (selectedCard?.boardId === id) setSelectedCardId(null);
  kanban.removeBoard(id);
}

// Card delete — wrap in undo toast in CardDetailPanel's onDelete prop:
onDelete={(id, colId) => {
  const card = kanban.cards.find((c) => c.id === id);
  kanban.removeCard(id, colId);
  setSelectedCardId(null);
  if (card) {
    toast("Card deleted", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => kanban.restoreDeletedCard(card),
      },
    });
  }
}}
```

- [ ] **Step 5: Type check + test run**

```bash
npx vitest run && npx tsc --noEmit
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-notes.ts src/hooks/use-kanban.ts \
  src/app/\(workspace\)/notes/page.tsx src/app/\(workspace\)/kanban/page.tsx
git commit -m "feat: undo toast for note/card delete, confirm dialog for board delete"
```

---

### Task 5: JSON formatter localStorage persistence

**Files:**
- Modify: `src/app/(workspace)/json/page.tsx`

**Interfaces:**
- Produces: `input` state persisted to `localStorage` key `"devnest-json-input"`, restored on mount

- [ ] **Step 1: Write failing test** (manual — this is a page with no test file; verify behavior after implementation)

- [ ] **Step 2: Update `src/app/(workspace)/json/page.tsx`**

Add `useEffect` for load and save:

```tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlignLeft, Minimize2, Copy, Trash2, Check } from "lucide-react";
import { tryParse, formatJson, minifyJson } from "@/lib/json-format";
import { JsonInput } from "@/components/json/json-input";
import { JsonOutput } from "@/components/json/json-output";
import { JsonErrorBanner } from "@/components/json/json-error-banner";
import { cn } from "@/lib/utils";

const LS_KEY = "devnest-json-input";

// ... (keep all existing constants/buttonVariants)

export default function JsonPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  // Restore persisted input on mount
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) setInput(saved);
  }, []);

  // Persist input on change
  useEffect(() => {
    localStorage.setItem(LS_KEY, input);
  }, [input]);

  // ... rest of component unchanged
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(workspace\)/json/page.tsx
git commit -m "feat: persist JSON formatter input to localStorage"
```

---

### Task 6: Cross-board card move

**Files:**
- Modify: `src/hooks/use-kanban.ts`
- Modify: `src/components/kanban/card-detail-panel.tsx`
- Modify: `src/app/(workspace)/kanban/page.tsx`
- Modify: `test/hooks/use-kanban.test.ts`

**Interfaces:**
- Produces: `moveBetweenBoards(cardId: string, targetBoardId: string, targetColumnId: string): Promise<void>` on `useKanban`
- `CardDetailPanel` gets new props: `boards: KanbanBoard[]`, `allColumns: KanbanColumn[]`, `onMoveToBoard: (cardId: string, boardId: string, columnId: string) => void`

- [ ] **Step 1: Write failing test for `moveBetweenBoards`**

In `test/hooks/use-kanban.test.ts`, add:

```ts
describe("moveBetweenBoards", () => {
  it("moves card to target board and column, updates cardOrder on both columns", async () => {
    // seed: board1 with col1 containing card1; board2 with col2 empty
    const board1: KanbanBoard = { id: "b1", title: "B1", columnOrder: ["col1"], createdAt: 1, updatedAt: 1 };
    const board2: KanbanBoard = { id: "b2", title: "B2", columnOrder: ["col2"], createdAt: 2, updatedAt: 2 };
    const col1: KanbanColumn = { id: "col1", boardId: "b1", title: "C1", cardOrder: ["card1"], createdAt: 1, updatedAt: 1 };
    const col2: KanbanColumn = { id: "col2", boardId: "b2", title: "C2", cardOrder: [], createdAt: 2, updatedAt: 2 };
    const card1: KanbanCard = { id: "card1", columnId: "col1", boardId: "b1", title: "T", description: "", createdAt: 1, updatedAt: 1 };

    stores.kanban_boards.set("b1", board1);
    stores.kanban_boards.set("b2", board2);
    stores.kanban_columns.set("col1", col1);
    stores.kanban_columns.set("col2", col2);
    stores.kanban_cards.set("card1", card1);
    resetMockDB();

    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.boards).toHaveLength(2));

    await act(async () => {
      await result.current.moveBetweenBoards("card1", "b2", "col2");
    });

    const movedCard = result.current.cards.find((c) => c.id === "card1");
    expect(movedCard?.boardId).toBe("b2");
    expect(movedCard?.columnId).toBe("col2");

    const oldCol = result.current.columns.find((c) => c.id === "col1");
    expect(oldCol?.cardOrder).not.toContain("card1");

    const newCol = result.current.columns.find((c) => c.id === "col2");
    expect(newCol?.cardOrder).toContain("card1");
  });
});
```

- [ ] **Step 2: Run to verify fails**

```bash
npx vitest run test/hooks/use-kanban.test.ts
```

Expected: FAIL — `moveBetweenBoards` is not a function.

- [ ] **Step 3: Add `moveBetweenBoards` to `src/hooks/use-kanban.ts`**

```ts
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
      // getDB call ensures IDB is available before setState; actual writes are fire-and-forget above
    } catch {
      toast.error("Failed to save");
    }
  },
  []
);

// Add to return value
```

- [ ] **Step 4: Run use-kanban tests**

```bash
npx vitest run test/hooks/use-kanban.test.ts
```

Expected: all pass.

- [ ] **Step 5: Update `CardDetailPanel` props in `src/components/kanban/card-detail-panel.tsx`**

Add to imports: `import type { KanbanBoard } from "@/types/kanban";`

Add to `CardDetailPanelProps`:
```ts
boards?: KanbanBoard[];
allColumns?: KanbanColumn[];
onMoveToBoard?: (cardId: string, boardId: string, columnId: string) => void;
```

Add to destructuring:
```ts
boards = [], allColumns = [], onMoveToBoard,
```

Add state for the move UI:
```ts
const [showMovePanel, setShowMovePanel] = useState(false);
const [moveToBoardId, setMoveToBoardId] = useState("");
const [moveToColumnId, setMoveToColumnId] = useState("");
```

Reset on card change (add to existing `useEffect`):
```ts
useEffect(() => {
  setTitle(card.title);
  setShowLabelPicker(false);
  setShowMovePanel(false);
  setMoveToBoardId("");
  setMoveToColumnId("");
}, [card.id]);
```

Add the "Move to board" section in the scrollable body, after the Labels section:

```tsx
{/* Move to board */}
{onMoveToBoard && boards.length > 1 && (
  <div className="mt-3 border-t border-border px-4 pb-3 pt-3">
    {!showMovePanel ? (
      <button
        onClick={() => setShowMovePanel(true)}
        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        Move to board…
      </button>
    ) : (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Move to</p>
        <select
          value={moveToBoardId}
          onChange={(e) => { setMoveToBoardId(e.target.value); setMoveToColumnId(""); }}
          className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Select board…</option>
          {boards.filter((b) => b.id !== card.boardId).map((b) => (
            <option key={b.id} value={b.id}>{b.title}</option>
          ))}
        </select>
        {moveToBoardId && (
          <select
            value={moveToColumnId}
            onChange={(e) => setMoveToColumnId(e.target.value)}
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Select column…</option>
            {allColumns.filter((c) => c.boardId === moveToBoardId).map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <button
            disabled={!moveToBoardId || !moveToColumnId}
            onClick={() => {
              if (moveToBoardId && moveToColumnId) {
                onMoveToBoard(card.id, moveToBoardId, moveToColumnId);
                setShowMovePanel(false);
              }
            }}
            className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-40"
          >
            Move
          </button>
          <button
            onClick={() => { setShowMovePanel(false); setMoveToBoardId(""); setMoveToColumnId(""); }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 6: Wire up in `src/app/(workspace)/kanban/page.tsx`**

In the `CardDetailPanel` usage, add:

```tsx
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
  onArchive={(id) => { kanban.archiveCard(id); setSelectedCardId(null); }}
  onDelete={(id, colId) => {
    const card = kanban.cards.find((c) => c.id === id);
    kanban.removeCard(id, colId);
    setSelectedCardId(null);
    if (card) {
      toast("Card deleted", {
        duration: 5000,
        action: { label: "Undo", onClick: () => kanban.restoreDeletedCard(card) },
      });
    }
  }}
  onCreateLabel={createLabel}
  onRemoveLabel={handleRemoveLabel}
/>
```

- [ ] **Step 7: Type check + full test run**

```bash
npx vitest run && npx tsc --noEmit
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/use-kanban.ts src/components/kanban/card-detail-panel.tsx \
  src/app/\(workspace\)/kanban/page.tsx test/hooks/use-kanban.test.ts
git commit -m "feat: cross-board card move via CardDetailPanel move UI"
```

---

### Task 7: Note word/char count footer

**Files:**
- Modify: `src/components/notes/note-editor.tsx`

**Interfaces:**
- Produces: footer bar below editor showing `{words} words · {chars} chars`, updated on every keystroke

- [ ] **Step 1: Update `src/components/notes/note-editor.tsx`**

Add `wordCount` state and update it in both `onCreate` and `onUpdate`:

```tsx
const [wordCount, setWordCount] = useState({ words: 0, chars: 0 });

function computeCount(text: string) {
  return {
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    chars: text.length,
  };
}
```

In `useEditor`, add `onCreate` and update `onUpdate`:

```tsx
const editor = useEditor({
  extensions: [StarterKit, Underline, Link.configure({ openOnClick: false })],
  content: loadContent(note.content),
  editorProps: { attributes: { class: "prose-editor focus:outline-none min-h-64 px-4 md:px-6 py-5" } },
  onCreate({ editor }) {
    setWordCount(computeCount(editor.getText()));
  },
  onUpdate({ editor }) {
    setWordCount(computeCount(editor.getText()));
    setShowSaved(false);
    if (contentDebounceRef.current) clearTimeout(contentDebounceRef.current);
    contentDebounceRef.current = setTimeout(async () => {
      await onUpdate(note.id, { content: JSON.stringify(editor.getJSON()) });
      triggerSaved();
    }, 500);
  },
});
```

Add footer below the editor scroll area (inside the outer flex column, after the `flex-1 overflow-y-auto` div):

```tsx
{/* Word count footer */}
<div className="shrink-0 border-t border-border px-4 md:px-6 py-1.5">
  <span className="text-xs tabular-nums text-muted-foreground">
    {wordCount.words} words · {wordCount.chars} chars
  </span>
</div>
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/notes/note-editor.tsx
git commit -m "feat: add word and char count footer to note editor"
```

---

### Task 8: Kanban column WIP limits

**Files:**
- Modify: `src/types/kanban.ts`
- Modify: `src/hooks/use-kanban.ts`
- Modify: `src/components/kanban/kanban-column.tsx`
- Modify: `src/components/kanban/kanban-board.tsx`
- Modify: `src/app/(workspace)/kanban/page.tsx`
- Modify: `test/hooks/use-kanban.test.ts`

**Interfaces:**
- Produces: `KanbanColumn.wipLimit?: number`; `updateColumn` accepts `wipLimit` in changes; column header shows "N / limit" badge in amber (at limit) or red (over limit) when limit is set

- [ ] **Step 1: Add `wipLimit` to type in `src/types/kanban.ts`**

```ts
export interface KanbanColumn {
  id: string;
  boardId: string;
  title: string;
  cardOrder: string[];
  color?: string;
  wipLimit?: number;
  createdAt: number;
  updatedAt: number;
}
```

- [ ] **Step 2: Extend `updateColumn` signature in `src/hooks/use-kanban.ts`**

Change:
```ts
async (id: string, changes: Partial<Pick<KanbanColumn, "title" | "cardOrder" | "color">>) => {
```
To:
```ts
async (id: string, changes: Partial<Pick<KanbanColumn, "title" | "cardOrder" | "color" | "wipLimit">>) => {
```

- [ ] **Step 3: Write failing test**

In `test/hooks/use-kanban.test.ts`, add:

```ts
describe("WIP limits", () => {
  it("updateColumn persists wipLimit to IDB", async () => {
    const col: KanbanColumn = { id: "col1", boardId: "b1", title: "Todo", cardOrder: [], createdAt: 1, updatedAt: 1 };
    stores.kanban_columns.set("col1", col);
    resetMockDB();
    const { result } = renderHook(() => useKanban());
    await waitFor(() => expect(result.current.columns).toHaveLength(1));
    await act(async () => {
      await result.current.updateColumn("col1", { wipLimit: 3 });
    });
    const updated = result.current.columns.find((c) => c.id === "col1");
    expect(updated?.wipLimit).toBe(3);
  });
});
```

- [ ] **Step 4: Run to verify fails**

```bash
npx vitest run test/hooks/use-kanban.test.ts
```

Expected: FAIL — TypeScript won't accept `wipLimit` in changes yet (type error at test level or runtime).

- [ ] **Step 5: Run tests after type fix (Step 2 done)**

```bash
npx vitest run test/hooks/use-kanban.test.ts
```

Expected: all pass.

- [ ] **Step 6: Update `src/components/kanban/kanban-column.tsx`**

Add `onSetWipLimit: (id: string, limit: number | undefined) => void` to `KanbanColumnProps` interface and destructuring.

In the column header, when `editing === true`, add a WIP limit input below the title input:

```tsx
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
      <button onClick={commitRename} className={cn("shrink-0 transition-colors", hasColor ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground")}>
        <Check className="size-3.5" />
      </button>
      <button onClick={() => { setTitleValue(column.title); setEditing(false); }} className={cn("shrink-0 transition-colors", hasColor ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground")}>
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
  // existing non-editing header — update the card count badge:
  ...
)}
```

Update the card count badge to reflect WIP state:

```tsx
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
```

- [ ] **Step 7: Thread `onSetWipLimit` through `kanban-board.tsx`**

In `KanbanBoardProps` interface add:
```ts
onSetWipLimit: (id: string, limit: number | undefined) => void;
```

In `KanbanBoardView` destructuring add `onSetWipLimit`.

Pass it down to `KanbanColumnItem`:
```tsx
<KanbanColumnItem
  ...
  onSetWipLimit={onSetWipLimit}
/>
```

- [ ] **Step 8: Wire in `src/app/(workspace)/kanban/page.tsx`**

```tsx
<KanbanBoardView
  ...
  onSetWipLimit={(id, limit) => kanban.updateColumn(id, { wipLimit: limit })}
/>
```

- [ ] **Step 9: Type check + full test run**

```bash
npx vitest run && npx tsc --noEmit
```

Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add src/types/kanban.ts src/hooks/use-kanban.ts \
  src/components/kanban/kanban-column.tsx src/components/kanban/kanban-board.tsx \
  src/app/\(workspace\)/kanban/page.tsx test/hooks/use-kanban.test.ts
git commit -m "feat: kanban column WIP limits with amber/red count badge"
```

---

### Task 9: Compress CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Invoke `/caveman-compress` skill on CLAUDE.md**

Run the skill targeting `CLAUDE.md` in the project root.

- [ ] **Step 2: Verify CLAUDE.md still contains all required sections**

Check that architecture, commands, backup format, and tech stack notes are still present (in compressed form).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "chore: compress CLAUDE.md to reduce input token cost"
```

---

## Self-Review

**Spec coverage:**
- ✅ Task 1: Sonner install + Toaster
- ✅ Task 2: IDB error handling in all 3 hooks with toast.error
- ✅ Task 3: isLoading in hooks + spinner UI in both pages
- ✅ Task 4: Undo toast for note/card delete, confirm for board delete
- ✅ Task 5: JSON localStorage with restore on mount
- ✅ Task 6: moveBetweenBoards + CardDetailPanel move UI
- ✅ Task 7: Word/char count in NoteEditor footer
- ✅ Task 8: wipLimit on KanbanColumn type, in updateColumn, UI in column header
- ✅ Task 9: caveman-compress CLAUDE.md

**Type consistency check:**
- `moveBetweenBoards(cardId, targetBoardId, targetColumnId)` — consistent across Task 6 hook, component, and page
- `restoreDeletedCard(card: KanbanCard)` — defined Task 4, used Task 4 and Task 6
- `isLoading` — defined Task 3, consumed Task 3
- `onSetWipLimit(id: string, limit: number | undefined)` — consistent across Task 8 chain
- `wipLimit?: number` on `KanbanColumn` — defined Task 8 Step 1, used throughout Task 8

**Placeholder scan:** None found — all steps contain actual code.
