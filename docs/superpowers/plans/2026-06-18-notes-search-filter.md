# Notes Search & Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full-text search, sort order, date range filtering, and pin/favourite to the Notes sidebar.

**Architecture:** A new `useNotesFilter(notes)` hook owns all transient filter state and derives `filteredNotes` via `useMemo`. `useNotes` keeps owning DB operations and gains a `togglePin` function. `NotesPage` composes both hooks and passes filtered notes + filter callbacks down to `NoteList`.

**Tech Stack:** Next.js 16 App Router, React, Vitest + @testing-library/react, IndexedDB via `idb`, Tailwind v4, lucide-react icons, motion/react for animations.

## Global Constraints

- All UI must be responsive (mobile-first, Tailwind responsive utilities).
- Use `motion` from `"motion/react"` for any animated UI elements.
- Icons from `lucide-react` only.
- No Context API, no Zustand, no classes.
- Tests live in `test/` mirroring `src/` directory structure.
- Run tests with: `npx vitest run <path>` for a single file, `npx vitest run` for the full suite.
- All commits use `rtk git` prefix per project RTK rules.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types/notes.ts` | Modify | Add `pinned?: boolean`, `SortOrder`, `DateFilter` types |
| `src/types/index.ts` | Modify | Re-export `SortOrder` and `DateFilter` |
| `src/lib/note-content.ts` | Modify | Add `extractPlainText()` export |
| `src/hooks/use-notes.ts` | Modify | Add `togglePin(id)` |
| `src/hooks/use-notes-filter.ts` | **Create** | All filter/sort state + derived `filteredNotes` |
| `src/components/notes/note-list-item.tsx` | Modify | Fix preview (use `extractPlainText`), add pin icon + `onTogglePin` prop |
| `src/components/notes/note-list.tsx` | Modify | Add search input, sort/date dropdowns, pin toggle, clear-filters indicator |
| `src/app/(workspace)/notes/page.tsx` | Modify | Wire `useNotesFilter`, pass all new props to `NoteList` |
| `test/lib/note-content.test.ts` | Modify | Add `extractPlainText` tests |
| `test/hooks/use-notes.test.ts` | Modify | Add `togglePin` tests |
| `test/hooks/use-notes-filter.test.ts` | **Create** | Full filter hook coverage |
| `test/components/notes/note-list-item.test.tsx` | Modify | Add pin icon tests, update `makeNote` helper, add `onTogglePin` prop |
| `test/components/notes/note-list.test.tsx` | Modify | Add search/filter UI tests, update `defaultProps` |

---

## Task 1: Types + `extractPlainText`

**Files:**
- Modify: `src/types/notes.ts`
- Modify: `src/lib/note-content.ts`
- Modify: `test/lib/note-content.test.ts`

**Interfaces:**
- Produces: `Note` with `pinned?: boolean`, `SortOrder = "updatedAt" | "createdAt" | "title"`, `DateFilter = "all" | "today" | "week" | "month"`, `extractPlainText(raw: string): string`

- [ ] **Step 1: Write the failing tests for `extractPlainText`**

Append to `test/lib/note-content.test.ts` (after the existing `extractTitle` describe block):

```ts
describe("extractPlainText", () => {
  it("returns empty string for empty input", () => {
    expect(extractPlainText("")).toBe("");
  });

  it("extracts text from Tiptap JSON, skipping the first paragraph (title)", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Title" }] },
        { type: "paragraph", content: [{ type: "text", text: "Body text" }] },
      ],
    });
    expect(extractPlainText(doc)).toBe("Title Body text");
  });

  it("extracts text from nested Tiptap nodes", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello" },
            { type: "text", text: " world" },
          ],
        },
      ],
    });
    expect(extractPlainText(doc)).toBe("Hello  world");
  });

  it("returns empty string for Tiptap JSON with no text nodes", () => {
    const doc = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });
    expect(extractPlainText(doc)).toBe("");
  });

  it("returns empty string for malformed Tiptap JSON", () => {
    expect(extractPlainText('{"type":"doc" BROKEN')).toBe("");
  });

  it("extracts body from legacy plain text (skips first line)", () => {
    expect(extractPlainText("Title\nFirst body line\nSecond body line")).toBe(
      "First body line Second body line"
    );
  });

  it("returns empty string for legacy plain text with title only", () => {
    expect(extractPlainText("Title only")).toBe("");
  });
});
```

Also update the import line at the top of the file:

```ts
import { loadContent, extractTitle, extractPlainText } from "@/lib/note-content";
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run test/lib/note-content.test.ts
```

Expected: FAIL — `extractPlainText` is not exported.

- [ ] **Step 3: Add `SortOrder` and `DateFilter` types to `src/types/notes.ts`**

Replace the entire file with:

```ts
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
}

export type SortOrder = "updatedAt" | "createdAt" | "title";
export type DateFilter = "all" | "today" | "week" | "month";
```

- [ ] **Step 4: Update `src/types/index.ts` to re-export new types**

Replace the notes export line:

```ts
export type { Note, SortOrder, DateFilter } from "./notes";
export type { KanbanBoard, KanbanColumn, KanbanCard } from "./kanban";
```

- [ ] **Step 5: Add `extractPlainText` to `src/lib/note-content.ts`**

Append to the end of the file (after `extractTitle`):

```ts
function extractTextFromNode(node: DocNode): string {
  if ("text" in node) return (node as TextNode).text ?? "";
  return (node.content ?? []).map(extractTextFromNode).join(" ");
}

