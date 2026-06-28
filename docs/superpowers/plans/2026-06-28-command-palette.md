# Command Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global Ctrl+K command palette that lets users search notes and kanban cards, navigate between tools, create notes, and toggle the theme from any page.

**Architecture:** A single `"use client"` component mounts once in `WorkspaceShell`, registers the global `Ctrl+K` listener, fetches from IDB on open, and renders a Dialog-backed modal with grouped search results and keyboard navigation. The Notes page gains a `?new=1` URL param handler that auto-creates a note on arrival.

**Tech Stack:** Next.js 16 App Router, `@base-ui/react` (Dialog), `idb` via `getDB()`, `next-themes` (`useTheme`), `lucide-react` icons, Tailwind v4, Vitest + @testing-library/react.

## Global Constraints

- All persistence via IndexedDB — `getDB()` from `src/lib/db.ts` — no network calls.
- "use client" required on any file that calls `getDB()` or uses hooks.
- UI primitives are `@base-ui/react` (not Radix). `DialogPrimitive.Root` props: `open: boolean`, `onOpenChange: (open: boolean, event: Event, reason: string) => void`. No `asChild` prop — use `render` prop pattern if wrapping elements.
- Existing `Dialog` wrapper is at `src/components/ui/dialog.tsx` — use it, do not reach into `@base-ui/react` directly.
- Icons from `lucide-react`. All icons used here are already in the project: `Search`, `FileText`, `Columns3`, `Braces`, `KeyRound`, `Settings`, `Plus`, `Sun`.
- Tests live in `test/` mirroring `src/`. Run with `npx vitest run <path>`.
- `extractPlainText(content: string): string` is exported from `src/lib/note-content.ts`. Takes raw note content string, returns plain text.
- `Note` type: `{ id, title, content, createdAt, updatedAt, pinned?, deletedAt? }` from `src/types/notes.ts`.
- `KanbanCard` type: `{ id, columnId, boardId, title, description, priority?, dueDate?, labelIds?, archived?, createdAt, updatedAt }` from `src/types/kanban.ts`.
- `cn()` from `@/lib/utils`.

---

### Task 1: CommandPalette component + tests

**Files:**
- Create: `src/components/command-palette/command-palette.tsx`
- Create: `test/components/command-palette/command-palette.test.tsx`

**Interfaces:**
- Consumes: `getDB()` from `@/lib/db`, `extractPlainText` from `@/lib/note-content`, `Dialog`/`DialogContent` from `@/components/ui/dialog`, `useRouter` from `next/navigation`, `useTheme` from `next-themes`.
- Produces: `CommandPalette` — a zero-prop `"use client"` component that renders a self-contained palette and a global `Ctrl+K` listener. Imported and mounted by Task 2.

- [ ] **Step 1: Write the failing tests**

