import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import NotesPage from "@/app/(workspace)/notes/page";
import type { Note } from "@/types/notes";
import type { SortOrder, DateFilter } from "@/types/notes";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockCreateNote = vi.fn().mockResolvedValue({ id: "new-note-id" } as Note);

let newParamValue: string | null = null;

// mockReplace simulates real router: when navigating to /notes (no ?new=1),
// clear the param so the effect doesn't re-trigger on subsequent renders.
const mockReplace = vi.fn((url: string) => {
  if (url === "/notes") newParamValue = null;
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => ({ get: (key: string) => key === "new" ? newParamValue : null }),
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
  newParamValue = null;
  // Restore mockReplace's side-effect behaviour after clearAllMocks resets the impl
  mockReplace.mockImplementation((url: string) => {
    if (url === "/notes") newParamValue = null;
  });
});

describe("NotesPage — ?new=1 param", () => {
  it("calls createNote and router.replace('/notes') when ?new=1 is present", async () => {
    newParamValue = "1";
    render(<NotesPage />);
    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalled();
    });
    expect(mockReplace).toHaveBeenCalledWith("/notes");
  });

  it("does not call createNote when ?new=1 is absent", async () => {
    newParamValue = null;
    render(<NotesPage />);
    // Wait a tick to allow any effects to fire
    await waitFor(() => {}, { timeout: 50 });
    expect(mockCreateNote).not.toHaveBeenCalled();
  });

  it("calls createNote when ?new=1 appears on already-mounted page (re-render)", async () => {
    newParamValue = null;
    const { rerender } = render(<NotesPage />);
    // Confirm param is absent and no note created yet
    await waitFor(() => {}, { timeout: 50 });
    expect(mockCreateNote).not.toHaveBeenCalled();

    // Simulate same-page navigation that adds ?new=1 without remounting
    newParamValue = "1";
    rerender(<NotesPage />);

    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalled();
    });
    expect(mockReplace).toHaveBeenCalledWith("/notes");
  });
});
