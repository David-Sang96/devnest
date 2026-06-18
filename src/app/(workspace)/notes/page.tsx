"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useNotes } from "@/hooks/use-notes";
import { useNotesFilter } from "@/hooks/use-notes-filter";
import { NoteList } from "@/components/notes/note-list";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteEmptyState } from "@/components/notes/note-empty-state";

export default function NotesPage() {
  const { notes, createNote, updateNote, removeNote, togglePin } = useNotes();
  const {
    filteredNotes,
    searchQuery, setSearchQuery,
    sortOrder, setSortOrder,
    dateFilter, setDateFilter,
    showPinnedOnly, setShowPinnedOnly,
    hasActiveFilters, clearFilters,
  } = useNotesFilter(notes);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  async function handleNew() {
    const note = await createNote();
    setSelectedId(note.id);
  }

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
        />
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
