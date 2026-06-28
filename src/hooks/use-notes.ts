"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getDB } from "@/lib/db";
import type { Note } from "@/types";
import { extractTitle } from "@/lib/note-content";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export function useNotes() {
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const db = await getDB();
        const all = await db.getAllFromIndex("notes", "updatedAt");
        const now = Date.now();
        const expired = all.filter((n) => n.deletedAt && n.deletedAt < now - THIRTY_DAYS);
        await Promise.all(expired.map((n) => db.delete("notes", n.id)));
        const remaining = all.filter((n) => !n.deletedAt || n.deletedAt >= now - THIRTY_DAYS);
        setAllNotes(remaining.reverse());
      } catch {
        toast.error("Failed to load notes");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const notes = allNotes.filter((n) => !n.deletedAt);
  const trashedNotes = allNotes.filter((n) => !!n.deletedAt);

  async function createNote(initial?: { title: string; content: string }): Promise<Note> {
    const now = Date.now();
    const note: Note = {
      id: crypto.randomUUID(),
      title: initial?.title ?? "Untitled",
      content: initial?.content ?? "",
      createdAt: now,
      updatedAt: now,
    };
    try {
      const db = await getDB();
      await db.put("notes", note);
      setAllNotes((prev) => [note, ...prev]);
    } catch {
      toast.error("Failed to save");
    }
    return note;
  }

  async function updateNote(id: string, changes: Partial<Pick<Note, "content" | "title">>) {
    try {
      const db = await getDB();
      const existing = await db.get("notes", id);
      if (!existing) return;
      let derivedTitle = existing.title;
      if (changes.title !== undefined) {
        derivedTitle = changes.title.trim() || "Untitled";
      } else if (changes.content !== undefined) {
        derivedTitle = extractTitle(changes.content);
      }
      const updated: Note = { ...existing, ...changes, title: derivedTitle, updatedAt: Date.now() };
      await db.put("notes", updated);
      setAllNotes((prev) =>
        prev.map((n) => (n.id === id ? updated : n)).sort((a, b) => b.updatedAt - a.updatedAt)
      );
    } catch {
      toast.error("Failed to save");
    }
  }

  async function removeNote(id: string): Promise<void> {
    try {
      const db = await getDB();
      const existing = await db.get("notes", id);
      if (!existing) return;
      const trashed: Note = { ...existing, deletedAt: Date.now() };
      await db.put("notes", trashed);
      setAllNotes((prev) => prev.map((n) => (n.id === id ? trashed : n)));
    } catch {
      toast.error("Failed to delete note");
    }
  }

  async function restoreFromTrash(id: string): Promise<void> {
    try {
      const db = await getDB();
      const existing = await db.get("notes", id);
      if (!existing) return;
      const { deletedAt: _removed, ...rest } = existing;
      const restored: Note = { ...rest, updatedAt: Date.now() };
      await db.put("notes", restored);
      setAllNotes((prev) => prev.map((n) => (n.id === id ? restored : n)));
    } catch {
      toast.error("Failed to restore note");
    }
  }

  async function permanentlyDelete(id: string): Promise<void> {
    try {
      const db = await getDB();
      await db.delete("notes", id);
      setAllNotes((prev) => prev.filter((n) => n.id !== id));
    } catch {
      toast.error("Failed to delete note");
    }
  }

  async function emptyTrash(): Promise<void> {
    try {
      const db = await getDB();
      const toDelete = allNotes.filter((n) => !!n.deletedAt);
      await Promise.all(toDelete.map((n) => db.delete("notes", n.id)));
      setAllNotes((prev) => prev.filter((n) => !n.deletedAt));
    } catch {
      toast.error("Failed to empty trash");
    }
  }

  async function togglePin(id: string) {
    try {
      const db = await getDB();
      const existing = await db.get("notes", id);
      if (!existing) return;
      const updated: Note = { ...existing, pinned: !existing.pinned };
      await db.put("notes", updated);
      setAllNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch {
      toast.error("Failed to save");
    }
  }

  return {
    notes,
    trashedNotes,
    isLoading,
    createNote,
    updateNote,
    removeNote,
    restoreFromTrash,
    permanentlyDelete,
    emptyTrash,
    togglePin,
  };
}
