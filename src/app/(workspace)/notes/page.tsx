"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useNotes } from "@/hooks/use-notes";
import { useNotesFilter } from "@/hooks/use-notes-filter";
import { NoteList } from "@/components/notes/note-list";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteEmptyState } from "@/components/notes/note-empty-state";
import { Loader2 } from "lucide-react";

export default function NotesPage() {
  const { notes, isLoading, createNote, updateNote, removeNote, togglePin } = useNotes();
  const {
    filteredNotes,
    searchQuery, setSearchQuery,
    sortOrder, setSortOrder,
    dateFilter, setDateFilter,
    showPinnedOnly, setShowPinnedOnly,
    hasActiveFilters, clearFilters,
  } = useNotesFilter(notes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId !== null && !filteredNotes.some((n) => n.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filteredNotes, selectedId]);

  const handleNew = useCallback(async () => {
    const note = await createNote();
    clearFilters();
    setSelectedId(note.id);
  }, [createNote, clearFilters]);

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

  async function handleDelete(id: string) {
    await removeNote(id);
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="flex h-full">
      <div
        className={cn(
          "flex flex-col border-r border-border h-full shrink-0",
          selectedNote ? "hidden md:flex md:w-64" : "flex w-full md:w-64"
        )}
      >
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <NoteList
            notes={filteredNotes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onNew={handleNew}
            onDelete={handleDelete}
            onTogglePin={togglePin}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortOrder={sortOrder}
            onSortChange={setSortOrder}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            showPinnedOnly={showPinnedOnly}
            onShowPinnedOnlyChange={setShowPinnedOnly}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            searchRef={searchRef}
          />
        )}
      </div>

      <div
        className={cn(
          "flex-1 overflow-hidden",
          !selectedNote ? "hidden md:block" : "block"
        )}
      >
        <AnimatePresence mode="wait">
          {selectedNote ? (
            <NoteEditor
              key={selectedNote.id}
              note={selectedNote}
              onUpdate={updateNote}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <NoteEmptyState key="empty" onNew={handleNew} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
