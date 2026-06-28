"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useNotes } from "@/hooks/use-notes";
import { useNotesFilter } from "@/hooks/use-notes-filter";
import { NoteList } from "@/components/notes/note-list";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteEmptyState } from "@/components/notes/note-empty-state";
import { Loader2 } from "lucide-react";

function NotesPageContent() {
  const {
    notes, trashedNotes, isLoading,
    createNote, updateNote, removeNote,
    restoreFromTrash, permanentlyDelete, emptyTrash,
    togglePin,
  } = useNotes();
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Auto-create note when navigated here via ?new=1 from the command palette
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      handleNew();
      router.replace("/notes");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleNew = useCallback(async () => {
    const note = await createNote();
    clearFilters();
    setSelectedId(note.id);
  }, [createNote, clearFilters]);

  const handleNewFromTemplate = useCallback(
    async (initial: { title: string; content: string }) => {
      const note = await createNote(initial);
      clearFilters();
      setSelectedId(note.id);
    },
    [createNote, clearFilters]
  );

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
            trashedNotes={trashedNotes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onNew={handleNew}
            onDelete={handleDelete}
            onTogglePin={togglePin}
            onRestoreFromTrash={restoreFromTrash}
            onPermanentlyDelete={permanentlyDelete}
            onEmptyTrash={emptyTrash}
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
            onNewFromTemplate={handleNewFromTemplate}
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

export default function NotesPage() {
  return (
    <Suspense>
      <NotesPageContent />
    </Suspense>
  );
}
