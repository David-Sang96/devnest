import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseBackup, exportAllData, importData, downloadBackup } from "@/lib/backup";
import type { BackupData } from "@/lib/backup";
import type { Note } from "@/types/notes";
import type { KanbanBoard, KanbanLabel } from "@/types/kanban";

// ─── DB mock ────────────────────────────────────────────────────────────────

const mockStore = {
  clear: vi.fn(),
  put: vi.fn(),
};

const mockTx = {
  objectStore: vi.fn(() => mockStore),
  done: Promise.resolve(),
};

const mockDB = {
  getAll: vi.fn(),
  transaction: vi.fn(() => mockTx),
};

vi.mock("@/lib/db", () => ({
  getDB: () => Promise.resolve(mockDB),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const EMPTY_BACKUP: BackupData = {
  version: 2,
  exportedAt: 1_000_000,
  notes: [],
  kanban_boards: [],
  kanban_columns: [],
  kanban_cards: [],
  kanban_labels: [],
};

const NOTE: Note = {
  id: "n1",
  title: "Hello",
  content: "Hello\nworld",
  createdAt: 1,
  updatedAt: 2,
};

const BOARD: KanbanBoard = {
  id: "b1",
  title: "Project",
  columnOrder: [],
  createdAt: 1,
  updatedAt: 2,
};

// ─── parseBackup ─────────────────────────────────────────────────────────────

describe("parseBackup()", () => {
  it("accepts a valid backup JSON string", () => {
    expect(parseBackup(JSON.stringify(EMPTY_BACKUP))).not.toBeNull();
  });

  it("returns the parsed backup with correct version", () => {
    const result = parseBackup(JSON.stringify(EMPTY_BACKUP));
    expect(result?.version).toBe(2);
  });

  it("preserves notes data", () => {
    const backup: BackupData = { ...EMPTY_BACKUP, notes: [NOTE] };
    const result = parseBackup(JSON.stringify(backup));
    expect(result?.notes).toHaveLength(1);
    expect(result?.notes[0].title).toBe("Hello");
  });

  it("preserves kanban_boards data", () => {
    const backup: BackupData = { ...EMPTY_BACKUP, kanban_boards: [BOARD] };
    const result = parseBackup(JSON.stringify(backup));
    expect(result?.kanban_boards[0].id).toBe("b1");
  });

  it("returns null for invalid JSON syntax", () => {
    expect(parseBackup("{broken")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseBackup("")).toBeNull();
  });

  it("accepts v1 backups and normalizes them to version 2 with empty kanban_labels", () => {
    const v1 = { version: 1, exportedAt: 1_000_000, notes: [], kanban_boards: [], kanban_columns: [], kanban_cards: [] };
    const result = parseBackup(JSON.stringify(v1));
    expect(result).not.toBeNull();
    expect(result?.version).toBe(2);
    expect(result?.kanban_labels).toEqual([]);
  });

  it("returns null when version is not 1 or 2", () => {
    const bad = { ...EMPTY_BACKUP, version: 3 };
    expect(parseBackup(JSON.stringify(bad))).toBeNull();
  });

  it("returns null when version key is missing", () => {
    const bad = Object.fromEntries(Object.entries(EMPTY_BACKUP).filter(([k]) => k !== "version"));
    expect(parseBackup(JSON.stringify(bad))).toBeNull();
  });

  it("returns null when notes is not an array", () => {
    const bad = { ...EMPTY_BACKUP, notes: null };
    expect(parseBackup(JSON.stringify(bad))).toBeNull();
  });

  it("returns null when kanban_boards is not an array", () => {
    const bad = { ...EMPTY_BACKUP, kanban_boards: {} };
    expect(parseBackup(JSON.stringify(bad))).toBeNull();
  });

  it("returns null when kanban_columns is not an array", () => {
    const bad = { ...EMPTY_BACKUP, kanban_columns: "oops" };
    expect(parseBackup(JSON.stringify(bad))).toBeNull();
  });

  it("returns null when kanban_cards is not an array", () => {
    const bad = { ...EMPTY_BACKUP, kanban_cards: 42 };
    expect(parseBackup(JSON.stringify(bad))).toBeNull();
  });

  it("returns null when kanban_labels is not an array", () => {
    const bad = { ...EMPTY_BACKUP, kanban_labels: {} };
    expect(parseBackup(JSON.stringify(bad))).toBeNull();
  });
});

// ─── exportAllData ───────────────────────────────────────────────────────────

describe("exportAllData()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a BackupData with version 2", async () => {
    mockDB.getAll.mockResolvedValue([]);
    const result = await exportAllData();
    expect(result.version).toBe(2);
  });

  it("sets exportedAt to approximately now", async () => {
    mockDB.getAll.mockResolvedValue([]);
    const before = Date.now();
    const result = await exportAllData();
    const after = Date.now();
    expect(result.exportedAt).toBeGreaterThanOrEqual(before);
    expect(result.exportedAt).toBeLessThanOrEqual(after);
  });

  it("reads from all five stores and includes the data", async () => {
    mockDB.getAll
      .mockResolvedValueOnce([NOTE])          // notes
      .mockResolvedValueOnce([BOARD])         // kanban_boards
      .mockResolvedValueOnce([])              // kanban_columns
      .mockResolvedValueOnce([])              // kanban_cards
      .mockResolvedValueOnce([]);             // kanban_labels

    const result = await exportAllData();
    expect(result.notes).toHaveLength(1);
    expect(result.kanban_boards).toHaveLength(1);
    expect(result.kanban_columns).toHaveLength(0);
    expect(result.kanban_cards).toHaveLength(0);
    expect(result.kanban_labels).toHaveLength(0);
  });

  it("returns empty arrays when stores are empty", async () => {
    mockDB.getAll.mockResolvedValue([]);
    const result = await exportAllData();
    expect(result.notes).toEqual([]);
    expect(result.kanban_boards).toEqual([]);
    expect(result.kanban_columns).toEqual([]);
    expect(result.kanban_cards).toEqual([]);
    expect(result.kanban_labels).toEqual([]);
  });
});

// ─── importData ──────────────────────────────────────────────────────────────

describe("importData()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear.mockResolvedValue(undefined);
    mockStore.put.mockResolvedValue(undefined);
    mockTx.done = Promise.resolve();
  });

  it("clears all five stores before writing", async () => {
    const backup: BackupData = { ...EMPTY_BACKUP, notes: [NOTE] };
    await importData(backup);
    expect(mockStore.clear).toHaveBeenCalledTimes(5);
  });

  it("writes each note record into the store", async () => {
    const backup: BackupData = { ...EMPTY_BACKUP, notes: [NOTE] };
    await importData(backup);
    expect(mockStore.put).toHaveBeenCalledWith(NOTE);
  });

  it("writes each board record into the store", async () => {
    const backup: BackupData = { ...EMPTY_BACKUP, kanban_boards: [BOARD] };
    await importData(backup);
    expect(mockStore.put).toHaveBeenCalledWith(BOARD);
  });

  it("writes each label record into the store", async () => {
    const label: KanbanLabel = {
      id: "l1",
      boardId: "b1",
      name: "Bug",
      color: "#ff0000",
      createdAt: 1,
    };
    const backup: BackupData = { ...EMPTY_BACKUP, kanban_labels: [label] };
    await importData(backup);
    expect(mockStore.put).toHaveBeenCalledWith(label);
  });

  it("completes without throwing for an empty backup", async () => {
    await expect(importData(EMPTY_BACKUP)).resolves.toBeUndefined();
  });
});

// ─── downloadBackup ──────────────────────────────────────────────────────────

describe("downloadBackup()", () => {
  it("triggers a download with a timestamped filename", () => {
    const clickSpy = vi.fn();
    const anchor = { href: "", download: "", click: clickSpy } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValueOnce(anchor);

    const createObjectURL = vi.fn(() => "blob:fake");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    downloadBackup(EMPTY_BACKUP);

    expect(anchor.download).toMatch(/^devnest-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });
});
