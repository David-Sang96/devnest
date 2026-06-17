"use client";

import { useState, useEffect } from "react";
import { getDB } from "@/lib/db";
import type { Note } from "@/types";

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

  async function updateNote(id: string, changes: Partial<Pick<Note, "content">>) {
    const db = await getDB();
    const existing = await db.get("notes", id);
    if (!existing) return;
    const firstLine = (changes.content ?? existing.content).split("\n")[0].trim();
    const updated: Note = {
      ...existing,
      ...changes,
      title: firstLine || "Untitled",
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

  return { notes, createNote, updateNote, removeNote };
}
