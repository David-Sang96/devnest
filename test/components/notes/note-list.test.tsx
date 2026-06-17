import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteList } from "@/components/notes/note-list";
import type { Note } from "@/types/notes";

function makeNote(id: string, title: string): Note {
  return { id, title, content: title, createdAt: 1, updatedAt: 1 };
}

describe("<NoteList />", () => {
  const defaultProps = {
    notes: [],
    selectedId: null,
    onSelect: () => {},
    onNew: () => {},
    onDelete: () => {},
  };

  it("renders the 'Notes' header", () => {
    render(<NoteList {...defaultProps} />);
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  it("shows 'No notes yet' when the list is empty", () => {
    render(<NoteList {...defaultProps} />);
    expect(screen.getByText("No notes yet")).toBeInTheDocument();
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
    // The selected NoteListItem wrapper div gets bg-primary
    expect(container.querySelector(".bg-primary")).toBeInTheDocument();
  });
});
