import { getDB } from "@/lib/db";
import type { Note } from "@/types/notes";
import type { KanbanBoard, KanbanColumn, KanbanCard, KanbanLabel } from "@/types/kanban";

export interface BackupData {
  version: 2;
  exportedAt: number;
  notes: Note[];
  kanban_boards: KanbanBoard[];
  kanban_columns: KanbanColumn[];
  kanban_cards: KanbanCard[];
  kanban_labels: KanbanLabel[];
}

export async function exportAllData(): Promise<BackupData> {
  const db = await getDB();
  const [notes, kanban_boards, kanban_columns, kanban_cards, kanban_labels] =
    await Promise.all([
      db.getAll("notes"),
      db.getAll("kanban_boards"),
      db.getAll("kanban_columns"),
      db.getAll("kanban_cards"),
      db.getAll("kanban_labels"),
    ]);
  return {
    version: 2,
    exportedAt: Date.now(),
    notes,
    kanban_boards,
    kanban_columns,
    kanban_cards,
    kanban_labels,
  };
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
    if (data?.version !== 2) return null;
    if (!Array.isArray(data.notes)) return null;
    if (!Array.isArray(data.kanban_boards)) return null;
    if (!Array.isArray(data.kanban_columns)) return null;
    if (!Array.isArray(data.kanban_cards)) return null;
    if (!Array.isArray(data.kanban_labels)) return null;
    return data as BackupData;
  } catch {
    return null;
  }
}

export async function importData(data: BackupData): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ["notes", "kanban_boards", "kanban_columns", "kanban_cards", "kanban_labels"],
    "readwrite"
  );
  await Promise.all([
    tx.objectStore("notes").clear(),
    tx.objectStore("kanban_boards").clear(),
    tx.objectStore("kanban_columns").clear(),
    tx.objectStore("kanban_cards").clear(),
    tx.objectStore("kanban_labels").clear(),
  ]);
  await Promise.all([
    ...data.notes.map((n) => tx.objectStore("notes").put(n)),
    ...data.kanban_boards.map((b) => tx.objectStore("kanban_boards").put(b)),
    ...data.kanban_columns.map((c) => tx.objectStore("kanban_columns").put(c)),
    ...data.kanban_cards.map((c) => tx.objectStore("kanban_cards").put(c)),
    ...data.kanban_labels.map((l) => tx.objectStore("kanban_labels").put(l)),
  ]);
  await tx.done;
}
