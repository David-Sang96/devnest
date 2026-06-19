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

  async function updateNote(id: string, changes: Partial<Pick<Note, "content" | "title">>) {
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

  async function togglePin(id: string) {
    try {
      const db = await getDB();
      const existing = await db.get("notes", id);
      if (!existing) return;
      const updated: Note = { ...existing, pinned: !existing.pinned };
      await db.put("notes", updated);
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch (err) {
      console.error("Failed to toggle pin:", err);
    }
  }

  return { notes, createNote, updateNote, removeNote, togglePin };
}
