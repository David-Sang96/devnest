# Phase 2B — Command Palette Design

**Date:** 2026-06-28  
**Scope:** Global Ctrl+K command palette — search notes + kanban cards, navigate tools, run actions  
**Constraint:** Local-first, IndexedDB only, no backend, no auth

---

## Overview

A floating modal opened by `Ctrl+K` (or `Cmd+K` on Mac) from anywhere in the workspace. Lets users search notes and kanban cards, navigate between tools, create a new note, and toggle the theme — without touching the mouse.

---

## Architecture

Single `"use client"` component `src/components/command-palette/command-palette.tsx` mounted once inside `WorkspaceShell`. It self-registers the global `Ctrl+K` / `Cmd+K` `keydown` listener and manages all palette state internally. No context, no prop drilling, no store.

**Why a single component:** The palette is self-contained — it opens, fetches, filters, and renders its own results. Splitting it into hook + component adds complexity with no benefit at this scale.

**Mount point:** `src/components/layout/workspace-shell.tsx` renders `<CommandPalette />` alongside `<Sidebar />`, `<MobileNav />`, and `<PageTransition>`. WorkspaceShell stays a server component; importing a client component from a server component is valid in Next.js App Router.

**Ctrl+K conflict:** `src/app/(workspace)/notes/page.tsx` currently binds `Ctrl+K` to focus the notes search input. Remove this binding — the palette replaces it.

---

## Data Fetching

Palette fetches from IDB **once when it opens**, using `getDB()` directly (same pattern as hooks):

```ts
const db = await getDB();
const [allNotes, allCards] = await Promise.all([
  db.getAll("notes"),
  db.getAll("kanban_cards"),
]);
```

Filter before storing in state:
- Notes: exclude `deletedAt != null`
- Cards: exclude `archived === true`

Store the filtered arrays in `useState`. Clear them when palette closes (so stale data isn't shown on next open).

---

## Result Types

```ts
type NoteResult  = { type: "note";    id: string; title: string; preview: string }
type CardResult  = { type: "card";    id: string; title: string; preview: string }
type CommandItem = { type: "command"; id: string; label: string; icon: LucideIcon; action: () => void }
type PaletteItem = NoteResult | CardResult | CommandItem
```

`preview` for notes: first 80 chars of `extractPlainText(note.content)` from `src/lib/note-content.ts`.  
`preview` for cards: first 80 chars of `card.description`, or empty string.

---

## Static Commands

Always available in the `commands` group, filtered by query when query is non-empty.

| `id` | `label` | Action |
|---|---|---|
| `go-notes` | Go to Notes | `router.push("/notes")` |
| `go-kanban` | Go to Kanban | `router.push("/kanban")` |
| `go-json` | Go to JSON Formatter | `router.push("/json")` |
| `go-password` | Go to Password Generator | `router.push("/password")` |
| `go-settings` | Go to Settings | `router.push("/settings")` |
| `new-note` | New Note | `router.push("/notes?new=1")` |
| `toggle-theme` | Toggle Theme | `setTheme(theme === "dark" ? "light" : "dark")` |

Theme toggle uses `useTheme()` from `next-themes` (same as `ThemeToggle` component).

---

## Search Behaviour

**Empty query:** Show all commands, no notes or cards.

**Non-empty query:** Case-insensitive substring match across:
- Note `title` and `extractPlainText(note.content)`
- Card `title` and `card.description`
- Command `label`

Results grouped in order: **Notes** (max 5) → **Kanban Cards** (max 5) → **Commands** (all matching).

A group is omitted entirely if it has zero results.

---

## UI Layout

Built on the existing `Dialog` / `DialogPrimitive.Popup` component (`src/components/ui/dialog.tsx`, backed by `@base-ui/react`).

```
┌─────────────────────────────────────────────────┐
│  🔍  Search notes, cards, and commands...        │  ← auto-focused input
├─────────────────────────────────────────────────┤
│  Notes                                          │  ← group header (hidden if no results)
│  ▶ Meeting Notes                preview text    │  ← result row
│  ▶ Daily Journal                preview text    │
├─────────────────────────────────────────────────┤
│  Kanban Cards                                   │
│  ▶ Build login page             preview text    │
├─────────────────────────────────────────────────┤
│  Commands                                       │
│  ▶ Go to Settings                               │
│  ▶ Toggle Theme                                 │
└─────────────────────────────────────────────────┘
```

- Width: `max-w-[560px]`, positioned at approximately top 20% of viewport (not centered vertically)
- `showCloseButton={false}` — palette has no X button (Esc closes it)
- Max height `max-h-[400px]` with `overflow-y-auto` on the results area
- Highlighted item has distinct background (`bg-accent`)
- Empty query: results area hidden; input + "Type to search…" hint only
- No results state: "No results for '{query}'" centered message

---

## Keyboard Navigation

| Key | Action |
|---|---|
| `Ctrl+K` / `Cmd+K` | Open palette (or close if already open) |
| `↑` / `↓` | Move highlight through all visible items (wraps) |
| `Enter` | Execute highlighted item |
| `Esc` | Close palette |
| Click outside | Close palette (Dialog handles this) |

Highlight index resets to `0` on every query change.

---

## "New Note" URL Param

When user selects the "New Note" command, `router.push("/notes?new=1")` navigates to Notes. The Notes page reads this param on mount and creates a note automatically.

**Notes page change** (`src/app/(workspace)/notes/page.tsx`):

```ts
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("new") === "1") {
    handleNew();
    router.replace("/notes");   // strip the param
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);  // runs once on mount; handleNew is stable
```

Uses `window.location.search` (client-only, safe inside `useEffect`) to avoid the Suspense boundary requirement of `useSearchParams()`. `router.replace` strips `?new=1` from the URL without adding a history entry. `handleNew` calls `createNote()`, clears filters, selects the new note — same as clicking the `+` button.

---

## Files Changed

| Action | Path |
|---|---|
| **Create** | `src/components/command-palette/command-palette.tsx` |
| **Modify** | `src/components/layout/workspace-shell.tsx` — add `<CommandPalette />` |
| **Modify** | `src/app/(workspace)/notes/page.tsx` — handle `?new=1`, remove Ctrl+K binding |
| **Create** | `test/components/command-palette/command-palette.test.tsx` |

No new IDB stores. No DB schema change.

---

## Testing

File: `test/components/command-palette/command-palette.test.tsx`

Mock `src/lib/db.ts` (same `vi.mock` pattern as other tests). Seed mock with 3 notes and 2 cards.

Tests:
1. Closed by default; opens on `Ctrl+K` keydown
2. Closes on `Esc`; closes on `Ctrl+K` when already open
3. Empty query shows commands, hides notes/cards groups
4. Query matching note title shows note in results
5. Query matching card title shows card in results
6. Query matching command label shows command; non-matching query hides it
7. `↑`/`↓` moves highlight; wraps at boundaries
8. `Enter` on highlighted command calls its action
9. Clicking outside closes palette (simulate `open=false` via Dialog)
10. Notes page: `?new=1` param triggers `createNote` on mount and replaces URL

---

## Out of Scope

- Fuzzy matching (substring is sufficient)
- Result keyboard shortcuts (e.g. Alt+1 to pick first result)
- Palette history / recent items
- Tags, Dashboard (Phase 2B follow-on)
