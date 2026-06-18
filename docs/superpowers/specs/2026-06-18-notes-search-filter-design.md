# Notes Search & Filter — Design Spec

**Date:** 2026-06-18
**Status:** Approved

## Overview

Add search, sort, date range filtering, and pin/favourite to the Notes feature. All filtering runs client-side in a dedicated hook. No IndexedDB schema changes required.

---

## 1. Data Model

### `Note` type (`src/types/notes.ts`)

Add one optional field:

```ts
pinned?: boolean;  // undefined treated as false
```

No IDB version bump needed — IDB is schemaless for record properties. Only new indexes or object stores require a version bump.

---

## 2. `note-content.ts` additions

New export: `extractPlainText(raw: string): string`

- If `raw` starts with `{"type":"doc"` (Tiptap JSON): walk the node tree recursively, concatenate all `text` leaf values separated by spaces.
- Otherwise (legacy plain text): return `raw.split("\n").slice(1).join(" ").trim()`.
- Used for: search matching against note body, and fixing the `NoteListItem` preview which currently breaks on JSON content.

---

## 3. `useNotes` hook changes (`src/hooks/use-notes.ts`)

Add one new operation:

```ts
async function togglePin(id: string): Promise<void>
```

- Reads existing note from IDB.
- Flips `pinned` flag (`!existing.pinned`).
- Writes back via `db.put`.
- Updates React state optimistically.

No other changes to `useNotes`.

---

## 4. `useNotesFilter` hook (new file: `src/hooks/use-notes-filter.ts`)

Pure hook — no side effects, no IDB access.

**Signature:**

```ts
function useNotesFilter(notes: Note[]): {
  filteredNotes: Note[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortOrder: 'updatedAt' | 'createdAt' | 'title';
  setSortOrder: (s: 'updatedAt' | 'createdAt' | 'title') => void;
  dateFilter: 'all' | 'today' | 'week' | 'month';
  setDateFilter: (d: 'all' | 'today' | 'week' | 'month') => void;
  showPinnedOnly: boolean;
  setShowPinnedOnly: (v: boolean) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
}
```

**Processing pipeline** (applied in order):

1. **Pin float:** pinned notes always appear before unpinned notes within any result set.
2. **Date filter:** filter on `note.updatedAt` —
   - `today`: same calendar day as now
   - `week`: within the last 7 days
   - `month`: within the last 30 days
   - `all`: no filter
3. **Search filter:** case-insensitive substring match against `note.title` and `extractPlainText(note.content)`. Applied only when `searchQuery.trim()` is non-empty.
4. **Sort order:**
   - `updatedAt`: descending by `updatedAt` (default — preserves current behaviour)
   - `createdAt`: descending by `createdAt`
   - `title`: ascending A–Z

Search is debounced 150ms inside the hook using a local debounced value derived from `searchQuery`.

`hasActiveFilters` is `true` when any filter deviates from its default (`searchQuery !== ""`, `sortOrder !== 'updatedAt'`, `dateFilter !== 'all'`, `showPinnedOnly === true`).

`clearFilters()` resets all state to defaults.

---

## 5. `NoteList` component (`src/components/notes/note-list.tsx`)

New props added:

```ts
searchQuery: string;
onSearchChange: (q: string) => void;
sortOrder: 'updatedAt' | 'createdAt' | 'title';
onSortChange: (s: 'updatedAt' | 'createdAt' | 'title') => void;
dateFilter: 'all' | 'today' | 'week' | 'month';
onDateFilterChange: (d: 'all' | 'today' | 'week' | 'month') => void;
showPinnedOnly: boolean;
onShowPinnedOnlyChange: (v: boolean) => void;
hasActiveFilters: boolean;
onClearFilters: () => void;
```

**Header layout (top to bottom):**

1. Existing title bar: "Notes" label + "+" new-note button.
2. Search input row: full-width input with a `Search` icon prefix. Pressing `Escape` clears the query.
3. Filter bar: three compact controls in a single row —
   - Sort dropdown (`ArrowUpDown` icon + label): last modified / created date / A–Z
   - Date dropdown (`Calendar` icon + label): all time / today / this week / this month
   - Pin toggle button (`Pin` icon): highlights when `showPinnedOnly` is true
4. Active filter indicator: when `hasActiveFilters`, show a small "Clear" button or badge beneath the filter bar.

The search input and filter bar are always visible (not collapsed behind a toggle).

**Empty state when filters are active:** show "No notes match your filters" with a "Clear filters" link, distinct from the "No notes yet" empty state.

---

## 6. `NoteListItem` component (`src/components/notes/note-list-item.tsx`)

- **Preview fix:** replace `note.content.split("\n").slice(1).join(" ").trim()` with `extractPlainText(note.content)` — fixes broken preview for Tiptap JSON content.
- **Pin icon:** `Pin` icon from lucide-react, placed to the left of the delete button.
  - Always visible (full opacity) when `note.pinned`.
  - Visible on hover (group-hover) at reduced opacity when not pinned.
  - Clicking calls `onTogglePin()` and stops propagation.
- New prop: `onTogglePin: () => void`.

---

## 7. `NotesPage` wiring (`src/app/(workspace)/notes/page.tsx`)

```ts
const { notes, createNote, updateNote, removeNote, togglePin } = useNotes();
const {
  filteredNotes, searchQuery, setSearchQuery,
  sortOrder, setSortOrder, dateFilter, setDateFilter,
  showPinnedOnly, setShowPinnedOnly, hasActiveFilters, clearFilters
} = useNotesFilter(notes);
```

Pass `filteredNotes` (not `notes`) to `NoteList`. Pass all filter state and setters as props. Pass `togglePin` down to `NoteListItem` via `NoteList`.

---

## 8. Testing

- `useNotesFilter`: unit tests covering each filter type independently and in combination, sort orders, `hasActiveFilters`, `clearFilters`, debounce behaviour.
- `NoteList`: test search input renders and calls `onSearchChange`; filter controls render and trigger callbacks; active filter indicator appears/disappears; correct empty state shown when filters active.
- `NoteListItem`: test pin icon visibility (pinned vs unpinned), `onTogglePin` called on click, propagation stopped.
- `note-content.ts`: unit tests for `extractPlainText` with JSON content and legacy plain text.

---

## 9. Files changed

| File | Change |
|------|--------|
| `src/types/notes.ts` | Add `pinned?: boolean` |
| `src/lib/note-content.ts` | Add `extractPlainText()` |
| `src/hooks/use-notes.ts` | Add `togglePin()` |
| `src/hooks/use-notes-filter.ts` | **New file** |
| `src/components/notes/note-list.tsx` | Add search + filter UI |
| `src/components/notes/note-list-item.tsx` | Fix preview, add pin icon |
| `src/app/(workspace)/notes/page.tsx` | Wire `useNotesFilter`, pass new props |
| `src/components/notes/note-empty-state.tsx` | No change |
| Tests for all above | New / updated test files |
