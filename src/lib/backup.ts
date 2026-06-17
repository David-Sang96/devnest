import { getDB } from "@/lib/db";
import type { Note } from "@/types/notes";
import type { KanbanBoard, KanbanColumn, KanbanCard } from "@/types/kanban";

export interface BackupData {
  version: 1;
  exportedAt: number;
  notes: Note[];
  kanban_boards: KanbanBoard[];
  kanban_columns: KanbanColumn[];
  kanban_cards: KanbanCard[];
}

export async function exportAllData(): Promise<BackupData> {
  const db = await getDB();
  const [notes, kanban_boards, kanban_columns, kanban_cards] = await Promise.all([
    db.getAll("notes"),
    db.getAll("kanban_boards"),
    db.getAll("kanban_columns"),
    db.getAll("kanban_cards"),
  ]);
  return { version: 1, exportedAt: Date.now(), notes, kanban_boards, kanban_columns, kanban_cards };
}

export function downloadBackup(data: BackupData): void {
  const date = new Date(data.exportedAt).toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `devnest-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseBackup(json: string): BackupData | null {
  try {
    const data = JSON.parse(json);
    if (data?.version !== 1) return null;
    if (!Array.isArray(data.notes)) return null;
    if (!Array.isArray(data.kanban_boards)) return null;
    if (!Array.isArray(data.kanban_columns)) return null;
    if (!Array.isArray(data.kanban_cards)) return null;
    return data as BackupData;
  } catch {
    return null;
  }
}

export async function importData(data: BackupData): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ["notes", "kanban_boards", "kanban_columns", "kanban_cards"],
    "readwrite"
  );
  await Promise.all([
    tx.objectStore("notes").clear(),
    tx.objectStore("kanban_boards").clear(),
    tx.objectStore("kanban_columns").clear(),
    tx.objectStore("kanban_cards").clear(),
  ]);
  await Promise.all([
    ...data.notes.map((n) => tx.objectStore("notes").put(n)),
    ...data.kanban_boards.map((b) => tx.objectStore("kanban_boards").put(b)),
    ...data.kanban_columns.map((c) => tx.objectStore("kanban_columns").put(c)),
    ...data.kanban_cards.map((c) => tx.objectStore("kanban_cards").put(c)),
  ]);
  await tx.done;
}
