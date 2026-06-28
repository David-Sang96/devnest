"use client";

import { useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, StickyNote, Search, ArrowUpDown, Calendar, Pin, Trash2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NoteListItem } from "./note-list-item";
import type { Note, SortOrder, DateFilter } from "@/types";

interface Props {
  notes: Note[];
  trashedNotes: Note[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onRestoreFromTrash: (id: string) => void;
  onPermanentlyDelete: (id: string) => void;
  onEmptyTrash: () => void;
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
  searchRef?: React.RefObject<HTMLInputElement | null>;
}

export function NoteList({
  notes, trashedNotes, selectedId, onSelect, onNew, onDelete, onTogglePin,
  onRestoreFromTrash, onPermanentlyDelete, onEmptyTrash,
  searchQuery, onSearchChange, sortOrder, onSortChange,
  dateFilter, onDateFilterChange, showPinnedOnly, onShowPinnedOnlyChange,
  hasActiveFilters, onClearFilters, searchRef,
}: Props) {
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = searchRef ?? internalRef;
  const [inTrash, setInTrash] = useState(false);

  return (
    <div className="flex flex-col border-r border-border h-full w-full">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold text-foreground">
          {inTrash ? "Trash" : "Notes"}
        </span>
        <div className="flex items-center gap-1">
          {!inTrash && (
            <Button size="icon-xs" variant="ghost" onClick={onNew} aria-label="New note">
              <Plus className="size-3.5" />
            </Button>
          )}
          <button
            onClick={() => setInTrash((v) => !v)}
            aria-label={inTrash ? "Back to notes" : "Trash"}
            aria-pressed={inTrash}
            className={cn(
              "relative flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
              inTrash && "text-foreground"
            )}
          >
            <Trash2 className="size-3.5" />
            {!inTrash && trashedNotes.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                {trashedNotes.length > 9 ? "9+" : trashedNotes.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {inTrash ? (
        /* ── Trash view ── */
        <div className="flex flex-col flex-1 overflow-hidden">
          {trashedNotes.length > 0 && (
            <div className="px-3 py-2 border-b border-border flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={onEmptyTrash}
                aria-label="Empty trash"
                className="text-xs text-destructive hover:text-destructive"
              >
                Empty Trash
              </Button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-2">
            {trashedNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <Trash2 className="size-6 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">Trash is empty</p>
              </div>
            ) : (
              trashedNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 group hover:bg-accent"
                >
                  <span className="flex-1 text-xs text-foreground truncate">{note.title}</span>
                  <button
                    onClick={() => onRestoreFromTrash(note.id)}
                    aria-label={`Restore ${note.title}`}
                    title="Restore"
                    className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <RotateCcw className="size-3" />
                  </button>
                  <button
                    onClick={() => onPermanentlyDelete(note.id)}
                    aria-label={`Delete forever ${note.title}`}
                    title="Delete forever"
                    className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* ── Normal notes view ── */
        <>
          {/* Search input */}
          <div className="px-3 pt-2 pb-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search notes... (⌘K)"
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
        </>
      )}
    </div>
  );
}
