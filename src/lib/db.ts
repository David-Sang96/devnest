import { openDB as idbOpenDB, type IDBPDatabase } from "idb";
import type { Note } from "@/types/notes";
import type { KanbanBoard, KanbanColumn, KanbanCard } from "@/types/kanban";

const DB_NAME = "developer-workspace";
const DB_VERSION = 1;

interface DevNestDB {
  notes: {
    key: string;
    value: Note;
    indexes: { updatedAt: number };
  };
  kanban_boards: {
    key: string;
    value: KanbanBoard;
  };
  kanban_columns: {
    key: string;
    value: KanbanColumn;
    indexes: { boardId: string };
  };
  kanban_cards: {
    key: string;
    value: KanbanCard;
    indexes: { columnId: string; boardId: string };
  };
}

let dbPromise: Promise<IDBPDatabase<DevNestDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<DevNestDB>> {
  if (!dbPromise) {
    dbPromise = idbOpenDB<DevNestDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const notesStore = db.createObjectStore("notes", { keyPath: "id" });
        notesStore.createIndex("updatedAt", "updatedAt");

        db.createObjectStore("kanban_boards", { keyPath: "id" });

        const columnsStore = db.createObjectStore("kanban_columns", {
          keyPath: "id",
        });
        columnsStore.createIndex("boardId", "boardId");

        const cardsStore = db.createObjectStore("kanban_cards", {
          keyPath: "id",
        });
        cardsStore.createIndex("columnId", "columnId");
        cardsStore.createIndex("boardId", "boardId");
      },
    });
  }
  return dbPromise;
}
