import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useNotes } from "@/hooks/use-notes";
import type { Note } from "@/types/notes";

// ─── In-memory DB mock ───────────────────────────────────────────────────────

let notesStore = new Map<string, Note>();

const mockDB = {
  getAllFromIndex: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock("@/lib/db", () => ({
  getDB: () => Promise.resolve(mockDB),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeNote(overrides: Partial<Note> = {}): Note {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "Untitled",
    content: "",
    createdAt: now,
    updatedAt: now,
    pinned: false,
    ...overrides,
  };
}

// Seed the in-memory store and configure mock implementations
function seedStore(notes: Note[] = []) {
  notesStore = new Map(notes.map((n) => [n.id, n]));

  mockDB.getAllFromIndex.mockImplementation(() =>
    Promise.resolve(
      [...notesStore.values()].sort((a, b) => a.updatedAt - b.updatedAt)
    )
  );
  mockDB.get.mockImplementation((_store: string, id: string) =>
    Promise.resolve(notesStore.get(id))
  );
  mockDB.put.mockImplementation((_store: string, note: Note) => {
    notesStore.set(note.id, note);
    return Promise.resolve();
  });
  mockDB.delete.mockImplementation((_store: string, id: string) => {
    notesStore.delete(id);
    return Promise.resolve();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  seedStore();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useNotes()", () => {
  it("isLoading is true before IDB resolves, false after", async () => {
    const { result } = renderHook(() => useNotes());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("loads notes from the DB on mount", async () => {
    const note = makeNote({ title: "Hello" });
    seedStore([note]);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toHaveLength(1));
    expect(result.current.notes[0].id).toBe(note.id);
  });

  it("starts with an empty list when the store is empty", async () => {
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toBeDefined());
    expect(result.current.notes).toHaveLength(0);
  });

  // ── createNote ─────────────────────────────────────────────────────────────

  it("createNote() adds a note to the list", async () => {
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toBeDefined());

    await act(async () => {
      await result.current.createNote();
    });

    expect(result.current.notes).toHaveLength(1);
  });

  it("createNote() returns the new note with default title 'Untitled'", async () => {
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toBeDefined());

    let created!: Note;
    await act(async () => {
      created = await result.current.createNote();
    });

    expect(created.title).toBe("Untitled");
    expect(created.content).toBe("");
    expect(created.id).toBeTruthy();
  });

  it("createNote() persists to the mock DB", async () => {
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toBeDefined());

    await act(async () => {
      await result.current.createNote();
    });

    expect(mockDB.put).toHaveBeenCalledWith("notes", expect.objectContaining({ title: "Untitled" }));
  });

  it("createNote() with initial title and content creates note with those values", async () => {
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toBeDefined());

    let created!: Note;
    await act(async () => {
      created = await result.current.createNote({
        title: "Meeting Notes",
        content: '{"type":"doc","content":[]}',
      });
    });

    expect(created.title).toBe("Meeting Notes");
    expect(created.content).toBe('{"type":"doc","content":[]}');
    expect(mockDB.put).toHaveBeenCalledWith(
      "notes",
      expect.objectContaining({ title: "Meeting Notes" })
    );
  });

  it("createNote() multiple times yields multiple notes", async () => {
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toBeDefined());

    await act(async () => {
      await result.current.createNote();
      await result.current.createNote();
    });

    expect(result.current.notes).toHaveLength(2);
  });

  // ── updateNote ─────────────────────────────────────────────────────────────

  it("updateNote() changes the note content and derives the title", async () => {
    const note = makeNote({ id: "n1", updatedAt: 1 });
    seedStore([note]);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toHaveLength(1));

    await act(async () => {
      await result.current.updateNote("n1", { content: "My new title\nsome body" });
    });

    const updated = result.current.notes.find((n) => n.id === "n1");
    expect(updated?.content).toBe("My new title\nsome body");
    expect(updated?.title).toBe("My new title");
  });

  it("updateNote() sets title to 'Untitled' when content is empty", async () => {
    const note = makeNote({ id: "n1", content: "old content", title: "old title" });
    seedStore([note]);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toHaveLength(1));

    await act(async () => {
      await result.current.updateNote("n1", { content: "" });
    });

    const updated = result.current.notes.find((n) => n.id === "n1");
    expect(updated?.title).toBe("Untitled");
  });

  it("updateNote() with explicit title stores that title without re-deriving from content", async () => {
    const note = makeNote({ id: "n1", content: "Old content" });
    seedStore([note]);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toHaveLength(1));

    await act(async () => {
      await result.current.updateNote("n1", { title: "Custom Title" });
    });

    const updated = result.current.notes.find((n) => n.id === "n1");
    expect(updated?.title).toBe("Custom Title");
    expect(updated?.content).toBe("Old content");
  });

  it("updateNote() with JSON content uses extractTitle to set title", async () => {
    const note = makeNote({ id: "n1" });
    seedStore([note]);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toHaveLength(1));

    const doc = JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "JSON Note Title" }] }],
    });

    await act(async () => {
      await result.current.updateNote("n1", { content: doc });
    });

    const updated = result.current.notes.find((n) => n.id === "n1");
    expect(updated?.title).toBe("JSON Note Title");
  });

  it("updateNote() is a no-op for an unknown id", async () => {
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toBeDefined());

    await act(async () => {
      await result.current.updateNote("ghost", { content: "nope" });
    });

    expect(result.current.notes).toHaveLength(0);
  });

  // ── removeNote (soft-delete) ───────────────────────────────────────────────

  it("removeNote() moves the note to trashedNotes, not notes", async () => {
    const note = makeNote({ id: "n1" });
    seedStore([note]);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toHaveLength(1));

    await act(async () => {
      await result.current.removeNote("n1");
    });

    expect(result.current.notes).toHaveLength(0);
    expect(result.current.trashedNotes).toHaveLength(1);
    expect(result.current.trashedNotes[0].id).toBe("n1");
  });

  it("removeNote() sets deletedAt on the note in IDB via put (not delete)", async () => {
    const note = makeNote({ id: "n1" });
    seedStore([note]);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toHaveLength(1));

    await act(async () => {
      await result.current.removeNote("n1");
    });

    expect(mockDB.delete).not.toHaveBeenCalled();
    expect(mockDB.put).toHaveBeenCalledWith(
      "notes",
      expect.objectContaining({ id: "n1", deletedAt: expect.any(Number) })
    );
  });

  it("removeNote() only soft-deletes the targeted note", async () => {
    const n1 = makeNote({ id: "n1", updatedAt: 1 });
    const n2 = makeNote({ id: "n2", updatedAt: 2 });
    seedStore([n1, n2]);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toHaveLength(2));

    await act(async () => {
      await result.current.removeNote("n1");
    });

    expect(result.current.notes).toHaveLength(1);
    expect(result.current.notes[0].id).toBe("n2");
    expect(result.current.trashedNotes).toHaveLength(1);
  });

  // ── togglePin ──────────────────────────────────────────────────────────────

  it("togglePin() sets pinned=true on an unpinned note", async () => {
    const note = makeNote({ id: "n1", pinned: false });
    seedStore([note]);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toHaveLength(1));

    await act(async () => {
      await result.current.togglePin("n1");
    });

    expect(result.current.notes[0].pinned).toBe(true);
  });

  it("togglePin() sets pinned=false on a pinned note", async () => {
    const note = makeNote({ id: "n1", pinned: true });
    seedStore([note]);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toHaveLength(1));

    await act(async () => {
      await result.current.togglePin("n1");
    });

    expect(result.current.notes[0].pinned).toBe(false);
  });

  it("togglePin() persists the change to the mock DB", async () => {
    const note = makeNote({ id: "n1", pinned: false });
    seedStore([note]);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toHaveLength(1));

    await act(async () => {
      await result.current.togglePin("n1");
    });

    expect(mockDB.put).toHaveBeenCalledWith(
      "notes",
      expect.objectContaining({ id: "n1", pinned: true })
    );
  });

  it("togglePin() is a no-op for an unknown id", async () => {
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toBeDefined());

    await act(async () => {
      await result.current.togglePin("ghost");
    });

    expect(result.current.notes).toHaveLength(0);
  });

  // ── restoreFromTrash ───────────────────────────────────────────────────────

  it("restoreFromTrash() moves the note back to active notes", async () => {
    const note = makeNote({ id: "n1", deletedAt: Date.now() - 1000 });
    seedStore([note]);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.trashedNotes).toHaveLength(1);

    await act(async () => {
      await result.current.restoreFromTrash("n1");
    });

    expect(result.current.notes).toHaveLength(1);
    expect(result.current.trashedNotes).toHaveLength(0);
    expect(result.current.notes[0].deletedAt).toBeUndefined();
  });

  it("restoreFromTrash() clears deletedAt in IDB", async () => {
    const note = makeNote({ id: "n1", deletedAt: Date.now() - 1000 });
    seedStore([note]);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.restoreFromTrash("n1");
    });

    expect(mockDB.put).toHaveBeenCalledWith(
      "notes",
      expect.not.objectContaining({ deletedAt: expect.any(Number) })
    );
  });

  // ── permanentlyDelete ──────────────────────────────────────────────────────

  it("permanentlyDelete() removes the note from trashedNotes and from IDB", async () => {
    const note = makeNote({ id: "n1", deletedAt: Date.now() - 1000 });
    seedStore([note]);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.permanentlyDelete("n1");
    });

    expect(result.current.trashedNotes).toHaveLength(0);
    expect(mockDB.delete).toHaveBeenCalledWith("notes", "n1");
  });

  // ── emptyTrash ─────────────────────────────────────────────────────────────

  it("emptyTrash() permanently deletes all trashed notes", async () => {
    const n1 = makeNote({ id: "n1", deletedAt: Date.now() - 100 });
    const n2 = makeNote({ id: "n2", deletedAt: Date.now() - 200 });
    const active = makeNote({ id: "n3" });
    seedStore([n1, n2, active]);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.emptyTrash();
    });

    expect(result.current.trashedNotes).toHaveLength(0);
    expect(result.current.notes).toHaveLength(1);
    expect(mockDB.delete).toHaveBeenCalledWith("notes", "n1");
    expect(mockDB.delete).toHaveBeenCalledWith("notes", "n2");
    expect(mockDB.delete).not.toHaveBeenCalledWith("notes", "n3");
  });

  // ── auto-purge on load ─────────────────────────────────────────────────────

  it("auto-purges notes deleted more than 30 days ago on load", async () => {
    const THIRTY_ONE_DAYS = 31 * 24 * 60 * 60 * 1000;
    const old = makeNote({ id: "old", deletedAt: Date.now() - THIRTY_ONE_DAYS });
    const recent = makeNote({ id: "recent", deletedAt: Date.now() - 1000 });
    seedStore([old, recent]);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockDB.delete).toHaveBeenCalledWith("notes", "old");
    expect(mockDB.delete).not.toHaveBeenCalledWith("notes", "recent");
    expect(result.current.trashedNotes).toHaveLength(1);
    expect(result.current.trashedNotes[0].id).toBe("recent");
  });

  describe("error handling", () => {
    it("shows toast.error when createNote IDB write fails", async () => {
      const { toast } = await import("sonner");
      vi.spyOn(toast, "error");
      mockDB.put.mockRejectedValueOnce(new Error("IDB failure"));
      const { result } = renderHook(() => useNotes());
      await waitFor(() => expect(mockDB.getAllFromIndex).toHaveBeenCalled());
      await act(async () => { await result.current.createNote(); });
      expect(toast.error).toHaveBeenCalledWith("Failed to save");
    });

    it("shows toast.error when removeNote IDB put fails", async () => {
      const note = makeNote({ id: "n1" });
      seedStore([note]);
      const { toast } = await import("sonner");
      vi.spyOn(toast, "error");
      // get fails after put fails — put is called with deletedAt
      mockDB.get.mockResolvedValueOnce(note);
      mockDB.put.mockRejectedValueOnce(new Error("IDB failure"));
      const { result } = renderHook(() => useNotes());
      await waitFor(() => expect(result.current.notes).toHaveLength(1));
      await act(async () => { await result.current.removeNote("n1"); });
      expect(toast.error).toHaveBeenCalledWith("Failed to delete note");
    });

    it("shows toast.error when restoreFromTrash IDB put fails", async () => {
      const note = makeNote({ id: "n1", deletedAt: Date.now() - 1000 });
      seedStore([note]);
      const { toast } = await import("sonner");
      vi.spyOn(toast, "error");
      mockDB.get.mockResolvedValueOnce(note);
      mockDB.put.mockRejectedValueOnce(new Error("IDB failure"));
      const { result } = renderHook(() => useNotes());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => { await result.current.restoreFromTrash("n1"); });
      expect(toast.error).toHaveBeenCalledWith("Failed to restore note");
    });
  });
});
