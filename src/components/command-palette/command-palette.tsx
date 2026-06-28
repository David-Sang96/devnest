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