export function extractPlainText(raw: string): string {
  if (!raw) return "";
  if (raw.trimStart().startsWith('{"type":"doc"')) {
    try {
      const doc = JSON.parse(raw) as DocNode;
      return extractTextFromNode(doc).replace(/\s{2,}/g, " ").trim();
    } catch {
      return "";
    }
  }
  return raw.split("\n").slice(1).join(" ").trim();
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run test/lib/note-content.test.ts
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
rtk git add src/types/notes.ts src/types/index.ts src/lib/note-content.ts test/lib/note-content.test.ts
rtk git commit -m "feat: add pinned field to Note, SortOrder/DateFilter types, extractPlainText utility"
```

---

## Task 2: `togglePin` in `useNotes`

**Files:**
- Modify: `src/hooks/use-notes.ts`
- Modify: `test/hooks/use-notes.test.ts`

**Interfaces:**
- Consumes: `Note` with `pinned?: boolean` from Task 1
- Produces: `togglePin(id: string): Promise<void>` added to `useNotes` return value

- [ ] **Step 1: Write the failing tests for `togglePin`**

Append to the `useNotes()` describe block in `test/hooks/use-notes.test.ts` (after the `removeNote` tests):

```ts
// ── togglePin ──────────────────────────────────────────────────────────────

it("togglePin() sets pinned=true on an unpinned note", async () => {
  const note = makeNote({ id: "n1", pinned: false });
  seedStore([note]);

  const { result } = renderHook(() => useNotes());
  await waitFor(() => expect(result.current.notes).toHaveLength(1));

  await act(async () => {
    await result.current.togglePin("n1");
  });

  expect(result.current.notes[0].pinned).toBe(true);
});

it("togglePin() sets pinned=false on a pinned note", async () => {
  const note = makeNote({ id: "n1", pinned: true });
  seedStore([note]);

  const { result } = renderHook(() => useNotes());
  await waitFor(() => expect(result.current.notes).toHaveLength(1));

  await act(async () => {
    await result.current.togglePin("n1");
  });

  expect(result.current.notes[0].pinned).toBe(false);
});

it("togglePin() persists the change to the mock DB", async () => {
  const note = makeNote({ id: "n1", pinned: false });
  seedStore([note]);

  const { result } = renderHook(() => useNotes());
  await waitFor(() => expect(result.current.notes).toHaveLength(1));

  await act(async () => {
    await result.current.togglePin("n1");
  });

  expect(mockDB.put).toHaveBeenCalledWith(
    "notes",
    expect.objectContaining({ id: "n1", pinned: true })
  );
});

it("togglePin() is a no-op for an unknown id", async () => {
  const { result } = renderHook(() => useNotes());
  await waitFor(() => expect(result.current.notes).toBeDefined());

  await act(async () => {
    await result.current.togglePin("ghost");
  });

  expect(result.current.notes).toHaveLength(0);
});
```

Also update `makeNote` in `test/hooks/use-notes.test.ts` to include `pinned`:

```ts
function makeNote(overrides: Partial<Note> = {}): Note {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "Untitled",
    content: "",
    createdAt: now,
    updatedAt: now,
    pinned: false,
    ...overrides,
  };
}
```

- [ ] **Step 2: Run tests to verify new tests fail**

```bash
npx vitest run test/hooks/use-notes.test.ts
```

Expected: FAIL — `togglePin` is not a function.

- [ ] **Step 3: Add `togglePin` to `src/hooks/use-notes.ts`**

Add the function before the `return` statement, and add it to the return object:

```ts
async function togglePin(id: string) {
  const db = await getDB();
  const existing = await db.get("notes", id);
  if (!existing) return;
  const updated: Note = { ...existing, pinned: !existing.pinned };
  await db.put("notes", updated);
  setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
}
```

Update the return statement:

```ts
return { notes, createNote, updateNote, removeNote, togglePin };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run test/hooks/use-notes.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/hooks/use-notes.ts test/hooks/use-notes.test.ts
rtk git commit -m "feat: add togglePin to useNotes"
```

---

## Task 3: `useNotesFilter` hook

**Files:**
- Create: `src/hooks/use-notes-filter.ts`
- Create: `test/hooks/use-notes-filter.test.ts`

**Interfaces:**
- Consumes: `Note` (with `pinned?`), `SortOrder`, `DateFilter` from Task 1; `extractPlainText` from Task 1
- Produces:
  ```ts
  useNotesFilter(notes: Note[]): {
    filteredNotes: Note[];
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    sortOrder: SortOrder;
    setSortOrder: (s: SortOrder) => void;
    dateFilter: DateFilter;
    setDateFilter: (d: DateFilter) => void;
    showPinnedOnly: boolean;
    setShowPinnedOnly: (v: boolean) => void;
    hasActiveFilters: boolean;
    clearFilters: () => void;
  }
  ```

- [ ] **Step 1: Write the failing tests**

Create `test/hooks/use-notes-filter.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNotesFilter } from "@/hooks/use-notes-filter";
import type { Note } from "@/types/notes";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: crypto.randomUUID(),
    title: "Untitled",
    content: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pinned: false,
    ...overrides,
  };
}

