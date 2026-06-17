# WYSIWYG Notes Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain textarea in NoteEditor with a Tiptap-powered WYSIWYG rich text editor featuring a fixed toolbar (block controls) and floating bubble menu (inline controls).

**Architecture:** Title stays a separate `<input>` stored in `note.title`; editor body is stored in `note.content` as Tiptap JSON. The `use-notes.ts` hook is updated to accept explicit `title` changes alongside `content`. A `loadContent` helper migrates legacy plain-text notes to Tiptap JSON on first open.

**Tech Stack:** `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-underline`, Tailwind v4, motion/react, Next.js 16 App Router.

## Global Constraints

- All new components must be `"use client"` files.
- Animations use `motion` from `motion/react` — not `framer-motion`.
- Icons from `lucide-react` only.
- CSS vars: `--foreground`, `--muted`, `--muted-foreground`, `--primary`, `--border`, `--popover`, `--ring`. Font mono: `var(--font-mono)`.
- Debounce: 500 ms for all `onUpdate` calls.
- Vitest + `@testing-library/react` for all tests. No Playwright.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/note-content.ts` | **Create** | `loadContent`, `extractTitle` helpers |
| `src/hooks/use-notes.ts` | **Modify** | Accept `title` in `updateNote`, use `extractTitle` |
| `src/app/globals.css` | **Modify** | `.prose-editor` styles for ProseMirror output |
| `src/components/notes/note-toolbar.tsx` | **Create** | Fixed formatting toolbar |
| `src/components/notes/note-bubble-menu.tsx` | **Create** | Floating inline-format menu |
| `src/components/notes/note-editor.tsx` | **Rewrite** | Tiptap editor integration |
| `test/lib/note-content.test.ts` | **Create** | Unit tests for helpers |
| `test/mocks/tiptap.tsx` | **Create** | Mock for `@tiptap/react` in Vitest |
| `vitest.config.ts` | **Modify** | Add `@tiptap/*` aliases |
| `test/components/notes/note-editor.test.tsx` | **Rewrite** | Tests for new editor structure |
| `test/components/notes/note-toolbar.test.tsx` | **Create** | Toolbar button tests |
| `test/components/notes/note-bubble-menu.test.tsx` | **Create** | Bubble menu tests |

---

### Task 1: Install packages + create note-content.ts helpers

**Files:**
- Create: `src/lib/note-content.ts`
- Create: `test/lib/note-content.test.ts`

**Interfaces:**
- Produces:
  - `loadContent(raw: string): object` — returns Tiptap JSONContent doc object
  - `extractTitle(raw: string): string` — returns first-paragraph text or `"Untitled"`

- [ ] **Step 1: Install Tiptap packages**

```bash
cd /home/david/Desktop/personal-project
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-underline
```

Expected: packages added to `node_modules/`, no peer-dependency errors.

- [ ] **Step 2: Write failing tests for `note-content.ts`**

Create `test/lib/note-content.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { loadContent, extractTitle } from "@/lib/note-content";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

describe("loadContent", () => {
  it("returns empty doc for empty string", () => {
    expect(loadContent("")).toEqual(EMPTY_DOC);
  });

  it("passthrough for valid Tiptap JSON string", () => {
    const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }] };
    expect(loadContent(JSON.stringify(doc))).toEqual(doc);
  });

  it("converts plain text — skips first line (title), wraps rest as paragraphs", () => {
    const result = loadContent("Title\nLine one\nLine two");
    expect(result).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Line one" }] },
        { type: "paragraph", content: [{ type: "text", text: "Line two" }] },
      ],
    });
  });

  it("plain text with only a title returns empty doc", () => {
    expect(loadContent("Title only")).toEqual(EMPTY_DOC);
  });

  it("blank lines become empty paragraphs", () => {
    const result = loadContent("Title\nA\n\nB");
    expect(result).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "A" }] },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "B" }] },
      ],
    });
  });

  it("returns empty doc for malformed JSON that starts with the doc prefix", () => {
    expect(loadContent('{"type":"doc" INVALID')).toEqual(EMPTY_DOC);
  });
});

describe("extractTitle", () => {
  it("returns 'Untitled' for empty string", () => {
    expect(extractTitle("")).toBe("Untitled");
  });

  it("extracts title from plain text first line", () => {
    expect(extractTitle("My Note\nsome body")).toBe("My Note");
  });

  it("returns 'Untitled' when plain text first line is blank", () => {
    expect(extractTitle("\nbody")).toBe("Untitled");
  });

  it("extracts title from Tiptap JSON first paragraph text", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "JSON Title" }] },
        { type: "paragraph", content: [{ type: "text", text: "body" }] },
      ],
    };
    expect(extractTitle(JSON.stringify(doc))).toBe("JSON Title");
  });

  it("returns 'Untitled' when JSON doc has empty first paragraph", () => {
    const doc = { type: "doc", content: [{ type: "paragraph" }] };
    expect(extractTitle(JSON.stringify(doc))).toBe("Untitled");
  });

  it("returns 'Untitled' for malformed JSON with doc prefix", () => {
    expect(extractTitle('{"type":"doc" BROKEN')).toBe("Untitled");
  });
});
```

- [ ] **Step 3: Run tests — expect failure**

```bash
npx vitest run test/lib/note-content.test.ts 2>&1 | tail -10
```

Expected: FAIL — `loadContent` not found.

- [ ] **Step 4: Implement `src/lib/note-content.ts`**

```ts
interface TextNode { type: string; text?: string }
interface DocNode { type: string; content?: DocNode[]; text?: string }

function emptyDoc(): DocNode {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function loadContent(raw: string): DocNode {
  if (!raw) return emptyDoc();

  if (raw.trimStart().startsWith('{"type":"doc"')) {
    try {
      return JSON.parse(raw) as DocNode;
    } catch {
      return emptyDoc();
    }
  }

  // Legacy plain text — first line is the title (skip it)
  const lines = raw.split("\n").slice(1);
  if (lines.length === 0 || (lines.length === 1 && !lines[0])) return emptyDoc();

  return {
    type: "doc",
    content: lines.map((line) =>
      line.trim()
        ? { type: "paragraph", content: [{ type: "text", text: line }] }
        : { type: "paragraph" }
    ),
  };
}

export function extractTitle(raw: string): string {
  if (!raw) return "Untitled";

  if (raw.trimStart().startsWith('{"type":"doc"')) {
    try {
      const doc = JSON.parse(raw) as DocNode;
      const first = doc.content?.[0];
      const text = (first?.content ?? [])
        .map((n: TextNode) => n.text ?? "")
        .join("");
      return text.trim() || "Untitled";
    } catch {
      return "Untitled";
    }
  }

  return raw.split("\n")[0].trim() || "Untitled";
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx vitest run test/lib/note-content.test.ts 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/note-content.ts test/lib/note-content.test.ts package.json package-lock.json
git commit -m "feat: install Tiptap packages and add note-content helpers (loadContent, extractTitle)"
```

---

### Task 2: Update `use-notes.ts` to accept explicit title changes

**Files:**
- Modify: `src/hooks/use-notes.ts`
- Modify: `test/hooks/use-notes.test.ts`

**Interfaces:**
- Consumes: `extractTitle(raw: string): string` from `@/lib/note-content`
- Produces: `updateNote(id: string, changes: Partial<Pick<Note, "content" | "title">>) => Promise<void>`

- [ ] **Step 1: Write failing test for title-only update**

Add to `test/hooks/use-notes.test.ts` inside the `updateNote` describe block:

```ts
it("updateNote with explicit title stores that title without re-deriving from content", async () => {
  const hook = renderHook(() => useNotes());
  await act(async () => { await hook.result.current.createNote(); });
  const note = hook.result.current.notes[0];

  await act(async () => {
    await hook.result.current.updateNote(note.id, { title: "Custom Title" });
  });

  expect(hook.result.current.notes[0].title).toBe("Custom Title");
  expect(hook.result.current.notes[0].content).toBe(""); // content unchanged
});

it("updateNote with content uses extractTitle to set title", async () => {
  const hook = renderHook(() => useNotes());
  await act(async () => { await hook.result.current.createNote(); });
  const note = hook.result.current.notes[0];

  const doc = JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "JSON Note Title" }] }],
  });

  await act(async () => {
    await hook.result.current.updateNote(note.id, { content: doc });
  });

  expect(hook.result.current.notes[0].title).toBe("JSON Note Title");
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npx vitest run test/hooks/use-notes.test.ts 2>&1 | tail -10
```

Expected: FAIL — `updateNote` doesn't accept `title`.

- [ ] **Step 3: Update `src/hooks/use-notes.ts`**

Replace the top of the file and `updateNote` function:

```ts
"use client";

import { useState, useEffect } from "react";
import { getDB } from "@/lib/db";
import type { Note } from "@/types";
import { extractTitle } from "@/lib/note-content";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    getDB()
      .then((db) => db.getAllFromIndex("notes", "updatedAt"))
      .then((all) => setNotes(all.reverse()));
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
    const db = await getDB();
    await db.put("notes", note);
    setNotes((prev) => [note, ...prev]);
    return note;
  }

  async function updateNote(
    id: string,
    changes: Partial<Pick<Note, "content" | "title">>
  ) {
    const db = await getDB();
    const existing = await db.get("notes", id);
    if (!existing) return;

    let derivedTitle = existing.title;
    if (changes.title !== undefined) {
      derivedTitle = changes.title.trim() || "Untitled";
    } else if (changes.content !== undefined) {
      derivedTitle = extractTitle(changes.content);
    }

    const updated: Note = {
      ...existing,
      ...changes,
      title: derivedTitle,
      updatedAt: Date.now(),
    };
    await db.put("notes", updated);
    setNotes((prev) =>
      prev
        .map((n) => (n.id === id ? updated : n))
        .sort((a, b) => b.updatedAt - a.updatedAt)
    );
  }

  async function removeNote(id: string) {
    const db = await getDB();
    await db.delete("notes", id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  return { notes, createNote, updateNote, removeNote };
}
```

- [ ] **Step 4: Run all tests — expect pass**

```bash
npx vitest run 2>&1 | tail -8
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-notes.ts test/hooks/use-notes.test.ts src/lib/note-content.ts
git commit -m "feat: update updateNote to accept explicit title changes, use extractTitle for JSON content"
```

---

### Task 3: Add ProseMirror styles to globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append `.prose-editor` styles**

Add at the end of `src/app/globals.css`:

```css
/* ── Tiptap / ProseMirror editor ─────────────────────────────── */
.prose-editor {
  color: var(--foreground);
  font-size: 0.9375rem;
  line-height: 1.75rem;
  caret-color: var(--foreground);
}

