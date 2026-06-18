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
