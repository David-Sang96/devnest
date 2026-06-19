# Kanban Card Detail & Enhancement — Design Spec

## Summary

Extend the Kanban board with a card detail side panel, custom labels, due dates, priority, column color theming, card count badges, and an archive drawer.

## Design Decisions

| Question | Choice |
|---|---|
| Card detail opens as | Side panel (slides in from right) |
| Panel layout | Description first, compact metadata below |
| Labels | Custom per board (name + color) |
| Archive location | Collapsible drawer below columns |
| Column color | Colored header bar |

---

## 1. Data Model

### Schema version: 1 → 2

**`KanbanCard`** — new optional fields:
- `priority?: 'low' | 'medium' | 'high' | 'urgent'`
- `dueDate?: number` (ms timestamp)
- `labelIds?: string[]`
- `archived?: boolean` (default false)

**`KanbanColumn`** — new optional field:
- `color?: string` (hex color string, e.g. `#1d4ed8`)

**New store: `kanban_labels`**
```ts
interface KanbanLabel {
  id: string;
  boardId: string;
  name: string;
  color: string;      // hex
  createdAt: number;
}
```

**Migration:** `db.ts` bumps to version 2; `upgrade()` creates the `kanban_labels` object store with `id` as keyPath and a `boardId` index.

**Backup:** `backup.ts` adds `kanban_labels` as a flat array alongside the existing four stores.

---

## 2. Hook Changes

### `useKanban` — additions to existing hook
- `updateColumn(id, patch)` already exists — no change needed for color
- `updateCard(id, patch)` already exists but currently only accepts `title | description` — widen the Pick to include `priority`, `dueDate`, `labelIds`, `archived`
- `archiveCard(id)` — convenience wrapper: `updateCard(id, { archived: true })`
- `restoreCard(id)` — convenience wrapper: `updateCard(id, { archived: false })`

### New hook: `useKanbanLabels(boardId)`
- State: `labels: KanbanLabel[]`
- `createLabel(name, color)` — writes to IDB + state
- `updateLabel(id, patch)` — updates name/color
- `removeLabel(id)` — deletes from IDB + state, removes from all cards on board

---

## 3. Components

### `CardDetailPanel`
`src/components/kanban/card-detail-panel.tsx`

Slide-over from the right. Rendered inside `KanbanBoard`, shown when `selectedCardId` is set.

Layout (top → bottom):
1. Header bar: card title (inline editable) + close ×
2. Description section: Tiptap editor (same config as Notes, no title toolbar button)
3. Metadata section (below description, compact rows):
   - Priority: chip picker (None / Low / Medium / High / Urgent) with color dots
   - Due date: native `<input type="date">` styled to match the UI
   - Labels: assigned chips + "+ Add label" that opens `LabelPicker`
4. Footer: "Archive" button (left) + "Delete" button (right, red)

Animation: `motion/react` `x: "100%"` → `x: 0` on mount, reverse on close.

Panel width: `w-80` (320px). Board scrolls independently on the left.

### `LabelPicker`
`src/components/kanban/label-picker.tsx`

Popover (Base UI) listing board labels with checkboxes. Bottom: "Create label" form — name input + color swatch row (8 preset colors). Inline in panel, not a separate page.

Preset colors: `#ef4444 #f97316 #eab308 #22c55e #3b82f6 #8b5cf6 #ec4899 #64748b`

### `KanbanColumn` — modifications
`src/components/kanban/kanban-column.tsx`

Header changes:
- Background color = `column.color ?? default` (default = current `#1e293b` equivalent)
- Text/badge colors adapt: if color is set, use white text + semi-transparent badge; otherwise keep current style
- Card count badge: count of non-archived cards in this column
- Color picker trigger: pencil/palette icon in header → opens `ColumnColorPicker` popover
- Column name remains editable (existing behavior)

### `ColumnColorPicker`
`src/components/kanban/column-color-picker.tsx`

Small popover with 9 color swatches + a "None" (clear) option. Click a swatch → calls `updateColumn(id, { color })`. Same 8 preset label colors + `#0f172a` (near-black).

### `KanbanCard` — modifications
`src/components/kanban/kanban-card.tsx`

Card face now shows (below title):
- Priority dot (colored circle, only if priority set)
- Due date (small text, red if overdue, only if set)
- Label chips (colored pills, up to 3 then "+N more")

Click card → sets `selectedCardId` to open panel (previously no click handler).

Archived cards: not rendered in column card lists (filtered out upstream).

### `ArchiveDrawer`
`src/components/kanban/archive-drawer.tsx`

Rendered below the columns row in `KanbanBoard`. Collapsed by default.

Header: `🗃 Archived (n)` — click to expand/collapse.

Expanded: flat list of archived cards (all columns mixed). Each row:
- Card title (strikethrough)
- "Was in: [column name]"
- Restore button → `restoreCard(id)`
- Delete button → `removeCard(id)` (permanent)

Hidden when archive count is 0.

---

## 4. Board Layout

```
KanbanBoard
├── Board header (title, + Add Column, board actions)
├── Columns row (horizontal scroll)
│   ├── KanbanColumn (colored header, card count, cards)
│   └── ...
├── ArchiveDrawer (below columns, collapsed by default)
└── CardDetailPanel (fixed right panel, shown when card selected)
```

`selectedCardId` state lives in `KanbanBoard`. Panel and board are siblings; board gets `padding-right` when panel is open so columns don't hide behind it.

---

## 5. Testing

- `useKanbanLabels`: createLabel, updateLabel, removeLabel (IDB mocked same pattern as `useNotes`)
- `CardDetailPanel`: renders title, description, metadata fields; close button hides panel
- `ArchiveDrawer`: hidden when empty; restore calls restoreCard; shows correct count
- `KanbanCard` face: renders priority dot, due date, label chips when set
- DB migration: version 2 upgrade creates `kanban_labels` store

---

## 6. Files Touched

| File | Change |
|---|---|
| `src/types/kanban.ts` | Add new fields to `KanbanCard`, `KanbanColumn`; add `KanbanLabel` |
| `src/lib/db.ts` | Bump to v2, add `kanban_labels` store in `upgrade()` |
| `src/lib/backup.ts` | Include `kanban_labels` in export/import |
| `src/hooks/use-kanban.ts` | Widen `updateCard` patch type; add `archiveCard`, `restoreCard` |
| `src/hooks/use-kanban-labels.ts` | New hook |
| `src/components/kanban/kanban-card.tsx` | Add face metadata, click handler |
| `src/components/kanban/kanban-column.tsx` | Colored header, card count, color picker trigger |
| `src/components/kanban/card-detail-panel.tsx` | New |
| `src/components/kanban/label-picker.tsx` | New |
| `src/components/kanban/column-color-picker.tsx` | New |
| `src/components/kanban/archive-drawer.tsx` | New |
| `src/app/(workspace)/kanban/page.tsx` | Wire `selectedCardId` state, pass to board |
| `src/lib/backup.ts` | Add kanban_labels |