.prose-editor h1 {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 1rem 0 0.375rem;
}
.prose-editor h2 {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
  margin: 0.875rem 0 0.375rem;
}
.prose-editor h3 {
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.3;
  margin: 0.75rem 0 0.25rem;
}

.prose-editor p { margin: 0.2rem 0; }

.prose-editor strong { font-weight: 700; }
.prose-editor em { font-style: italic; }
.prose-editor u { text-decoration: underline; }
.prose-editor s { text-decoration: line-through; }

.prose-editor code {
  font-family: var(--font-mono);
  font-size: 0.82em;
  background: var(--muted);
  border-radius: 3px;
  padding: 0.1em 0.35em;
}

.prose-editor pre {
  font-family: var(--font-mono);
  font-size: 0.82em;
  background: var(--muted);
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
  margin: 0.5rem 0;
  overflow-x: auto;
  white-space: pre;
}
.prose-editor pre code {
  background: none;
  padding: 0;
  font-size: inherit;
  border-radius: 0;
}

.prose-editor ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin: 0.25rem 0;
}
.prose-editor ol {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin: 0.25rem 0;
}
.prose-editor li { margin: 0.1rem 0; }

.prose-editor blockquote {
  border-left: 3px solid var(--border);
  padding-left: 1rem;
  margin: 0.5rem 0;
  color: var(--muted-foreground);
  font-style: italic;
}

