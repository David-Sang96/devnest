"use client";

import { useState, useEffect, useCallback } from "react";
import type { KanbanLabel } from "@/types/kanban";
import { getDB } from "@/lib/db";

export function useKanbanLabels(boardId: string | null) {
  const [labels, setLabels] = useState<KanbanLabel[]>([]);

  useEffect(() => {
    if (!boardId) {
      setLabels([]);
      return;
    }
    getDB()
      .then((db) => db.getAllFromIndex("kanban_labels", "boardId", boardId))
      .then(setLabels);
  }, [boardId]);

  const createLabel = useCallback(
    async (name: string, color: string) => {
      if (!boardId) return;
      const db = await getDB();
      const label: KanbanLabel = {
        id: crypto.randomUUID(),
        boardId,
        name,
        color,
        createdAt: Date.now(),
      };
      await db.put("kanban_labels", label);
      setLabels((prev) => [...prev, label]);
      return label;
    },
    [boardId]
  );

  const updateLabel = useCallback(
    async (id: string, patch: Partial<Pick<KanbanLabel, "name" | "color">>) => {
      const db = await getDB();
      const existing = await db.get("kanban_labels", id);
      if (!existing) return;
      const updated = { ...existing, ...patch };
      await db.put("kanban_labels", updated);
      setLabels((prev) => prev.map((l) => (l.id === id ? updated : l)));
    },
    [] // Only references parameters and functional setState form; no captured state
  );

  const removeLabel = useCallback(
    async (id: string) => {
      const db = await getDB();
      await db.delete("kanban_labels", id);
      setLabels((prev) => prev.filter((l) => l.id !== id));
    },
    [] // Only references parameters and functional setState form; no captured state
  );

  return { labels, createLabel, updateLabel, removeLabel };
}
