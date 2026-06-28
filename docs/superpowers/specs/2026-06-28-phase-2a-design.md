# Phase 2A Design — DevNest Polish

**Date:** 2026-06-28  
**Scope:** Three features: collapsible sidebar, note trash, note templates  
**Constraint:** Local-first, IndexedDB only, no backend, no auth

---

## Feature 1 — Collapsible Sidebar (Icon-Only Mode)

### Goal
Allow the sidebar to collapse to icon-only mode to give more horizontal space to the content area.

### Behaviour
- Two states: **expanded** (current resizable behaviour) and **collapsed** (52px wide, icons only)
- Collapsed state: nav labels hidden, resize handle hidden, tooltip on hover for each icon
- Toggle button: `ChevronLeft` / `ChevronRight` icon placed at bottom of sidebar next to `ThemeToggle`
- State persisted to `localStorage("devnest-sidebar-collapsed")`
- Width transition: CSS `transition-[width]` (not motion) for smoothness
- Mobile nav is unchanged — this feature is desktop-only

### Files changed
- `src/components/layout/sidebar.tsx` — add `collapsed` state, toggle button, conditional label rendering, tooltip wrapper, hide resize handle when collapsed
- No changes to `WorkspaceShell` — sidebar already uses `style={{ width }}` so layout adjusts automatically

### Constants
```
COLLAPSED_WIDTH = 52   // px
MIN_WIDTH       = 160  // unchanged
MAX_WIDTH       = 320  // unchanged
DEFAULT_WIDTH   = 224  // unchanged
```

### Accessibility
- Toggle button has `aria-label="Collapse sidebar"` / `"Expand sidebar"`
- Nav item tooltips use the existing `tooltip` shadcn component
- Collapsed sidebar still keyboard-navigable

---

## Feature 2 — Note Trash with Restore

### Goal
Replace the fragile 5-second undo toast with a durable trash bin. Deleted notes persist in IDB until the user empties trash or 30 days pass.

### Data change
Add `deletedAt?: number` to the `Note` type in `src/types/notes.ts`. No IDB schema version bump required — IDB stores are schema-less per record.

### Hook changes (`src/hooks/use-notes.ts`)
| Function | Current behaviour | New behaviour |
|---|---|---|
| `removeNote(id)` | `db.delete` → undo toast | `db.put({...note, deletedAt: now})` — no toast |
| `restoreFromTrash(id)` | _new_ | clears `deletedAt`, moves to active list |
| `permanentlyDelete(id)` | _new_ | `db.delete` |
| `emptyTrash()` | _new_ | permanently deletes all notes where `deletedAt` is set |
| load effect | returns all notes | auto-purges `deletedAt < now - 30d`, then loads; splits into `notes` (active) and `trashedNotes` |

Remove the 5-second undo toast from `NotesPage` — trash makes it redundant.

### UI (`src/components/notes/note-list.tsx` and `NotesPage`)
- Trash toggle: a button at the bottom of the note list panel, shows count badge when trash has items
- Clicking switches the list to trash view (replaces filtered notes list)
- In trash view, each list item shows **Restore** and **Delete forever** icon buttons
- "Empty Trash" button at top of trash view (only visible in trash mode)
- Trashed notes are excluded from search, sort, and date filters
- `NoteEmptyState` updated to show a "Trash is empty" variant when in trash mode

### Backup
`deletedAt` serialises naturally with existing note records — no backup format version change needed.

---

## Feature 3 — Note Templates

### Goal
Let users create notes pre-populated with structured content for common use cases.

### Templates (hardcoded, 4 total)
| Template | Title | Content structure |
|---|---|---|
| Meeting Notes | "Meeting Notes" | H2 sections: Date, Attendees, Agenda, Discussion, Action Items |
| Daily Journal | "Journal — [date]" | H2 sections: How I'm feeling, Today, Gratitude |
| Todo List | "Todo List" | H2 "Tasks", then 3 empty checkbox list items |
| Project Brief | "Project Brief" | H2 sections: Overview, Goals, Timeline, Notes |

Content is defined as Tiptap JSON in `src/lib/note-templates.ts`. Each template exports `{ id, label, title, content: TiptapJSON }`.

### Hook change (`use-notes.ts`)
`createNote()` gains an optional parameter:
```ts
createNote(initial?: { title: string; content: string }): Promise<Note>
```
When `initial` is provided the note is created with that title and content. Blank note behaviour unchanged.

### UI
The "New note" button in `src/components/notes/note-list.tsx` becomes a **split button**:
- **Left segment** — creates blank note (existing behaviour, same click target)
- **Right segment** — a `ChevronDown` chevron that opens a small dropdown listing the 4 templates
- Picking a template calls `createNote({ title, content: JSON.stringify(templateJSON) })`
- Dropdown closes after selection
- No modal, no overlay — just a small popover list

### Files changed
- `src/lib/note-templates.ts` — new file, pure data (no IDB, no hooks)
- `src/hooks/use-notes.ts` — optional `initial` param on `createNote`
- `src/components/notes/note-list.tsx` — split button UI

---

## Testing
- **Sidebar:** unit test that `collapsed` state toggles and persists; snapshot test for icon-only render
- **Trash:** unit tests for `removeNote` soft-delete, `restoreFromTrash`, `permanentlyDelete`, `emptyTrash`, auto-purge on load
- **Templates:** unit test `createNote` with `initial` param; test each template produces a non-empty `content` string

## Out of scope (deferred to Phase 2B)
- Tags for notes
- Command Palette / Global Search
- Dashboard