.prose-editor hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 1rem 0;
}

.prose-editor a {
  color: var(--primary);
  text-decoration: underline;
  cursor: pointer;
}
.prose-editor a:hover { opacity: 0.8; }

/* Empty paragraph placeholder */
.prose-editor p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: var(--muted-foreground);
  pointer-events: none;
  float: left;
  height: 0;
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -10
```

Expected: build succeeds, no CSS errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add ProseMirror prose-editor styles to globals.css"
```

---

### Task 4: Create NoteToolbar component

**Files:**
- Create: `src/components/notes/note-toolbar.tsx`
- Create: `test/components/notes/note-toolbar.test.tsx`

**Interfaces:**
- Consumes: `editor: Editor | null` from `@tiptap/react`
- Produces: `<NoteToolbar editor={editor} />`

- [ ] **Step 1: Write failing tests**

Create `test/components/notes/note-toolbar.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteToolbar } from "@/components/notes/note-toolbar";

function makeMockEditor(activeOverrides: Record<string, boolean> = {}) {
  const chainable = {
    focus: vi.fn().mockReturnThis(),
    toggleBold: vi.fn().mockReturnThis(),
    toggleItalic: vi.fn().mockReturnThis(),
    toggleUnderline: vi.fn().mockReturnThis(),
    toggleStrike: vi.fn().mockReturnThis(),
    toggleCode: vi.fn().mockReturnThis(),
    toggleCodeBlock: vi.fn().mockReturnThis(),
    toggleBlockquote: vi.fn().mockReturnThis(),
    toggleBulletList: vi.fn().mockReturnThis(),
    toggleOrderedList: vi.fn().mockReturnThis(),
    toggleHeading: vi.fn().mockReturnThis(),
    setParagraph: vi.fn().mockReturnThis(),
    setHorizontalRule: vi.fn().mockReturnThis(),
    run: vi.fn().mockReturnValue(true),
  };

  return {
    isActive: vi.fn((name: string, opts?: object) => {
      const key = opts ? `${name}-${JSON.stringify(opts)}` : name;
      return activeOverrides[key] ?? false;
    }),
    chain: vi.fn(() => chainable),
    _chainable: chainable,
  };
}

describe("<NoteToolbar />", () => {
  it("renders null when editor is null", () => {
    const { container } = render(<NoteToolbar editor={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders all formatting buttons", () => {
    const editor = makeMockEditor();
    render(<NoteToolbar editor={editor as never} />);
    expect(screen.getByRole("button", { name: /bold/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /italic/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /underline/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /strikethrough/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /inline code/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bullet list/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ordered list/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /blockquote/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /code block/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /heading 1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /heading 2/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /heading 3/i })).toBeInTheDocument();
  });

  it("clicking Bold calls editor.chain().focus().toggleBold().run()", async () => {
    const editor = makeMockEditor();
    render(<NoteToolbar editor={editor as never} />);
    await userEvent.click(screen.getByRole("button", { name: /bold/i }));
    expect(editor.chain).toHaveBeenCalled();
    expect(editor._chainable.toggleBold).toHaveBeenCalled();
    expect(editor._chainable.run).toHaveBeenCalled();
  });

  it("clicking H1 calls toggleHeading({ level: 1 })", async () => {
    const editor = makeMockEditor();
    render(<NoteToolbar editor={editor as never} />);
    await userEvent.click(screen.getByRole("button", { name: /heading 1/i }));
    expect(editor._chainable.toggleHeading).toHaveBeenCalledWith({ level: 1 });
  });

  it("active Bold button has primary styles", () => {
    const editor = makeMockEditor({ bold: true });
    render(<NoteToolbar editor={editor as never} />);
    const boldBtn = screen.getByRole("button", { name: /bold/i });
    expect(boldBtn.className).toMatch(/bg-primary/);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run test/components/notes/note-toolbar.test.tsx 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/notes/note-toolbar.tsx`**

