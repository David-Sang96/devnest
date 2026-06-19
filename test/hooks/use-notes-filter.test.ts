import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNotesFilter } from "@/hooks/use-notes-filter";
import type { Note } from "@/types/notes";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: crypto.randomUUID(),
    title: "Untitled",
    content: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pinned: false,
    ...overrides,
  };
}

const DAY = 86_400_000;

describe("useNotesFilter()", () => {
  // ── defaults ──────────────────────────────────────────────────────────────

  it("returns all notes unchanged with default filters", () => {
    const notes = [makeNote({ title: "A" }), makeNote({ title: "B" })];
    const { result } = renderHook(() => useNotesFilter(notes));
    expect(result.current.filteredNotes).toHaveLength(2);
  });

  it("hasActiveFilters is false by default", () => {
    const { result } = renderHook(() => useNotesFilter([]));
    expect(result.current.hasActiveFilters).toBe(false);
  });

  // ── search ────────────────────────────────────────────────────────────────

  it("filters by title (case-insensitive) after debounce", async () => {
    vi.useFakeTimers();
    const notes = [
      makeNote({ title: "Meeting notes" }),
      makeNote({ title: "Shopping list" }),
    ];
    const { result } = renderHook(() => useNotesFilter(notes));

    act(() => { result.current.setSearchQuery("meeting"); });
    act(() => { vi.advanceTimersByTime(200); });

    expect(result.current.filteredNotes).toHaveLength(1);
    expect(result.current.filteredNotes[0].title).toBe("Meeting notes");
    vi.useRealTimers();
  });

  it("filters by plain-text content after debounce", async () => {
    vi.useFakeTimers();
    const notes = [
      makeNote({ title: "A", content: "A\nThis has the keyword alpha" }),
      makeNote({ title: "B", content: "B\nNothing relevant" }),
    ];
    const { result } = renderHook(() => useNotesFilter(notes));

    act(() => { result.current.setSearchQuery("alpha"); });
    act(() => { vi.advanceTimersByTime(200); });

    expect(result.current.filteredNotes).toHaveLength(1);
    expect(result.current.filteredNotes[0].title).toBe("A");
    vi.useRealTimers();
  });

  it("search does not filter before debounce fires (150ms)", () => {
    vi.useFakeTimers();
    const notes = [makeNote({ title: "Alpha" }), makeNote({ title: "Beta" })];
    const { result } = renderHook(() => useNotesFilter(notes));

    act(() => {
      result.current.setSearchQuery("alpha");
      vi.advanceTimersByTime(100); // not yet
    });

    expect(result.current.filteredNotes).toHaveLength(2);
    vi.useRealTimers();
  });

  it("hasActiveFilters is true when search is non-empty", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useNotesFilter([]));
    act(() => { result.current.setSearchQuery("hello"); });
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current.hasActiveFilters).toBe(true);
    vi.useRealTimers();
  });

  // ── sort ──────────────────────────────────────────────────────────────────

  it("sortOrder updatedAt sorts descending by updatedAt (default)", () => {
    const notes = [
      makeNote({ id: "old", updatedAt: 100 }),
      makeNote({ id: "new", updatedAt: 200 }),
    ];
    const { result } = renderHook(() => useNotesFilter(notes));
    expect(result.current.filteredNotes[0].id).toBe("new");
    expect(result.current.filteredNotes[1].id).toBe("old");
  });

  it("sortOrder createdAt sorts descending by createdAt", () => {
    const notes = [
      makeNote({ id: "first", createdAt: 100, updatedAt: 999 }),
      makeNote({ id: "second", createdAt: 200, updatedAt: 1 }),
    ];
    const { result } = renderHook(() => useNotesFilter(notes));
    act(() => result.current.setSortOrder("createdAt"));
    expect(result.current.filteredNotes[0].id).toBe("second");
    expect(result.current.filteredNotes[1].id).toBe("first");
  });

  it("sortOrder title sorts ascending A–Z", () => {
    const notes = [
      makeNote({ id: "z", title: "Zebra" }),
      makeNote({ id: "a", title: "Apple" }),
    ];
    const { result } = renderHook(() => useNotesFilter(notes));
    act(() => result.current.setSortOrder("title"));
    expect(result.current.filteredNotes[0].id).toBe("a");
    expect(result.current.filteredNotes[1].id).toBe("z");
  });

  it("hasActiveFilters is true when sortOrder is not updatedAt", () => {
    const { result } = renderHook(() => useNotesFilter([]));
    act(() => result.current.setSortOrder("title"));
    expect(result.current.hasActiveFilters).toBe(true);
  });

  // ── date filter ───────────────────────────────────────────────────────────

  it("dateFilter today shows only notes updated today", () => {
    const todayNote = makeNote({ updatedAt: Date.now() });
    const oldNote = makeNote({ updatedAt: Date.now() - 3 * DAY });
    const { result } = renderHook(() => useNotesFilter([todayNote, oldNote]));
    act(() => result.current.setDateFilter("today"));
    expect(result.current.filteredNotes).toHaveLength(1);
    expect(result.current.filteredNotes[0].id).toBe(todayNote.id);
  });

  it("dateFilter week shows notes within the last 7 days", () => {
    const recentNote = makeNote({ updatedAt: Date.now() - 3 * DAY });
    const oldNote = makeNote({ updatedAt: Date.now() - 10 * DAY });
    const { result } = renderHook(() => useNotesFilter([recentNote, oldNote]));
    act(() => result.current.setDateFilter("week"));
    expect(result.current.filteredNotes).toHaveLength(1);
    expect(result.current.filteredNotes[0].id).toBe(recentNote.id);
  });

  it("dateFilter month shows notes within the last 30 days", () => {
    const recentNote = makeNote({ updatedAt: Date.now() - 15 * DAY });
    const oldNote = makeNote({ updatedAt: Date.now() - 45 * DAY });
    const { result } = renderHook(() => useNotesFilter([recentNote, oldNote]));
    act(() => result.current.setDateFilter("month"));
    expect(result.current.filteredNotes).toHaveLength(1);
    expect(result.current.filteredNotes[0].id).toBe(recentNote.id);
  });

  it("hasActiveFilters is true when dateFilter is not all", () => {
    const { result } = renderHook(() => useNotesFilter([]));
    act(() => result.current.setDateFilter("week"));
    expect(result.current.hasActiveFilters).toBe(true);
  });

  // ── pin filter ────────────────────────────────────────────────────────────

  it("showPinnedOnly filters to only pinned notes", () => {
    const pinned = makeNote({ id: "p", pinned: true });
    const normal = makeNote({ id: "n", pinned: false });
    const { result } = renderHook(() => useNotesFilter([pinned, normal]));
    act(() => result.current.setShowPinnedOnly(true));
    expect(result.current.filteredNotes).toHaveLength(1);
    expect(result.current.filteredNotes[0].id).toBe("p");
  });

  it("hasActiveFilters is true when showPinnedOnly is true", () => {
    const { result } = renderHook(() => useNotesFilter([]));
    act(() => result.current.setShowPinnedOnly(true));
    expect(result.current.hasActiveFilters).toBe(true);
  });

  // ── pin floating ──────────────────────────────────────────────────────────

  it("pinned notes float to the top within sorted results", () => {
    const normal = makeNote({ id: "normal", pinned: false, updatedAt: 200 });
    const pinned = makeNote({ id: "pinned", pinned: true, updatedAt: 100 });
    const { result } = renderHook(() => useNotesFilter([normal, pinned]));
    // normal has higher updatedAt but pinned should be first
    expect(result.current.filteredNotes[0].id).toBe("pinned");
    expect(result.current.filteredNotes[1].id).toBe("normal");
  });

  // ── clearFilters ──────────────────────────────────────────────────────────

  it("clearFilters resets all state to defaults", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useNotesFilter([]));

    act(() => {
      result.current.setSearchQuery("hello");
      result.current.setSortOrder("title");
      result.current.setDateFilter("week");
      result.current.setShowPinnedOnly(true);
      vi.advanceTimersByTime(200);
    });

    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.clearFilters());

    expect(result.current.searchQuery).toBe("");
    expect(result.current.sortOrder).toBe("updatedAt");
    expect(result.current.dateFilter).toBe("all");
    expect(result.current.showPinnedOnly).toBe(false);
    expect(result.current.hasActiveFilters).toBe(false);
    vi.useRealTimers();
  });
});
