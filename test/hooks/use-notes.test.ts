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

  // ── removeNote ─────────────────────────────────────────────────────────────

  it("removeNote() removes the note from state", async () => {
    const note = makeNote({ id: "n1" });
    seedStore([note]);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toHaveLength(1));

    await act(async () => {
      await result.current.removeNote("n1");
    });

    expect(result.current.notes).toHaveLength(0);
  });

  it("removeNote() deletes from the mock DB", async () => {
    const note = makeNote({ id: "n1" });
    seedStore([note]);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.notes).toHaveLength(1));

    await act(async () => {
      await result.current.removeNote("n1");
    });

    expect(mockDB.delete).toHaveBeenCalledWith("notes", "n1");
  });

  it("removeNote() only removes the targeted note", async () => {
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
  });
});