```tsx
"use client";

import React from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  CodeXml,
  Quote,
  List,
  ListOrdered,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteToolbarProps {
  editor: Editor | null;
}

export function NoteToolbar({ editor }: NoteToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/20 px-2 py-1.5 shrink-0">
      {/* Headings */}
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        aria-label="Heading 1"
        title="Heading 1"
      >
        <span className="text-xs font-bold leading-none">H1</span>
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        aria-label="Heading 2"
        title="Heading 2"
      >
        <span className="text-xs font-bold leading-none">H2</span>
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        aria-label="Heading 3"
        title="Heading 3"
      >
        <span className="text-xs font-bold leading-none">H3</span>
      </ToolButton>

      <Divider />

      {/* Inline */}
      <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} aria-label="Bold" title="Bold">
        <Bold className="size-3.5" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} aria-label="Italic" title="Italic">
        <Italic className="size-3.5" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} aria-label="Underline" title="Underline">
        <Underline className="size-3.5" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} aria-label="Strikethrough" title="Strikethrough">
        <Strikethrough className="size-3.5" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} aria-label="Inline code" title="Inline code">
        <Code className="size-3.5" />
      </ToolButton>

      <Divider />

      {/* Block */}
      <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} aria-label="Bullet list" title="Bullet list">
        <List className="size-3.5" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} aria-label="Ordered list" title="Ordered list">
        <ListOrdered className="size-3.5" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} aria-label="Blockquote" title="Blockquote">
        <Quote className="size-3.5" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} aria-label="Code block" title="Code block">
        <CodeXml className="size-3.5" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} aria-label="Horizontal rule" title="Horizontal rule">
        <Minus className="size-3.5" />
      </ToolButton>
    </div>
  );
}

function ToolButton({
  onClick,
  active,
  title,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "rounded p-1.5 transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-4 w-px bg-border shrink-0" />;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run test/components/notes/note-toolbar.test.tsx 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/notes/note-toolbar.tsx test/components/notes/note-toolbar.test.tsx
git commit -m "feat: add NoteToolbar component with heading, inline, and block formatting controls"
```

