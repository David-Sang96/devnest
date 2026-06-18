import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteListItem } from "@/components/notes/note-list-item";
import type { Note } from "@/types/notes";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    title: "My Note",
    content: "My Note\nFirst line of body",
    createdAt: 1_000_000,
    updatedAt: 1_000_000,
    pinned: false,
    ...overrides,
  };
}

const defaultProps = {
  note: makeNote(),
  selected: false,
  onSelect: () => {},
  onDelete: () => {},
  onTogglePin: () => {},
};

describe("<NoteListItem />", () => {
  it("renders the note title", () => {
    render(<NoteListItem {...defaultProps} />);
    expect(screen.getByText("My Note")).toBeInTheDocument();
  });

  it("renders a preview from plain-text content body", () => {
    render(
      <NoteListItem
        {...defaultProps}
        note={makeNote({ content: "Title line\nPreview text here" })}
      />
    );
    expect(screen.getByText("Preview text here")).toBeInTheDocument();
  });

  it("renders a preview extracted from Tiptap JSON content", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Title" }] },
        { type: "paragraph", content: [{ type: "text", text: "JSON preview text" }] },
      ],
    });
    render(
      <NoteListItem {...defaultProps} note={makeNote({ content: doc })} />
    );
    expect(screen.getByText(/JSON preview text/)).toBeInTheDocument();
  });

  it("renders the formatted date when there is no body content", () => {
    const note = makeNote({ content: "Title only", updatedAt: new Date("2024-01-15").getTime() });
    render(<NoteListItem {...defaultProps} note={note} />);
    const formatted = new Date(note.updatedAt).toLocaleDateString();
    expect(screen.getByText(formatted)).toBeInTheDocument();
  });

  it("calls onSelect when the item is clicked", async () => {
    const onSelect = vi.fn();
    render(<NoteListItem {...defaultProps} onSelect={onSelect} />);
    await userEvent.click(screen.getByText("My Note"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("calls onDelete when the delete button is clicked", async () => {
    const onDelete = vi.fn();
    render(<NoteListItem {...defaultProps} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole("button", { name: /delete note/i }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("does NOT call onSelect when the delete button is clicked", async () => {
    const onSelect = vi.fn();
    render(<NoteListItem {...defaultProps} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /delete note/i }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("applies selected styling when selected=true", () => {
    const { container } = render(<NoteListItem {...defaultProps} selected={true} />);
    expect(container.firstChild).toHaveClass("bg-primary");
  });

  it("does not apply bg-primary when selected=false", () => {
    const { container } = render(<NoteListItem {...defaultProps} selected={false} />);
    expect(container.firstChild).not.toHaveClass("bg-primary");
  });

  // ── pin icon ───────────────────────────────────────────────────────────────

  it("pin button has aria-label 'Pin note' when note is not pinned", () => {
    render(<NoteListItem {...defaultProps} note={makeNote({ pinned: false })} />);
    expect(screen.getByRole("button", { name: /pin note/i })).toBeInTheDocument();
  });

  it("pin button has aria-label 'Unpin note' when note is pinned", () => {
    render(<NoteListItem {...defaultProps} note={makeNote({ pinned: true })} />);
    expect(screen.getByRole("button", { name: /unpin note/i })).toBeInTheDocument();
  });

  it("calls onTogglePin when pin button is clicked", async () => {
    const onTogglePin = vi.fn();
    render(<NoteListItem {...defaultProps} onTogglePin={onTogglePin} />);
    await userEvent.click(screen.getByRole("button", { name: /pin note/i }));
    expect(onTogglePin).toHaveBeenCalledOnce();
  });

  it("does NOT call onSelect when pin button is clicked", async () => {
    const onSelect = vi.fn();
    render(<NoteListItem {...defaultProps} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /pin note/i }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
