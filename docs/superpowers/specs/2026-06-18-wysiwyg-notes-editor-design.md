# WYSIWYG Notes Editor — Design Spec
Date: 2026-06-18

## Summary
Replace the plain `<textarea>` in `NoteEditor` with a Tiptap-powered WYSIWYG rich text editor. Title input remains a separate `<input>`. Toolbar splits into a fixed top bar (block-level controls) and a floating bubble menu (inline controls).

## Packages
```
@tiptap/react
@tiptap/pm
@tiptap/starter-kit
@tiptap/extension-link
@tiptap/extension-underline
```

## Components

### `NoteToolbar` (`src/components/notes/note-toolbar.tsx`)
Fixed bar below the note header. Controls:
- Heading level: H1, H2, H3, Paragraph (dropdown or button group)
- Bold, Italic, Underline, Strikethrough
- Bullet list, Ordered list
- Blockquote
- Code block
- Horizontal rule
- Active state: button highlights when cursor is inside that format

### `NoteBubbleMenu` (`src/components/notes/note-bubble-menu.tsx`)
Floats above selected text using Tiptap's `<BubbleMenu>`. Controls:
- Bold, Italic, Underline, Strikethrough, Code (inline)
- Link — opens small inline popover to enter URL
- Active state matches fixed toolbar

### `NoteEditor` (`src/components/notes/note-editor.tsx`)
- `useEditor` hook (StarterKit + Link + Underline extensions)
- Title `<input>` unchanged (first line of legacy plain-text content)
- `EditorContent` replaces `<textarea>`
- On change: debounced 500ms → `onUpdate(id, { content: JSON.stringify(editor.getJSON()) })`
- On mount: `editor.commands.setContent(parsedContent)` where `parsedContent` is the result of `loadContent(note.content)`

## Data / Migration

### Storage
`content` field in IndexedDB stays `string`. Now stores Tiptap JSON:
```json
{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello"}]}]}
```

### Migration (zero-downtime, lazy)
`loadContent(raw: string)` helper:
- If `raw` starts with `{"type":"doc"` → already JSON, parse and return
- Otherwise → plain text. Split on `\n`, wrap each non-empty line as `{"type":"paragraph","content":[{"type":"text","text":"..."}]}`, empty lines become `{"type":"paragraph"}` (blank paragraph). Return constructed doc object.
- First save after migration rewrites the field as JSON silently.

### Title field
- Stays derived from `note.title` (set by `updateNote` hook from first line of content)
- For JSON content, `updateNote` must extract title differently: parse JSON → walk doc → find first text node → use as title
- `updateNote` in `use-notes.ts` updated to handle both formats

## Styling
Tiptap renders into `.ProseMirror` div. Add styles to `src/app/globals.css`:
- `h1`, `h2`, `h3` — font sizes matching design system
- `ul`, `ol` — list styles with padding
- `blockquote` — left border, muted text
- `code` — inline code background
- `pre` — code block background, monospace
- `p` — proper line-height and spacing
- `.ProseMirror-focused` — no extra outline (handled by container)
- Dark mode variants via `.dark .ProseMirror`

## Hook update: `use-notes.ts`
`updateNote` currently extracts title via `content.split("\n")[0]`. Update to:
```ts
function extractTitle(content: string): string {
  if (content.startsWith('{"type":"doc"')) {
    const doc = JSON.parse(content);
    // Walk first content node for text
    const first = doc.content?.[0];
    const text = first?.content?.map((n: {text?: string}) => n.text ?? "").join("") ?? "";
    return text.trim() || "Untitled";
  }
  return content.split("\n")[0].trim() || "Untitled";
}
```

## Testing
- Unit tests for `loadContent` migration helper (plain text → JSON, JSON passthrough, empty string, multiline)
- Unit tests for `extractTitle` (JSON format, plain text format, empty)
- NoteEditor tests updated: mock `useEditor` from `@tiptap/react`, verify debounce and `onUpdate` call shape
- NoteToolbar and NoteBubbleMenu: render tests verifying buttons present and active states

## Out of Scope
- Image upload
- Real-time collaboration
- Export to Markdown/PDF
- Tables