Create `test/components/command-palette/command-palette.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "@/components/command-palette/command-palette";
import type { Note } from "@/types/notes";
import type { KanbanCard } from "@/types/kanban";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockSetTheme = vi.fn();
const mockGetAll = vi.fn();

vi.mock("@/lib/db", () => ({
  getDB: () => Promise.resolve({ getAll: mockGetAll }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: mockSetTheme }),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) =>
    open ? (
      <div
        data-testid="palette"
        onKeyDown={(e) => {
          if (e.key === "Escape") onOpenChange?.(false);
        }}
      >
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    title: "Test Note",
    content: "",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function makeCard(overrides: Partial<KanbanCard> = {}): KanbanCard {
  return {
    id: "c1",
    boardId: "b1",
    columnId: "col1",
    title: "Test Card",
    description: "",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function seedDB(notes: Note[] = [], cards: KanbanCard[] = []) {
  mockGetAll.mockImplementation((store: string) => {
    if (store === "notes") return Promise.resolve(notes);
    if (store === "kanban_cards") return Promise.resolve(cards);
    return Promise.resolve([]);
  });
}

function openPalette() {
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
}

beforeEach(() => {
  vi.clearAllMocks();
  seedDB();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("<CommandPalette />", () => {
  it("is closed by default", () => {
    render(<CommandPalette />);
    expect(screen.queryByTestId("palette")).not.toBeInTheDocument();
  });

  it("opens on Ctrl+K", async () => {
    render(<CommandPalette />);
    openPalette();
    expect(await screen.findByTestId("palette")).toBeInTheDocument();
  });

  it("closes on second Ctrl+K", async () => {
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    openPalette();
    await waitFor(() => {
      expect(screen.queryByTestId("palette")).not.toBeInTheDocument();
    });
  });

  it("closes on Esc", async () => {
    render(<CommandPalette />);
    openPalette();
    const palette = await screen.findByTestId("palette");
    fireEvent.keyDown(palette, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("palette")).not.toBeInTheDocument();
    });
  });

  it("shows all commands when query is empty", async () => {
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    expect(screen.getByText("Go to Notes")).toBeInTheDocument();
    expect(screen.getByText("New Note")).toBeInTheDocument();
    expect(screen.getByText("Toggle Theme")).toBeInTheDocument();
    expect(screen.getByText("Go to Settings")).toBeInTheDocument();
  });

  it("hides Notes and Kanban Cards sections when query is empty", async () => {
    seedDB([makeNote()], [makeCard()]);
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
    expect(screen.queryByText("Kanban Cards")).not.toBeInTheDocument();
  });

  it("shows matching note in Notes section when query matches title", async () => {
    seedDB([makeNote({ id: "n1", title: "Meeting Notes" })]);
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    await userEvent.type(
      screen.getByRole("textbox", { name: /search/i }),
      "Meeting"
    );
    await waitFor(() => {
      expect(screen.getByText("Meeting Notes")).toBeInTheDocument();
      expect(screen.getByText("Notes")).toBeInTheDocument();
    });
  });

  it("shows matching card in Kanban Cards section when query matches title", async () => {
    seedDB([], [makeCard({ id: "c1", title: "Build login page" })]);
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    await userEvent.type(
      screen.getByRole("textbox", { name: /search/i }),
      "login"
    );
    await waitFor(() => {
      expect(screen.getByText("Build login page")).toBeInTheDocument();
      expect(screen.getByText("Kanban Cards")).toBeInTheDocument();
    });
  });

  it("filters commands by query — matching label shown, non-matching hidden", async () => {
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    await userEvent.type(
      screen.getByRole("textbox", { name: /search/i }),
      "settings"
    );
    await waitFor(() => {
      expect(screen.getByText("Go to Settings")).toBeInTheDocument();
      expect(screen.queryByText("New Note")).not.toBeInTheDocument();
    });
  });

  it("shows no-results message when query matches nothing", async () => {
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    await userEvent.type(
      screen.getByRole("textbox", { name: /search/i }),
      "xyzzy999"
    );
    await waitFor(() => {
      expect(screen.getByText(/no results for/i)).toBeInTheDocument();
    });
  });

  it("clicking a command executes its action and closes palette", async () => {
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    await userEvent.click(screen.getByText("Go to Settings"));
    expect(mockPush).toHaveBeenCalledWith("/settings");
    await waitFor(() => {
      expect(screen.queryByTestId("palette")).not.toBeInTheDocument();
    });
  });

  it("clicking 'New Note' navigates to /notes?new=1", async () => {
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    await userEvent.click(screen.getByText("New Note"));
    expect(mockPush).toHaveBeenCalledWith("/notes?new=1");
  });

  it("clicking 'Toggle Theme' calls setTheme('dark') when theme is light", async () => {
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    await userEvent.click(screen.getByText("Toggle Theme"));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("ArrowDown moves highlight to second command, Enter executes it", async () => {
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    const input = screen.getByRole("textbox", { name: /search/i });
    // Empty query → flatItems = all 7 commands. Index 0 = "Go to Notes", 1 = "Go to Kanban".
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockPush).toHaveBeenCalledWith("/kanban");
  });

  it("ArrowUp from index 0 wraps to last item", async () => {
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    const input = screen.getByRole("textbox", { name: /search/i });
    // Empty query → 7 commands. Index 0. ArrowUp → wraps to 6 (Toggle Theme).
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("excludes soft-deleted notes from search results", async () => {
    seedDB([makeNote({ id: "n1", title: "Deleted Note", deletedAt: Date.now() })]);
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    await userEvent.type(
      screen.getByRole("textbox", { name: /search/i }),
      "Deleted"
    );
    await waitFor(() => {
      expect(screen.queryByText("Deleted Note")).not.toBeInTheDocument();
    });
  });

  it("excludes archived kanban cards from search results", async () => {
    seedDB([], [makeCard({ title: "Archived Card", archived: true })]);
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    await userEvent.type(
      screen.getByRole("textbox", { name: /search/i }),
      "Archived"
    );
    await waitFor(() => {
      expect(screen.queryByText("Archived Card")).not.toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run test/components/command-palette/command-palette.test.tsx
```

