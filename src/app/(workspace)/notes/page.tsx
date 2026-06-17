"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useNotes } from "@/hooks/use-notes";
import { NoteList } from "@/components/notes/note-list";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteEmptyState } from "@/components/notes/note-empty-state";

export default function NotesPage() {
  const { notes, createNote, updateNote, removeNote } = useNotes();
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
      {/* List panel: full-width on mobile (hidden when note selected), fixed w-64 on desktop */}
      <div
        className={cn(
          "flex flex-col border-r border-border h-full shrink-0",
          selectedNote ? "hidden md:flex md:w-64" : "flex w-full md:w-64"
        )}
      >
        <NoteList
          notes={notes}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNew={handleNew}
          onDelete={handleDelete}
        />
      </div>

      {/* Editor panel: hidden on mobile when no note selected */}
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
