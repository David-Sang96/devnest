import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import NotesPage from "@/app/(workspace)/notes/page";
import type { Note } from "@/types/notes";
import type { SortOrder, DateFilter } from "@/types/notes";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockCreateNote = vi.fn().mockResolvedValue({ id: "new-note-id" } as Note);
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/hooks/use-notes", () => ({
  useNotes: () => ({
    notes: [],
    trashedNotes: [],
    isLoading: false,
    createNote: mockCreateNote,
    updateNote: vi.fn(),
    removeNote: vi.fn(),
    restoreFromTrash: vi.fn(),
    permanentlyDelete: vi.fn(),
    emptyTrash: vi.fn(),
    togglePin: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-notes-filter", () => ({
  useNotesFilter: () => ({
    filteredNotes: [],
    searchQuery: "",
    setSearchQuery: vi.fn(),
    sortOrder: "updatedAt" as SortOrder,
    setSortOrder: vi.fn(),
    dateFilter: "all" as DateFilter,
    setDateFilter: vi.fn(),
    showPinnedOnly: false,
    setShowPinnedOnly: vi.fn(),
    hasActiveFilters: false,
    clearFilters: vi.fn(),
  }),
}));

vi.mock("@/components/notes/note-list", () => ({
  NoteList: () => <div data-testid="note-list" />,
}));

vi.mock("@/components/notes/note-editor", () => ({
  NoteEditor: () => <div data-testid="note-editor" />,
}));

vi.mock("@/components/notes/note-empty-state", () => ({
  NoteEmptyState: () => <div data-testid="note-empty-state" />,
}));

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("location", { search: "" });
});

describe("NotesPage — ?new=1 param", () => {
  it("calls createNote and router.replace('/notes') when ?new=1 is present", async () => {
    vi.stubGlobal("location", { search: "?new=1" });
    render(<NotesPage />);
    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalled();
    });
    expect(mockReplace).toHaveBeenCalledWith("/notes");
  });

  it("does not call createNote when ?new=1 is absent", async () => {
    render(<NotesPage />);
    // Wait a tick to allow any effects to fire
    await waitFor(() => {}, { timeout: 50 });
    expect(mockCreateNote).not.toHaveBeenCalled();
  });
});