Expected: all tests FAIL with "Cannot find module '@/components/command-palette/command-palette'".

- [ ] **Step 3: Implement the CommandPalette component**

Create `src/components/command-palette/command-palette.tsx`:

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Search,
  FileText,
  Columns3,
  Braces,
  KeyRound,
  Settings,
  Plus,
  Sun,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getDB } from "@/lib/db";
import { extractPlainText } from "@/lib/note-content";
import type { Note } from "@/types/notes";
import type { KanbanCard } from "@/types/kanban";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type NoteResult  = { type: "note";    id: string; title: string; preview: string }
type CardResult  = { type: "card";    id: string; title: string; preview: string }
type CommandItem = { type: "command"; id: string; label: string; icon: LucideIcon; action: () => void }
type PaletteItem = NoteResult | CardResult | CommandItem

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncate(str: string, len: number): string {
  return str.length <= len ? str : str.slice(0, len) + "…";
}

function matches(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CommandPalette() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<NoteResult[]>([]);
  const [cards, setCards] = useState<CardResult[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function close() {
    setOpen(false);
  }

  // Reset state whenever palette closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setNotes([]);
      setCards([]);
      setHighlightIndex(0);
    }
  }, [open]);

  // Fetch IDB data on open
  useEffect(() => {
    if (!open) return;
    (async () => {
      const db = await getDB();
      const [allNotes, allCards] = await Promise.all([
        db.getAll("notes"),
        db.getAll("kanban_cards"),
      ]);
      setNotes(
        (allNotes as Note[])
          .filter((n) => !n.deletedAt)
          .map((n) => ({
            type: "note" as const,
            id: n.id,
            title: n.title || "Untitled",
            preview: truncate(extractPlainText(n.content), 80),
          }))
      );
      setCards(
        (allCards as KanbanCard[])
          .filter((c) => !c.archived)
          .map((c) => ({
            type: "card" as const,
            id: c.id,
            title: c.title,
            preview: truncate(c.description || "", 80),
          }))
      );
    })();
  }, [open]);

  // Auto-focus input when palette opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  // Global Ctrl+K / Cmd+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Static commands
  const commands: CommandItem[] = [
    { type: "command", id: "go-notes",     label: "Go to Notes",              icon: FileText, action: () => { router.push("/notes");       close(); } },
    { type: "command", id: "go-kanban",    label: "Go to Kanban",             icon: Columns3, action: () => { router.push("/kanban");      close(); } },
    { type: "command", id: "go-json",      label: "Go to JSON Formatter",     icon: Braces,   action: () => { router.push("/json");        close(); } },
    { type: "command", id: "go-password",  label: "Go to Password Generator", icon: KeyRound, action: () => { router.push("/password");    close(); } },
    { type: "command", id: "go-settings",  label: "Go to Settings",           icon: Settings, action: () => { router.push("/settings");    close(); } },
    { type: "command", id: "new-note",     label: "New Note",                 icon: Plus,     action: () => { router.push("/notes?new=1"); close(); } },
    { type: "command", id: "toggle-theme", label: "Toggle Theme",             icon: Sun,      action: () => { setTheme(theme === "dark" ? "light" : "dark"); close(); } },
  ];

  // Filter
  const filteredNotes    = query ? notes.filter((n) => matches(n.title, query) || matches(n.preview, query)) : [];
  const filteredCards    = query ? cards.filter((c) => matches(c.title, query) || matches(c.preview, query)) : [];
  const filteredCommands = query ? commands.filter((c) => matches(c.label, query)) : commands;

  const noteCount = Math.min(filteredNotes.length, 5);
  const cardCount = Math.min(filteredCards.length, 5);

  const flatItems: PaletteItem[] = [
    ...filteredNotes.slice(0, 5),
    ...filteredCards.slice(0, 5),
    ...filteredCommands,
  ];

  // Reset highlight on query change
  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  function executeItem(item: PaletteItem) {
    if (item.type === "command") {
      item.action();
    } else if (item.type === "note") {
      router.push("/notes");
      close();
    } else {
      router.push("/kanban");
      close();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) =>
        flatItems.length === 0 ? 0 : (i + 1) % flatItems.length
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) =>
        flatItems.length === 0 ? 0 : (i - 1 + flatItems.length) % flatItems.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[highlightIndex];
      if (item) executeItem(item);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => { if (!isOpen) close(); }}>
      <DialogContent
        showCloseButton={false}
        className="top-[20%] translate-y-0 max-w-[560px] p-0 gap-0 overflow-hidden"
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search notes, cards, and commands..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search"
          />
        </div>

        {/* Results */}
        {flatItems.length > 0 && (
          <ul
            className="max-h-[360px] overflow-y-auto py-2"
            role="listbox"
            aria-label="Results"
          >
            {/* Notes group */}
            {noteCount > 0 && (
              <>
                <li className="px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Notes
                </li>
                {filteredNotes.slice(0, 5).map((note, i) => (
                  <li key={note.id} role="option" aria-selected={highlightIndex === i}>
                    <button
                      className={cn(
                        "w-full flex flex-col px-4 py-2 text-left text-sm transition-colors",
                        highlightIndex === i
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      )}
                      onMouseEnter={() => setHighlightIndex(i)}
                      onClick={() => executeItem(note)}
                    >
                      <span className="truncate font-medium">{note.title}</span>
                      {note.preview && (
                        <span className="truncate text-xs text-muted-foreground">
                          {note.preview}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </>
            )}

            {/* Kanban Cards group */}
            {cardCount > 0 && (
              <>
                <li
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground",
                    noteCount > 0 && "mt-1"
                  )}
                >
                  Kanban Cards
                </li>
                {filteredCards.slice(0, 5).map((card, i) => {
                  const idx = noteCount + i;
                  return (
                    <li key={card.id} role="option" aria-selected={highlightIndex === idx}>
                      <button
                        className={cn(
                          "w-full flex flex-col px-4 py-2 text-left text-sm transition-colors",
                          highlightIndex === idx
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50"
                        )}
                        onMouseEnter={() => setHighlightIndex(idx)}
                        onClick={() => executeItem(card)}
                      >
                        <span className="truncate font-medium">{card.title}</span>
                        {card.preview && (
                          <span className="truncate text-xs text-muted-foreground">
                            {card.preview}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </>
            )}

            {/* Commands group */}
            {filteredCommands.length > 0 && (
              <>
                <li
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground",
                    (noteCount > 0 || cardCount > 0) && "mt-1"
                  )}
                >
                  Commands
                </li>
                {filteredCommands.map((cmd, i) => {
                  const idx = noteCount + cardCount + i;
                  const Icon = cmd.icon;
                  return (
                    <li key={cmd.id} role="option" aria-selected={highlightIndex === idx}>
                      <button
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors",
                          highlightIndex === idx
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50"
                        )}
                        onMouseEnter={() => setHighlightIndex(idx)}
                        onClick={() => executeItem(cmd)}
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span>{cmd.label}</span>
                      </button>
                    </li>
                  );
                })}
              </>
            )}
          </ul>
        )}

        {/* No-results state */}
        {query && flatItems.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No results for &ldquo;{query}&rdquo;
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run test/components/command-palette/command-palette.test.tsx
```

Expected: all 15 tests PASS.

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: exit 0, no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/command-palette/command-palette.tsx \
        test/components/command-palette/command-palette.test.tsx
git commit -m "feat: add CommandPalette component with search and keyboard navigation"
```

---

### Task 2: Wire up palette — WorkspaceShell mount + notes page `?new=1`

**Files:**
- Modify: `src/components/layout/workspace-shell.tsx`
- Modify: `src/app/(workspace)/notes/page.tsx`
- Create: `test/app/(workspace)/notes/page.test.tsx`

**Interfaces:**
- Consumes: `CommandPalette` from `@/components/command-palette/command-palette` (Task 1).
- Produces: Ctrl+K palette live in the running app; Notes page auto-creates a note when navigated to with `?new=1`.

- [ ] **Step 1: Write the failing test for the notes page `?new=1` behaviour**

Create `test/app/(workspace)/notes/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import NotesPage from "@/app/(workspace)/notes/page";
import type { Note } from "@/types/notes";
import type { SortOrder, DateFilter } from "@/types/notes";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockCreateNote = vi.fn().mockResolvedValue({ id: "new-note-id" } as Note);
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/hooks/use-notes", () => ({
  useNotes: () => ({
    notes: [],
    trashedNotes: [],
    isLoading: false,
    createNote: mockCreateNote,
    updateNote: vi.fn(),
    removeNote: vi.fn(),
    restoreFromTrash: vi.fn(),
    permanentlyDelete: vi.fn(),
    emptyTrash: vi.fn(),
    togglePin: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-notes-filter", () => ({
  useNotesFilter: () => ({
    filteredNotes: [],
    searchQuery: "",
    setSearchQuery: vi.fn(),
    sortOrder: "updatedAt" as SortOrder,
    setSortOrder: vi.fn(),
    dateFilter: "all" as DateFilter,
    setDateFilter: vi.fn(),
    showPinnedOnly: false,
    setShowPinnedOnly: vi.fn(),
    hasActiveFilters: false,
    clearFilters: vi.fn(),
  }),
}));

vi.mock("@/components/notes/note-list", () => ({
  NoteList: () => <div data-testid="note-list" />,
}));

vi.mock("@/components/notes/note-editor", () => ({
  NoteEditor: () => <div data-testid="note-editor" />,
}));

vi.mock("@/components/notes/note-empty-state", () => ({
  NoteEmptyState: () => <div data-testid="note-empty-state" />,
}));

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("location", { search: "" });
});

describe("NotesPage — ?new=1 param", () => {
  it("calls createNote and router.replace('/notes') when ?new=1 is present", async () => {
    vi.stubGlobal("location", { search: "?new=1" });
    render(<NotesPage />);
    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalled();
    });
    expect(mockReplace).toHaveBeenCalledWith("/notes");
  });

  it("does not call createNote when ?new=1 is absent", async () => {
    render(<NotesPage />);
    // Wait a tick to allow any effects to fire
    await waitFor(() => {}, { timeout: 50 });
    expect(mockCreateNote).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run test/app/\(workspace\)/notes/page.test.tsx
```

Expected: FAIL — `mockCreateNote` is not called and `mockReplace` is not called (the effect doesn't exist yet).

- [ ] **Step 3: Mount CommandPalette in WorkspaceShell**

Modify `src/components/layout/workspace-shell.tsx`. Add the `CommandPalette` import and render it inside the wrapper div:

```tsx
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { PageTransition } from "./page-transition";
import { CommandPalette } from "@/components/command-palette/command-palette";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background pb-16 md:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>
      <MobileNav />
      <CommandPalette />
    </div>
  );
}
```

- [ ] **Step 4: Add `?new=1` handler and remove Ctrl+K note-search from notes page**

Modify `src/app/(workspace)/notes/page.tsx`.

**4a — Add `useRouter` import.** Change the first two import lines from:

```tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence } from "motion/react";
```

to:

```tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
```

**4b — Add `const router = useRouter()` inside `NotesPage`.** Add it right after the `useNotes()` destructure (after `const { notes, trashedNotes, ... } = useNotes();`):

```tsx
const router = useRouter();
```

**4c — Add the `?new=1` effect.** Add this new `useEffect` block directly after the existing `useEffect` that sets `selectedId` to null when the selected note leaves the filtered list (lines 34–37 in current file):

```tsx
  // Auto-create note when navigated here via ?new=1 from the command palette
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      handleNew();
      router.replace("/notes");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

**4d — Remove the Ctrl+K note-search binding.** Find the existing `onKeyDown` handler in `notes/page.tsx` (the one that adds a `keydown` listener on `document`). It currently reads:

```tsx
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "n") {
        e.preventDefault();
        handleNew();
      } else if (e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleNew]);
```

Replace it with (removing the `else if (e.key === "k")` branch):

```tsx
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "n") {
        e.preventDefault();
        handleNew();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleNew]);
```

- [ ] **Step 5: Run the new test to verify it passes**

```bash
npx vitest run test/app/\(workspace\)/notes/page.test.tsx
```

Expected: both tests PASS.

- [ ] **Step 6: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass (previously 425; now 425 + 15 new palette tests + 2 new page tests = 442).

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/workspace-shell.tsx \
        src/app/\(workspace\)/notes/page.tsx \
        test/app/\(workspace\)/notes/page.test.tsx
git commit -m "feat: wire up CommandPalette in WorkspaceShell, handle ?new=1 in notes page"
```