const DAY = 86_400_000;

describe("useNotesFilter()", () => {
  // ── defaults ──────────────────────────────────────────────────────────────

  it("returns all notes unchanged with default filters", () => {
    const notes = [makeNote({ title: "A" }), makeNote({ title: "B" })];
    const { result } = renderHook(() => useNotesFilter(notes));
    expect(result.current.filteredNotes).toHaveLength(2);
  });

  it("hasActiveFilters is false by default", () => {
    const { result } = renderHook(() => useNotesFilter([]));
    expect(result.current.hasActiveFilters).toBe(false);
  });

  // ── search ────────────────────────────────────────────────────────────────

  it("filters by title (case-insensitive) after debounce", async () => {
    vi.useFakeTimers();
    const notes = [
      makeNote({ title: "Meeting notes" }),
      makeNote({ title: "Shopping list" }),
    ];
    const { result } = renderHook(() => useNotesFilter(notes));

    act(() => {
      result.current.setSearchQuery("meeting");
      vi.advanceTimersByTime(200);
    });

    expect(result.current.filteredNotes).toHaveLength(1);
    expect(result.current.filteredNotes[0].title).toBe("Meeting notes");
    vi.useRealTimers();
  });

  it("filters by plain-text content after debounce", async () => {
    vi.useFakeTimers();
    const notes = [
      makeNote({ title: "A", content: "A\nThis has the keyword alpha" }),
      makeNote({ title: "B", content: "B\nNothing relevant" }),
    ];
    const { result } = renderHook(() => useNotesFilter(notes));

    act(() => {
      result.current.setSearchQuery("alpha");
      vi.advanceTimersByTime(200);
    });

    expect(result.current.filteredNotes).toHaveLength(1);
    expect(result.current.filteredNotes[0].title).toBe("A");
    vi.useRealTimers();
  });

  it("search does not filter before debounce fires (150ms)", () => {
    vi.useFakeTimers();
    const notes = [makeNote({ title: "Alpha" }), makeNote({ title: "Beta" })];
    const { result } = renderHook(() => useNotesFilter(notes));

    act(() => {
      result.current.setSearchQuery("alpha");
      vi.advanceTimersByTime(100); // not yet
    });

    expect(result.current.filteredNotes).toHaveLength(2);
    vi.useRealTimers();
  });

  it("hasActiveFilters is true when search is non-empty", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useNotesFilter([]));
    act(() => {
      result.current.setSearchQuery("hello");
      vi.advanceTimersByTime(200);
    });
    expect(result.current.hasActiveFilters).toBe(true);
    vi.useRealTimers();
  });

  // ── sort ──────────────────────────────────────────────────────────────────

  it("sortOrder updatedAt sorts descending by updatedAt (default)", () => {
    const notes = [
      makeNote({ id: "old", updatedAt: 100 }),
      makeNote({ id: "new", updatedAt: 200 }),
    ];
    const { result } = renderHook(() => useNotesFilter(notes));
    expect(result.current.filteredNotes[0].id).toBe("new");
    expect(result.current.filteredNotes[1].id).toBe("old");
  });

  it("sortOrder createdAt sorts descending by createdAt", () => {
    const notes = [
      makeNote({ id: "first", createdAt: 100, updatedAt: 999 }),
      makeNote({ id: "second", createdAt: 200, updatedAt: 1 }),
    ];
    const { result } = renderHook(() => useNotesFilter(notes));
    act(() => result.current.setSortOrder("createdAt"));
    expect(result.current.filteredNotes[0].id).toBe("second");
    expect(result.current.filteredNotes[1].id).toBe("first");
  });

  it("sortOrder title sorts ascending A–Z", () => {
    const notes = [
      makeNote({ id: "z", title: "Zebra" }),
      makeNote({ id: "a", title: "Apple" }),
    ];
    const { result } = renderHook(() => useNotesFilter(notes));
    act(() => result.current.setSortOrder("title"));
    expect(result.current.filteredNotes[0].id).toBe("a");
    expect(result.current.filteredNotes[1].id).toBe("z");
  });

  it("hasActiveFilters is true when sortOrder is not updatedAt", () => {
    const { result } = renderHook(() => useNotesFilter([]));
    act(() => result.current.setSortOrder("title"));
    expect(result.current.hasActiveFilters).toBe(true);
  });

  // ── date filter ───────────────────────────────────────────────────────────

  it("dateFilter today shows only notes updated today", () => {
    const todayNote = makeNote({ updatedAt: Date.now() });
    const oldNote = makeNote({ updatedAt: Date.now() - 3 * DAY });
    const { result } = renderHook(() => useNotesFilter([todayNote, oldNote]));
    act(() => result.current.setDateFilter("today"));
    expect(result.current.filteredNotes).toHaveLength(1);
    expect(result.current.filteredNotes[0].id).toBe(todayNote.id);
  });

  it("dateFilter week shows notes within the last 7 days", () => {
    const recentNote = makeNote({ updatedAt: Date.now() - 3 * DAY });
    const oldNote = makeNote({ updatedAt: Date.now() - 10 * DAY });
    const { result } = renderHook(() => useNotesFilter([recentNote, oldNote]));
    act(() => result.current.setDateFilter("week"));
    expect(result.current.filteredNotes).toHaveLength(1);
    expect(result.current.filteredNotes[0].id).toBe(recentNote.id);
  });

  it("dateFilter month shows notes within the last 30 days", () => {
    const recentNote = makeNote({ updatedAt: Date.now() - 15 * DAY });
    const oldNote = makeNote({ updatedAt: Date.now() - 45 * DAY });
    const { result } = renderHook(() => useNotesFilter([recentNote, oldNote]));
    act(() => result.current.setDateFilter("month"));
    expect(result.current.filteredNotes).toHaveLength(1);
    expect(result.current.filteredNotes[0].id).toBe(recentNote.id);
  });

  it("hasActiveFilters is true when dateFilter is not all", () => {
    const { result } = renderHook(() => useNotesFilter([]));
    act(() => result.current.setDateFilter("week"));
    expect(result.current.hasActiveFilters).toBe(true);
  });

  // ── pin filter ────────────────────────────────────────────────────────────

  it("showPinnedOnly filters to only pinned notes", () => {
    const pinned = makeNote({ id: "p", pinned: true });
    const normal = makeNote({ id: "n", pinned: false });
    const { result } = renderHook(() => useNotesFilter([pinned, normal]));
    act(() => result.current.setShowPinnedOnly(true));
    expect(result.current.filteredNotes).toHaveLength(1);
    expect(result.current.filteredNotes[0].id).toBe("p");
  });

  it("hasActiveFilters is true when showPinnedOnly is true", () => {
    const { result } = renderHook(() => useNotesFilter([]));
    act(() => result.current.setShowPinnedOnly(true));
    expect(result.current.hasActiveFilters).toBe(true);
  });

  // ── pin floating ──────────────────────────────────────────────────────────

  it("pinned notes float to the top within sorted results", () => {
    const normal = makeNote({ id: "normal", pinned: false, updatedAt: 200 });
    const pinned = makeNote({ id: "pinned", pinned: true, updatedAt: 100 });
    const { result } = renderHook(() => useNotesFilter([normal, pinned]));
    // normal has higher updatedAt but pinned should be first
    expect(result.current.filteredNotes[0].id).toBe("pinned");
    expect(result.current.filteredNotes[1].id).toBe("normal");
  });

  // ── clearFilters ──────────────────────────────────────────────────────────

  it("clearFilters resets all state to defaults", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useNotesFilter([]));

    act(() => {
      result.current.setSearchQuery("hello");
      result.current.setSortOrder("title");
      result.current.setDateFilter("week");
      result.current.setShowPinnedOnly(true);
      vi.advanceTimersByTime(200);
    });

    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.clearFilters());

    expect(result.current.searchQuery).toBe("");
    expect(result.current.sortOrder).toBe("updatedAt");
    expect(result.current.dateFilter).toBe("all");
    expect(result.current.showPinnedOnly).toBe(false);
    expect(result.current.hasActiveFilters).toBe(false);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run test/hooks/use-notes-filter.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/hooks/use-notes-filter.ts`**

```ts
"use client";

