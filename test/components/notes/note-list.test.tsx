import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteList } from "@/components/notes/note-list";
import type { Note } from "@/types/notes";
import type { SortOrder, DateFilter } from "@/types/notes";

function makeNote(id: string, title: string): Note {
  return { id, title, content: title, createdAt: 1, updatedAt: 1, pinned: false };
}

const defaultProps = {
  notes: [],
  selectedId: null,
  onSelect: () => {},
  onNew: () => {},
  onDelete: () => {},
  onTogglePin: () => {},
  searchQuery: "",
  onSearchChange: () => {},
  sortOrder: "updatedAt" as SortOrder,
  onSortChange: () => {},
  dateFilter: "all" as DateFilter,
  onDateFilterChange: () => {},
  showPinnedOnly: false,
  onShowPinnedOnlyChange: () => {},
  hasActiveFilters: false,
  onClearFilters: () => {},
};

describe("<NoteList />", () => {
  it("renders the 'Notes' header", () => {
    render(<NoteList {...defaultProps} />);
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  it("shows 'No notes yet' when list is empty and no active filters", () => {
    render(<NoteList {...defaultProps} />);
    expect(screen.getByText("No notes yet")).toBeInTheDocument();
  });

  it("shows 'No notes match your filters' when list is empty and filters are active", () => {
    render(<NoteList {...defaultProps} hasActiveFilters={true} />);
    expect(screen.getByText("No notes match your filters")).toBeInTheDocument();
  });

  it("renders one row per note", () => {
    const notes = [makeNote("1", "Alpha"), makeNote("2", "Beta")];
    render(<NoteList {...defaultProps} notes={notes} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("does not show the empty state when there are notes", () => {
    const notes = [makeNote("1", "Alpha")];
    render(<NoteList {...defaultProps} notes={notes} />);
    expect(screen.queryByText("No notes yet")).not.toBeInTheDocument();
  });

  it("calls onNew when the + button is clicked", async () => {
    const onNew = vi.fn();
    render(<NoteList {...defaultProps} onNew={onNew} />);
    await userEvent.click(screen.getByRole("button", { name: /new note/i }));
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("calls onSelect with the correct note id when a note is clicked", async () => {
    const onSelect = vi.fn();
    const notes = [makeNote("n42", "My Note")];
    render(<NoteList {...defaultProps} notes={notes} onSelect={onSelect} />);
    await userEvent.click(screen.getByText("My Note"));
    expect(onSelect).toHaveBeenCalledWith("n42");
  });

  it("calls onDelete with the correct note id when delete is clicked", async () => {
    const onDelete = vi.fn();
    const notes = [makeNote("n7", "Delete Me")];
    render(<NoteList {...defaultProps} notes={notes} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole("button", { name: /delete note/i }));
    expect(onDelete).toHaveBeenCalledWith("n7");
  });

  it("marks the selected note", () => {
    const notes = [makeNote("n1", "Active"), makeNote("n2", "Inactive")];
    const { container } = render(<NoteList {...defaultProps} notes={notes} selectedId="n1" />);
    expect(container.querySelector(".bg-primary")).toBeInTheDocument();
  });

  // ── search input ──────────────────────────────────────────────────────────

  it("renders the search input with placeholder 'Search notes... (⌘K)'", () => {
    render(<NoteList {...defaultProps} />);
    expect(screen.getByPlaceholderText("Search notes... (⌘K)")).toBeInTheDocument();
  });

  it("search input shows the current searchQuery value", () => {
    render(<NoteList {...defaultProps} searchQuery="hello" />);
    expect(screen.getByDisplayValue("hello")).toBeInTheDocument();
  });

  it("calls onSearchChange when typing in the search input", async () => {
    const onSearchChange = vi.fn();
    render(<NoteList {...defaultProps} onSearchChange={onSearchChange} />);
    await userEvent.type(screen.getByPlaceholderText("Search notes... (⌘K)"), "abc");
    expect(onSearchChange).toHaveBeenCalledWith(expect.stringContaining("a"));
  });

  it("calls onSearchChange('') when Escape is pressed in the search input", async () => {
    const onSearchChange = vi.fn();
    render(<NoteList {...defaultProps} searchQuery="hello" onSearchChange={onSearchChange} />);
    const input = screen.getByPlaceholderText("Search notes... (⌘K)");
    await userEvent.click(input);
    await userEvent.keyboard("{Escape}");
    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  // ── sort dropdown ─────────────────────────────────────────────────────────

  it("renders a sort select with 'Modified' as the default visible option", () => {
    render(<NoteList {...defaultProps} />);
    expect(screen.getByRole("combobox", { name: /sort order/i })).toBeInTheDocument();
  });

  it("calls onSortChange when sort select changes", async () => {
    const onSortChange = vi.fn();
    render(<NoteList {...defaultProps} onSortChange={onSortChange} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /sort order/i }), "title");
    expect(onSortChange).toHaveBeenCalledWith("title");
  });

  // ── date dropdown ─────────────────────────────────────────────────────────

  it("renders a date filter select", () => {
    render(<NoteList {...defaultProps} />);
    expect(screen.getByRole("combobox", { name: /date filter/i })).toBeInTheDocument();
  });

  it("calls onDateFilterChange when date select changes", async () => {
    const onDateFilterChange = vi.fn();
    render(<NoteList {...defaultProps} onDateFilterChange={onDateFilterChange} />);
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /date filter/i }),
      "week"
    );
    expect(onDateFilterChange).toHaveBeenCalledWith("week");
  });

  // ── pin toggle ────────────────────────────────────────────────────────────

  it("renders a pin toggle button", () => {
    render(<NoteList {...defaultProps} />);
    expect(screen.getByRole("button", { name: /show pinned only/i })).toBeInTheDocument();
  });

  it("calls onShowPinnedOnlyChange(true) when pin toggle is clicked while off", async () => {
    const onShowPinnedOnlyChange = vi.fn();
    render(
      <NoteList
        {...defaultProps}
        showPinnedOnly={false}
        onShowPinnedOnlyChange={onShowPinnedOnlyChange}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /show pinned only/i }));
    expect(onShowPinnedOnlyChange).toHaveBeenCalledWith(true);
  });

  it("calls onShowPinnedOnlyChange(false) when pin toggle is clicked while on", async () => {
    const onShowPinnedOnlyChange = vi.fn();
    render(
      <NoteList
        {...defaultProps}
        showPinnedOnly={true}
        onShowPinnedOnlyChange={onShowPinnedOnlyChange}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /show all notes/i }));
    expect(onShowPinnedOnlyChange).toHaveBeenCalledWith(false);
  });

  // ── clear filters ─────────────────────────────────────────────────────────

  it("does not show 'Clear filters' when hasActiveFilters is false", () => {
    render(<NoteList {...defaultProps} hasActiveFilters={false} />);
    expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it("shows 'Clear filters' button when hasActiveFilters is true", () => {
    render(<NoteList {...defaultProps} hasActiveFilters={true} />);
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
  });

  it("calls onClearFilters when 'Clear filters' is clicked", async () => {
    const onClearFilters = vi.fn();
    render(
      <NoteList {...defaultProps} hasActiveFilters={true} onClearFilters={onClearFilters} />
    );
    await userEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });
});