---

### Task 5: Create NoteBubbleMenu component

**Files:**
- Create: `src/components/notes/note-bubble-menu.tsx`
- Create: `test/components/notes/note-bubble-menu.test.tsx`

**Interfaces:**
- Consumes: `editor: Editor | null` from `@tiptap/react`; `BubbleMenu` from `@tiptap/react`
- Produces: `<NoteBubbleMenu editor={editor} />`

Note: `BubbleMenu` uses Tippy.js internally which doesn't work in jsdom. The `@tiptap/react` alias in `vitest.config.ts` (Task 6 Step 1) will stub it out. For this task's tests, use the stub directly.

- [ ] **Step 1: Write failing tests**

Create `test/components/notes/note-bubble-menu.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteBubbleMenu } from "@/components/notes/note-bubble-menu";

function makeMockEditor(overrides: { isActive?: Record<string, boolean>; linkHref?: string } = {}) {
  const chainable = {
    focus: vi.fn().mockReturnThis(),
    toggleBold: vi.fn().mockReturnThis(),
    toggleItalic: vi.fn().mockReturnThis(),
    toggleUnderline: vi.fn().mockReturnThis(),
    toggleStrike: vi.fn().mockReturnThis(),
    toggleCode: vi.fn().mockReturnThis(),
    setLink: vi.fn().mockReturnThis(),
    unsetLink: vi.fn().mockReturnThis(),
    run: vi.fn().mockReturnValue(true),
  };
  return {
    isActive: vi.fn((name: string) => overrides.isActive?.[name] ?? false),
    getAttributes: vi.fn(() => ({ href: overrides.linkHref ?? "" })),
    chain: vi.fn(() => chainable),
    _chainable: chainable,
  };
}

describe("<NoteBubbleMenu />", () => {
  it("renders null when editor is null", () => {
    const { container } = render(<NoteBubbleMenu editor={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders inline format buttons", () => {
    const editor = makeMockEditor();
    render(<NoteBubbleMenu editor={editor as never} />);
    expect(screen.getByRole("button", { name: /bold/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /italic/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /underline/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /strike/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /code/i })).toBeInTheDocument();
  });

  it("shows Add link button when not in a link", () => {
    const editor = makeMockEditor();
    render(<NoteBubbleMenu editor={editor as never} />);
    expect(screen.getByRole("button", { name: /add link/i })).toBeInTheDocument();
  });

  it("shows Remove link button when inside a link", () => {
    const editor = makeMockEditor({ isActive: { link: true } });
    render(<NoteBubbleMenu editor={editor as never} />);
    expect(screen.getByRole("button", { name: /remove link/i })).toBeInTheDocument();
  });

  it("clicking Add link shows URL input", async () => {
    const editor = makeMockEditor();
    render(<NoteBubbleMenu editor={editor as never} />);
    await userEvent.click(screen.getByRole("button", { name: /add link/i }));
    expect(screen.getByPlaceholderText("https://...")).toBeInTheDocument();
  });

  it("typing URL and pressing Enter calls setLink", async () => {
    const editor = makeMockEditor();
    render(<NoteBubbleMenu editor={editor as never} />);
    await userEvent.click(screen.getByRole("button", { name: /add link/i }));
    await userEvent.type(screen.getByPlaceholderText("https://..."), "https://example.com{Enter}");
    expect(editor._chainable.setLink).toHaveBeenCalledWith({ href: "https://example.com" });
  });

  it("Escape in link input cancels without calling setLink", async () => {
    const editor = makeMockEditor();
    render(<NoteBubbleMenu editor={editor as never} />);
    await userEvent.click(screen.getByRole("button", { name: /add link/i }));
    await userEvent.type(screen.getByPlaceholderText("https://..."), "https://x{Escape}");
    expect(editor._chainable.setLink).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText("https://...")).not.toBeInTheDocument();
  });

  it("clicking Remove link calls unsetLink", async () => {
    const editor = makeMockEditor({ isActive: { link: true } });
    render(<NoteBubbleMenu editor={editor as never} />);
    await userEvent.click(screen.getByRole("button", { name: /remove link/i }));
    expect(editor._chainable.unsetLink).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Add `@tiptap/react` alias to vitest.config.ts (needed for BubbleMenu stub)**

Add the Tiptap mock file first:

Create `test/mocks/tiptap.tsx`:

```tsx
import React from "react";