import { useState, useMemo, useEffect } from "react";
import type { Note, SortOrder, DateFilter } from "@/types/notes";
import { extractPlainText } from "@/lib/note-content";

const DAY_MS = 86_400_000;

function isInDateRange(ts: number, filter: DateFilter): boolean {
  if (filter === "all") return true;
  const now = Date.now();
  if (filter === "today") {
    const d = new Date(ts);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }
  if (filter === "week") return now - ts <= 7 * DAY_MS;
  if (filter === "month") return now - ts <= 30 * DAY_MS;
  return true;
}

export function useNotesFilter(notes: Note[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("updatedAt");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery), 150);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const filteredNotes = useMemo(() => {
    let result = [...notes];

    if (dateFilter !== "all") {
      result = result.filter((n) => isInDateRange(n.updatedAt, dateFilter));
    }

    if (showPinnedOnly) {
      result = result.filter((n) => n.pinned);
    }

    const q = debouncedQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          extractPlainText(n.content).toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortOrder === "title") return a.title.localeCompare(b.title);
      if (sortOrder === "createdAt") return b.createdAt - a.createdAt;
      return b.updatedAt - a.updatedAt;
    });

    // Pinned notes always float to top
    result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

    return result;
  }, [notes, debouncedQuery, sortOrder, dateFilter, showPinnedOnly]);

  const hasActiveFilters =
    searchQuery !== "" ||
    sortOrder !== "updatedAt" ||
    dateFilter !== "all" ||
    showPinnedOnly;

  function clearFilters() {
    setSearchQuery("");
    setDebouncedQuery("");
    setSortOrder("updatedAt");
    setDateFilter("all");
    setShowPinnedOnly(false);
  }

  return {
    filteredNotes,
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    dateFilter,
    setDateFilter,
    showPinnedOnly,
    setShowPinnedOnly,
    hasActiveFilters,
    clearFilters,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run test/hooks/use-notes-filter.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Run the full test suite to catch regressions**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/hooks/use-notes-filter.ts test/hooks/use-notes-filter.test.ts
rtk git commit -m "feat: add useNotesFilter hook (search, sort, date, pin)"
```

---

## Task 4: `NoteListItem` — fix preview + pin icon

**Files:**
- Modify: `src/components/notes/note-list-item.tsx`
- Modify: `test/components/notes/note-list-item.test.tsx`

**Interfaces:**
- Consumes: `extractPlainText` from Task 1; `Note` with `pinned?` from Task 1
- Produces: `NoteListItem` with new `onTogglePin: () => void` prop

- [ ] **Step 1: Write the failing tests**

Replace the entire `test/components/notes/note-list-item.test.tsx` with:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteListItem } from "@/components/notes/note-list-item";
import type { Note } from "@/types/notes";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    title: "My Note",
    content: "My Note\nFirst line of body",
    createdAt: 1_000_000,
    updatedAt: 1_000_000,
    pinned: false,
    ...overrides,
  };
}

const defaultProps = {
  note: makeNote(),
  selected: false,
  onSelect: () => {},
  onDelete: () => {},
  onTogglePin: () => {},
};

describe("<NoteListItem />", () => {
  it("renders the note title", () => {
    render(<NoteListItem {...defaultProps} />);
    expect(screen.getByText("My Note")).toBeInTheDocument();
  });

  it("renders a preview from plain-text content body", () => {
    render(
      <NoteListItem
        {...defaultProps}
        note={makeNote({ content: "Title line\nPreview text here" })}
      />
    );
    expect(screen.getByText("Preview text here")).toBeInTheDocument();
  });

  it("renders a preview extracted from Tiptap JSON content", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Title" }] },
        { type: "paragraph", content: [{ type: "text", text: "JSON preview text" }] },
      ],
    });
    render(
      <NoteListItem {...defaultProps} note={makeNote({ content: doc })} />
    );
    expect(screen.getByText(/JSON preview text/)).toBeInTheDocument();
  });

  it("renders the formatted date when there is no body content", () => {
    const note = makeNote({ content: "Title only", updatedAt: new Date("2024-01-15").getTime() });
    render(<NoteListItem {...defaultProps} note={note} />);
    const formatted = new Date(note.updatedAt).toLocaleDateString();
    expect(screen.getByText(formatted)).toBeInTheDocument();
  });

  it("calls onSelect when the item is clicked", async () => {
    const onSelect = vi.fn();
    render(<NoteListItem {...defaultProps} onSelect={onSelect} />);
    await userEvent.click(screen.getByText("My Note"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("calls onDelete when the delete button is clicked", async () => {
    const onDelete = vi.fn();
    render(<NoteListItem {...defaultProps} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole("button", { name: /delete note/i }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("does NOT call onSelect when the delete button is clicked", async () => {
    const onSelect = vi.fn();
    render(<NoteListItem {...defaultProps} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /delete note/i }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("applies selected styling when selected=true", () => {
    const { container } = render(<NoteListItem {...defaultProps} selected={true} />);
    expect(container.firstChild).toHaveClass("bg-primary");
  });

  it("does not apply bg-primary when selected=false", () => {
    const { container } = render(<NoteListItem {...defaultProps} selected={false} />);
    expect(container.firstChild).not.toHaveClass("bg-primary");
  });

  // ── pin icon ───────────────────────────────────────────────────────────────

  it("pin button has aria-label 'Pin note' when note is not pinned", () => {
    render(<NoteListItem {...defaultProps} note={makeNote({ pinned: false })} />);
    expect(screen.getByRole("button", { name: /pin note/i })).toBeInTheDocument();
  });

  it("pin button has aria-label 'Unpin note' when note is pinned", () => {
    render(<NoteListItem {...defaultProps} note={makeNote({ pinned: true })} />);
    expect(screen.getByRole("button", { name: /unpin note/i })).toBeInTheDocument();
  });

  it("calls onTogglePin when pin button is clicked", async () => {
    const onTogglePin = vi.fn();
    render(<NoteListItem {...defaultProps} onTogglePin={onTogglePin} />);
    await userEvent.click(screen.getByRole("button", { name: /pin note/i }));
    expect(onTogglePin).toHaveBeenCalledOnce();
  });

  it("does NOT call onSelect when pin button is clicked", async () => {
    const onSelect = vi.fn();
    render(<NoteListItem {...defaultProps} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /pin note/i }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

```bash
npx vitest run test/components/notes/note-list-item.test.tsx
```

Expected: FAIL — `onTogglePin` prop missing, pin button not found.

- [ ] **Step 3: Replace `src/components/notes/note-list-item.tsx`**

```tsx
"use client";

import { motion } from "motion/react";
import { Trash2, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { extractPlainText } from "@/lib/note-content";
import type { Note } from "@/types";

interface Props {
  note: Note;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

export function NoteListItem({ note, selected, onSelect, onDelete, onTogglePin }: Props) {
  const preview = extractPlainText(note.content);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "group flex items-start justify-between gap-2 rounded-md px-3 py-2.5 mb-0.5 cursor-pointer transition-colors",
        selected
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-foreground"
      )}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{note.title}</p>
        <p
          className={cn(
            "text-xs truncate mt-0.5",
            selected ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {preview || new Date(note.updatedAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
        <Button
          size="icon-xs"
          variant="ghost"
          className={cn(
            "transition-opacity",
            note.pinned ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            selected && "hover:bg-white/20 text-primary-foreground"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          aria-label={note.pinned ? "Unpin note" : "Pin note"}
        >
          <Pin className={cn("size-3", note.pinned && "fill-current")} />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          className={cn(
            "opacity-0 group-hover:opacity-100 shrink-0 transition-opacity",
            selected && "hover:bg-white/20 text-primary-foreground"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete note"
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run test/components/notes/note-list-item.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/notes/note-list-item.tsx test/components/notes/note-list-item.test.tsx
rtk git commit -m "feat: fix NoteListItem preview for Tiptap JSON, add pin icon"
```

---

## Task 5: `NoteList` — search + filter UI

**Files:**
- Modify: `src/components/notes/note-list.tsx`
- Modify: `test/components/notes/note-list.test.tsx`

**Interfaces:**
- Consumes: `SortOrder`, `DateFilter` from Task 1; `NoteListItem` with `onTogglePin` from Task 4
- Produces: `NoteList` with extended props for search, sort, date filter, pin toggle, clear filters, and `onTogglePin`

- [ ] **Step 1: Write the failing tests**

Replace the entire `test/components/notes/note-list.test.tsx` with:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteList } from "@/components/notes/note-list";
import type { Note } from "@/types/notes";
import type { SortOrder, DateFilter } from "@/types/notes";

function makeNote(id: string, title: string): Note {
  return { id, title, content: title, createdAt: 1, updatedAt: 1, pinned: false };
}

const defaultProps = {
  notes: [],
  selectedId: null,
  onSelect: () => {},
  onNew: () => {},
  onDelete: () => {},
  onTogglePin: () => {},
  searchQuery: "",
  onSearchChange: () => {},
  sortOrder: "updatedAt" as SortOrder,
  onSortChange: () => {},
  dateFilter: "all" as DateFilter,
  onDateFilterChange: () => {},
  showPinnedOnly: false,
  onShowPinnedOnlyChange: () => {},
  hasActiveFilters: false,
  onClearFilters: () => {},
};

describe("<NoteList />", () => {
  it("renders the 'Notes' header", () => {
    render(<NoteList {...defaultProps} />);
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  it("shows 'No notes yet' when list is empty and no active filters", () => {
    render(<NoteList {...defaultProps} />);
    expect(screen.getByText("No notes yet")).toBeInTheDocument();
  });

  it("shows 'No notes match your filters' when list is empty and filters are active", () => {
    render(<NoteList {...defaultProps} hasActiveFilters={true} />);
    expect(screen.getByText("No notes match your filters")).toBeInTheDocument();
  });

  it("renders one row per note", () => {
    const notes = [makeNote("1", "Alpha"), makeNote("2", "Beta")];
    render(<NoteList {...defaultProps} notes={notes} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("does not show the empty state when there are notes", () => {
    const notes = [makeNote("1", "Alpha")];
    render(<NoteList {...defaultProps} notes={notes} />);
    expect(screen.queryByText("No notes yet")).not.toBeInTheDocument();
  });

  it("calls onNew when the + button is clicked", async () => {
    const onNew = vi.fn();
    render(<NoteList {...defaultProps} onNew={onNew} />);
    await userEvent.click(screen.getByRole("button", { name: /new note/i }));
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("calls onSelect with the correct note id when a note is clicked", async () => {
    const onSelect = vi.fn();
    const notes = [makeNote("n42", "My Note")];
    render(<NoteList {...defaultProps} notes={notes} onSelect={onSelect} />);
    await userEvent.click(screen.getByText("My Note"));
    expect(onSelect).toHaveBeenCalledWith("n42");
  });

  it("calls onDelete with the correct note id when delete is clicked", async () => {
    const onDelete = vi.fn();
    const notes = [makeNote("n7", "Delete Me")];
    render(<NoteList {...defaultProps} notes={notes} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole("button", { name: /delete note/i }));
    expect(onDelete).toHaveBeenCalledWith("n7");
  });

  it("marks the selected note", () => {
    const notes = [makeNote("n1", "Active"), makeNote("n2", "Inactive")];
    const { container } = render(<NoteList {...defaultProps} notes={notes} selectedId="n1" />);
    expect(container.querySelector(".bg-primary")).toBeInTheDocument();
  });

  // ── search input ──────────────────────────────────────────────────────────

  it("renders the search input with placeholder 'Search notes...'", () => {
    render(<NoteList {...defaultProps} />);
    expect(screen.getByPlaceholderText("Search notes...")).toBeInTheDocument();
  });

  it("search input shows the current searchQuery value", () => {
    render(<NoteList {...defaultProps} searchQuery="hello" />);
    expect(screen.getByDisplayValue("hello")).toBeInTheDocument();
  });

  it("calls onSearchChange when typing in the search input", async () => {
    const onSearchChange = vi.fn();
    render(<NoteList {...defaultProps} onSearchChange={onSearchChange} />);
    await userEvent.type(screen.getByPlaceholderText("Search notes..."), "abc");
    expect(onSearchChange).toHaveBeenCalledWith(expect.stringContaining("a"));
  });

  it("calls onSearchChange('') when Escape is pressed in the search input", async () => {
    const onSearchChange = vi.fn();
    render(<NoteList {...defaultProps} searchQuery="hello" onSearchChange={onSearchChange} />);
    const input = screen.getByPlaceholderText("Search notes...");
    await userEvent.click(input);
    await userEvent.keyboard("{Escape}");
    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  // ── sort dropdown ─────────────────────────────────────────────────────────

  it("renders a sort select with 'Modified' as the default visible option", () => {
    render(<NoteList {...defaultProps} />);
    expect(screen.getByRole("combobox", { name: /sort order/i })).toBeInTheDocument();
  });

  it("calls onSortChange when sort select changes", async () => {
    const onSortChange = vi.fn();
    render(<NoteList {...defaultProps} onSortChange={onSortChange} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /sort order/i }), "title");
    expect(onSortChange).toHaveBeenCalledWith("title");
  });

  // ── date dropdown ─────────────────────────────────────────────────────────

  it("renders a date filter select", () => {
    render(<NoteList {...defaultProps} />);
    expect(screen.getByRole("combobox", { name: /date filter/i })).toBeInTheDocument();
  });

  it("calls onDateFilterChange when date select changes", async () => {
    const onDateFilterChange = vi.fn();
    render(<NoteList {...defaultProps} onDateFilterChange={onDateFilterChange} />);
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /date filter/i }),
      "week"
    );
    expect(onDateFilterChange).toHaveBeenCalledWith("week");
  });

  // ── pin toggle ────────────────────────────────────────────────────────────

  it("renders a pin toggle button", () => {
    render(<NoteList {...defaultProps} />);
    expect(screen.getByRole("button", { name: /show pinned only/i })).toBeInTheDocument();
  });

  it("calls onShowPinnedOnlyChange(true) when pin toggle is clicked while off", async () => {
    const onShowPinnedOnlyChange = vi.fn();
    render(
      <NoteList
        {...defaultProps}
        showPinnedOnly={false}
        onShowPinnedOnlyChange={onShowPinnedOnlyChange}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /show pinned only/i }));
    expect(onShowPinnedOnlyChange).toHaveBeenCalledWith(true);
  });

  it("calls onShowPinnedOnlyChange(false) when pin toggle is clicked while on", async () => {
    const onShowPinnedOnlyChange = vi.fn();
    render(
      <NoteList
        {...defaultProps}
        showPinnedOnly={true}
        onShowPinnedOnlyChange={onShowPinnedOnlyChange}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /show all notes/i }));
    expect(onShowPinnedOnlyChange).toHaveBeenCalledWith(false);
  });

  // ── clear filters ─────────────────────────────────────────────────────────

  it("does not show 'Clear filters' when hasActiveFilters is false", () => {
    render(<NoteList {...defaultProps} hasActiveFilters={false} />);
    expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it("shows 'Clear filters' button when hasActiveFilters is true", () => {
    render(<NoteList {...defaultProps} hasActiveFilters={true} />);
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
  });

  it("calls onClearFilters when 'Clear filters' is clicked", async () => {
    const onClearFilters = vi.fn();
    render(
      <NoteList {...defaultProps} hasActiveFilters={true} onClearFilters={onClearFilters} />
    );
    await userEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

```bash
npx vitest run test/components/notes/note-list.test.tsx
```

Expected: FAIL — new props missing, search input / selects not found.

- [ ] **Step 3: Replace `src/components/notes/note-list.tsx`**

```tsx
"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus, StickyNote, Search, ArrowUpDown, Calendar, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NoteListItem } from "./note-list-item";
import type { Note, SortOrder, DateFilter } from "@/types";

interface Props {
  notes: Note[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortOrder: SortOrder;
  onSortChange: (s: SortOrder) => void;
  dateFilter: DateFilter;
  onDateFilterChange: (d: DateFilter) => void;
  showPinnedOnly: boolean;
  onShowPinnedOnlyChange: (v: boolean) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function NoteList({
  notes, selectedId, onSelect, onNew, onDelete, onTogglePin,
  searchQuery, onSearchChange, sortOrder, onSortChange,
  dateFilter, onDateFilterChange, showPinnedOnly, onShowPinnedOnlyChange,
  hasActiveFilters, onClearFilters,
}: Props) {
  return (
    <div className="flex flex-col border-r border-border h-full w-full">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold text-foreground">Notes</span>
        <Button size="icon-xs" variant="ghost" onClick={onNew} aria-label="New note">
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* Search input */}
      <div className="px-3 pt-2 pb-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") onSearchChange(""); }}
            className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Search notes"
          />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1.5 px-3 pb-1.5">
        {/* Sort */}
        <div className="relative flex-1">
          <select
            value={sortOrder}
            onChange={(e) => onSortChange(e.target.value as SortOrder)}
            className="w-full appearance-none pl-2 pr-6 py-1 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            aria-label="Sort order"
          >
            <option value="updatedAt">Modified</option>
            <option value="createdAt">Created</option>
            <option value="title">A–Z</option>
          </select>
          <ArrowUpDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
        </div>

        {/* Date */}
        <div className="relative flex-1">
          <select
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value as DateFilter)}
            className="w-full appearance-none pl-2 pr-6 py-1 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            aria-label="Date filter"
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
          </select>
          <Calendar className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
        </div>

        {/* Pin toggle */}
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => onShowPinnedOnlyChange(!showPinnedOnly)}
          aria-label={showPinnedOnly ? "Show all notes" : "Show pinned only"}
          aria-pressed={showPinnedOnly}
          className={cn(showPinnedOnly && "bg-primary/10 text-primary")}
        >
          <Pin className="size-3.5" />
        </Button>
      </div>

      {/* Active filter indicator */}
      {hasActiveFilters && (
        <div className="px-3 pb-1.5 flex justify-end">
          <button
            onClick={onClearFilters}
            className="text-xs text-muted-foreground hover:text-foreground underline"
            aria-label="Clear filters"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Note list */}
      <div className="flex-1 overflow-y-auto p-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {notes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center gap-2 py-12 text-center"
            >
              <StickyNote className="size-6 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                {hasActiveFilters ? "No notes match your filters" : "No notes yet"}
              </p>
            </motion.div>
          ) : (
            notes.map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                selected={note.id === selectedId}
                onSelect={() => onSelect(note.id)}
                onDelete={() => onDelete(note.id)}
                onTogglePin={() => onTogglePin(note.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run test/components/notes/note-list.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/components/notes/note-list.tsx test/components/notes/note-list.test.tsx
rtk git commit -m "feat: add search, sort, date filter, and pin toggle to NoteList"
```

---

## Task 6: Wire `NotesPage`

**Files:**
- Modify: `src/app/(workspace)/notes/page.tsx`

**Interfaces:**
- Consumes: `useNotesFilter` from Task 3; all new `NoteList` props from Task 5

- [ ] **Step 1: Replace `src/app/(workspace)/notes/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useNotes } from "@/hooks/use-notes";
import { useNotesFilter } from "@/hooks/use-notes-filter";
import { NoteList } from "@/components/notes/note-list";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteEmptyState } from "@/components/notes/note-empty-state";

export default function NotesPage() {
  const { notes, createNote, updateNote, removeNote, togglePin } = useNotes();
  const {
    filteredNotes,
    searchQuery, setSearchQuery,
    sortOrder, setSortOrder,
    dateFilter, setDateFilter,
    showPinnedOnly, setShowPinnedOnly,
    hasActiveFilters, clearFilters,
  } = useNotesFilter(notes);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  async function handleNew() {
    const note = await createNote();
    setSelectedId(note.id);
  }

  async function handleDelete(id: string) {
    await removeNote(id);
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="flex h-full">
      <div
        className={cn(
          "flex flex-col border-r border-border h-full shrink-0",
          selectedNote ? "hidden md:flex md:w-64" : "flex w-full md:w-64"
        )}
      >
        <NoteList
          notes={filteredNotes}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNew={handleNew}
          onDelete={handleDelete}
          onTogglePin={togglePin}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          showPinnedOnly={showPinnedOnly}
          onShowPinnedOnlyChange={setShowPinnedOnly}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />
      </div>

      <div
        className={cn(
          "flex-1 overflow-hidden",
          !selectedNote ? "hidden md:block" : "block"
        )}
      >
        <AnimatePresence mode="wait">
          {selectedNote ? (
            <NoteEditor
              key={selectedNote.id}
              note={selectedNote}
              onUpdate={updateNote}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <NoteEmptyState key="empty" onNew={handleNew} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 3: Verify the production build**

```bash
rtk next build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
rtk git add src/app/(workspace)/notes/page.tsx
rtk git commit -m "feat: wire useNotesFilter into NotesPage — search, sort, date, pin complete"
```

---

## Spec Coverage Check

| Spec section | Covered by |
|---|---|
| `pinned?: boolean` on Note | Task 1 |
| `SortOrder`, `DateFilter` types | Task 1 |
| `extractPlainText` | Task 1 |
| `togglePin` in `useNotes` | Task 2 |
| `useNotesFilter` hook with all state | Task 3 |
| Debounce 150ms on search | Task 3 |
| `hasActiveFilters` + `clearFilters` | Task 3 |
| Pinned notes float to top | Task 3 |
| `NoteListItem` preview fix | Task 4 |
| Pin icon in `NoteListItem` | Task 4 |
| Search input + Escape to clear | Task 5 |
| Sort dropdown | Task 5 |
| Date dropdown | Task 5 |
| Pin toggle button | Task 5 |
| Clear filters button | Task 5 |
| "No notes match your filters" empty state | Task 5 |
| `NotesPage` wiring | Task 6 |
