"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { KanbanLabel } from "@/types/kanban";
import { getDB } from "@/lib/db";

export function useKanbanLabels(boardId: string | null) {
  const [labels, setLabels] = useState<KanbanLabel[]>([]);

  useEffect(() => {
    if (!boardId) { setLabels([]); return; }
    getDB()
      .then((db) => db.getAllFromIndex("kanban_labels", "boardId", boardId))
      .then(setLabels)
      .catch(() => toast.error("Failed to load labels"));
  }, [boardId]);

  const createLabel = useCallback(async (name: string, color: string) => {
    if (!boardId) return;
    const now = Date.now();
    const label: KanbanLabel = { id: crypto.randomUUID(), boardId, name, color, createdAt: now, updatedAt: now };
    try {
      const db = await getDB();
      await db.put("kanban_labels", label);
      setLabels((prev) => [...prev, label]);
    } catch {
      toast.error("Failed to save");
    }
    return label;
  }, [boardId]);

  const updateLabel = useCallback(async (id: string, patch: Partial<Pick<KanbanLabel, "name" | "color">>) => {
    try {
      const db = await getDB();
      const existing = await db.get("kanban_labels", id);
      if (!existing) return;
      const updated = { ...existing, ...patch, updatedAt: Date.now() };
      await db.put("kanban_labels", updated);
      setLabels((prev) => prev.map((l) => (l.id === id ? updated : l)));
    } catch {
      toast.error("Failed to save");
    }
  }, []);

  const removeLabel = useCallback(async (id: string) => {
    try {
      const db = await getDB();
      await db.delete("kanban_labels", id);
      setLabels((prev) => prev.filter((l) => l.id !== id));
    } catch {
      toast.error("Failed to save");
    }
  }, []);

  return { labels, createLabel, updateLabel, removeLabel };
}