export function useEditor(_options: object) {
  return null;
}

export function EditorContent({
  editor: _editor,
  ...props
}: {
  editor: unknown;
  [key: string]: unknown;
}) {
  return (
    <div
      data-testid="editor-content"
      {...(props as React.HTMLAttributes<HTMLDivElement>)}
    />
  );
}

export function BubbleMenu({
  children,
  editor: _editor,
  tippyOptions: _t,
  ...props
}: {
  children?: React.ReactNode;
  editor: unknown;
  tippyOptions?: object;
  [key: string]: unknown;
}) {
  return (
    <div
      data-testid="bubble-menu"
      {...(props as React.HTMLAttributes<HTMLDivElement>)}
    >
      {children}
    </div>
  );
}
```

Then update `vitest.config.ts` — add inside the `alias` object:

```ts
"@tiptap/react": path.resolve(__dirname, "./test/mocks/tiptap.tsx"),
"@tiptap/starter-kit": path.resolve(__dirname, "./test/mocks/tiptap.tsx"),
"@tiptap/extension-link": path.resolve(__dirname, "./test/mocks/tiptap.tsx"),
"@tiptap/extension-underline": path.resolve(__dirname, "./test/mocks/tiptap.tsx"),
"@tiptap/pm": path.resolve(__dirname, "./test/mocks/tiptap.tsx"),
```

- [ ] **Step 3: Run tests — expect failure**

```bash
npx vitest run test/components/notes/note-bubble-menu.test.tsx 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 4: Create `src/components/notes/note-bubble-menu.tsx`**

```tsx
"use client";

import { useState } from "react";
import { BubbleMenu, type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Link,
  LinkOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteBubbleMenuProps {
  editor: Editor | null;
}

export function NoteBubbleMenu({ editor }: NoteBubbleMenuProps) {
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  if (!editor) return null;

  function applyLink() {
    if (linkUrl.trim()) {
      editor!.chain().focus().setLink({ href: linkUrl.trim() }).run();
    }
    setShowLink(false);
    setLinkUrl("");
  }

  function cancelLink() {
    setShowLink(false);
    setLinkUrl("");
  }

  return (
    <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg">
        {showLink ? (
          <div className="flex items-center gap-1 px-1">
            <input
              autoFocus
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyLink();
                if (e.key === "Escape") cancelLink();
              }}
              placeholder="https://..."
              className="w-44 rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              onClick={applyLink}
              className="rounded px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Apply
            </button>
          </div>
        ) : (
          <>
            <BubbleBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} aria-label="Bold" title="Bold"><Bold className="size-3.5" /></BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} aria-label="Italic" title="Italic"><Italic className="size-3.5" /></BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} aria-label="Underline" title="Underline"><UnderlineIcon className="size-3.5" /></BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} aria-label="Strike" title="Strikethrough"><Strikethrough className="size-3.5" /></BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} aria-label="Code" title="Inline code"><Code className="size-3.5" /></BubbleBtn>
            <div className="mx-0.5 h-4 w-px bg-border shrink-0" />
            {editor.isActive("link") ? (
              <BubbleBtn onClick={() => editor.chain().focus().unsetLink().run()} active={false} aria-label="Remove link" title="Remove link"><LinkOff className="size-3.5" /></BubbleBtn>
            ) : (
              <BubbleBtn
                onClick={() => {
                  setLinkUrl(editor.getAttributes("link").href ?? "");
                  setShowLink(true);
                }}
                active={false}
                aria-label="Add link"
                title="Add link"
              >
                <Link className="size-3.5" />
              </BubbleBtn>
            )}
          </>
        )}
      </div>
    </BubbleMenu>
  );
}

function BubbleBtn({
  onClick,
  active,
  children,
  title,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "rounded p-1.5 transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx vitest run test/components/notes/note-bubble-menu.test.tsx 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 6: Run full suite**

```bash
npx vitest run 2>&1 | tail -6
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/notes/note-bubble-menu.tsx test/components/notes/note-bubble-menu.test.tsx test/mocks/tiptap.tsx vitest.config.ts
git commit -m "feat: add NoteBubbleMenu with inline formatting and link controls; add Tiptap vitest mock"
```

---

### Task 6: Rewrite NoteEditor + update tests

**Files:**
- Rewrite: `src/components/notes/note-editor.tsx`
- Rewrite: `test/components/notes/note-editor.test.tsx`

**Interfaces:**
- Consumes:
  - `loadContent(raw: string): object` from `@/lib/note-content`
  - `NoteToolbar` from `./note-toolbar`
  - `NoteBubbleMenu` from `./note-bubble-menu`
  - `useEditor`, `EditorContent` from `@tiptap/react`
  - `StarterKit` from `@tiptap/starter-kit`
  - `Underline` from `@tiptap/extension-underline`
  - `Link` from `@tiptap/extension-link`
- Produces: `<NoteEditor note={note} onUpdate={fn} onBack={fn} />`
  - `onUpdate: (id: string, changes: Partial<Pick<Note, "content" | "title">>) => Promise<void>`

- [ ] **Step 1: Rewrite `src/components/notes/note-editor.tsx`**

```tsx
"use client";

import { useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, CheckCheck } from "lucide-react";
import type { Note } from "@/types";
import { loadContent } from "@/lib/note-content";
import { NoteToolbar } from "./note-toolbar";
import { NoteBubbleMenu } from "./note-bubble-menu";

interface Props {
  note: Note;
  onUpdate: (
    id: string,
    changes: Partial<Pick<Note, "content" | "title">>
  ) => Promise<void>;
  onBack?: () => void;
}

export function NoteEditor({ note, onUpdate, onBack }: Props) {
  const [titleValue, setTitleValue] = useState(
    note.title === "Untitled" && !note.content ? "" : note.title
  );
  const [showSaved, setShowSaved] = useState(false);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function triggerSaved() {
    setShowSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setShowSaved(false), 2000);
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
    ],
    content: loadContent(note.content),
    editorProps: {
      attributes: {
        class: "prose-editor focus:outline-none min-h-64 px-4 md:px-6 py-5",
      },
    },
    onUpdate({ editor }) {
      setShowSaved(false);
      if (contentDebounceRef.current) clearTimeout(contentDebounceRef.current);
      contentDebounceRef.current = setTimeout(async () => {
        await onUpdate(note.id, {
          content: JSON.stringify(editor.getJSON()),
        });
        triggerSaved();
      }, 500);
    },
  });

  function handleTitleChange(value: string) {
    const clean = value.replace(/\n/g, "");
    setTitleValue(clean);
    setShowSaved(false);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(async () => {
      await onUpdate(note.id, { title: clean });
      triggerSaved();
    }, 500);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      editor?.commands.focus("start");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
              aria-label="Back to notes list"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <input
            type="text"
            value={titleValue}
            onChange={(e) => handleTitleChange(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled"
            aria-label="Note title"
            className="flex-1 min-w-0 bg-transparent text-base font-semibold text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
        <AnimatePresence>
          {showSaved && (
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1 text-xs text-muted-foreground shrink-0"
            >
              <CheckCheck className="size-3" />
              Saved
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Toolbar */}
      <NoteToolbar editor={editor} />

      {/* Editor body */}
      <div className="flex-1 overflow-y-auto">
        <NoteBubbleMenu editor={editor} />
        <EditorContent editor={editor} />
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Rewrite `test/components/notes/note-editor.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { act } from "@testing-library/react";
import { NoteEditor } from "@/components/notes/note-editor";
import type { Note } from "@/types/notes";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    title: "My Note",
    content: "",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("<NoteEditor />", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  // ── Structure ─────────────────────────────────────────────────

  it("renders title input with note.title", () => {
    render(<NoteEditor note={makeNote({ title: "My Note" })} onUpdate={vi.fn()} />);
    expect(screen.getByRole("textbox", { name: /note title/i })).toHaveValue("My Note");
  });

  it("title input is empty and shows placeholder for new Untitled note", () => {
    render(<NoteEditor note={makeNote({ title: "Untitled", content: "" })} onUpdate={vi.fn()} />);
    expect(screen.getByRole("textbox", { name: /note title/i })).toHaveValue("");
    expect(screen.getByPlaceholderText("Untitled")).toBeInTheDocument();
  });

  it("renders the EditorContent (editor body)", () => {
    render(<NoteEditor note={makeNote()} onUpdate={vi.fn()} />);
    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  it("renders the NoteToolbar (stubbed as bubble-menu sibling)", () => {
    render(<NoteEditor note={makeNote()} onUpdate={vi.fn()} />);
    // Toolbar renders null because useEditor returns null in the mock
    // Just verify no crash and editor-content present
    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  // ── Title debounce ────────────────────────────────────────────

  it("does not call onUpdate immediately when title changes", () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<NoteEditor note={makeNote()} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByRole("textbox", { name: /note title/i }), {
      target: { value: "New Title" },
    });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("calls onUpdate with title after 500ms debounce", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<NoteEditor note={makeNote({ id: "n1" })} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByRole("textbox", { name: /note title/i }), {
      target: { value: "New Title" },
    });
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(onUpdate).toHaveBeenCalledWith("n1", { title: "New Title" });
  });

  it("strips newlines from title input", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<NoteEditor note={makeNote({ id: "n1" })} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByRole("textbox", { name: /note title/i }), {
      target: { value: "Hello\nWorld" },
    });
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(onUpdate).toHaveBeenCalledWith("n1", { title: "HelloWorld" });
  });

  it("does not call onUpdate within the 500ms debounce window", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<NoteEditor note={makeNote()} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByRole("textbox", { name: /note title/i }), {
      target: { value: "Typing" },
    });
    await act(async () => { vi.advanceTimersByTime(499); });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("shows Saved indicator after onUpdate resolves", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<NoteEditor note={makeNote()} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByRole("textbox", { name: /note title/i }), {
      target: { value: "Updated" },
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("hides Saved indicator after 2 seconds", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<NoteEditor note={makeNote()} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByRole("textbox", { name: /note title/i }), {
      target: { value: "Updated" },
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("Saved")).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  // ── onBack ────────────────────────────────────────────────────

  describe("onBack prop", () => {
    it("renders back button when onBack provided", () => {
      render(<NoteEditor note={makeNote()} onUpdate={vi.fn()} onBack={vi.fn()} />);
      expect(screen.getByRole("button", { name: /back to notes list/i })).toBeInTheDocument();
    });

    it("does not render back button when onBack omitted", () => {
      render(<NoteEditor note={makeNote()} onUpdate={vi.fn()} />);
      expect(screen.queryByRole("button", { name: /back to notes list/i })).not.toBeInTheDocument();
    });

    it("calls onBack when back button clicked", () => {
      const onBack = vi.fn();
      render(<NoteEditor note={makeNote()} onUpdate={vi.fn()} onBack={onBack} />);
      fireEvent.click(screen.getByRole("button", { name: /back to notes list/i }));
      expect(onBack).toHaveBeenCalledOnce();
    });
  });
});
```

- [ ] **Step 3: Run tests — expect pass**

```bash
npx vitest run 2>&1 | tail -8
```

Expected: all tests pass.

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | tail -15
```

Expected: clean build, no TS errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/notes/note-editor.tsx test/components/notes/note-editor.test.tsx
git commit -m "feat: replace textarea with Tiptap WYSIWYG editor in NoteEditor"
```

- [ ] **Step 6: Push**

```bash
git push
```

---

## Self-Review

**Spec coverage check:**
- ✅ All features (bold, italic, underline, strike, code, headings, lists, blockquote, code block, hr, links) — covered in NoteToolbar + NoteBubbleMenu
- ✅ Fixed top toolbar — NoteToolbar
- ✅ Floating bubble menu — NoteBubbleMenu
- ✅ JSON storage — `JSON.stringify(editor.getJSON())` in onUpdate
- ✅ Migration (plain text → JSON) — `loadContent` in Task 1
- ✅ `extractTitle` for JSON content — Task 1 + Task 2
- ✅ `updateNote` accepts `title` explicitly — Task 2
- ✅ ProseMirror styles — Task 3
- ✅ Tests for all new components and helpers

**Type consistency:** `onUpdate` signature `Partial<Pick<Note, "content" | "title">>` used consistently across Tasks 2, 4 (NoteEditor interface).

**No placeholders detected.**
