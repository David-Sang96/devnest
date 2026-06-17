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
    ...overrides,
  };
}

describe("<NoteListItem />", () => {
  it("renders the note title", () => {
    render(
      <NoteListItem
        note={makeNote()}
        selected={false}
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByText("My Note")).toBeInTheDocument();
  });

  it("renders a preview from the second line of content", () => {
    render(
      <NoteListItem
        note={makeNote({ content: "Title line\nPreview text here" })}
        selected={false}
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByText("Preview text here")).toBeInTheDocument();
  });

  it("renders the formatted date when there is no body content", () => {
    const note = makeNote({ content: "Title only", updatedAt: new Date("2024-01-15").getTime() });
    render(
      <NoteListItem note={note} selected={false} onSelect={() => {}} onDelete={() => {}} />
    );
    // Date is formatted with toLocaleDateString so check it's rendered
    const formatted = new Date(note.updatedAt).toLocaleDateString();
    expect(screen.getByText(formatted)).toBeInTheDocument();
  });

  it("calls onSelect when the item is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <NoteListItem
        note={makeNote()}
        selected={false}
        onSelect={onSelect}
        onDelete={() => {}}
      />
    );
    await userEvent.click(screen.getByText("My Note"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("calls onDelete when the delete button is clicked", async () => {
    const onDelete = vi.fn();
    render(
      <NoteListItem
        note={makeNote()}
        selected={false}
        onSelect={() => {}}
        onDelete={onDelete}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /delete note/i }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("does NOT call onSelect when the delete button is clicked", async () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    render(
      <NoteListItem
        note={makeNote()}
        selected={false}
        onSelect={onSelect}
        onDelete={onDelete}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /delete note/i }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("applies selected styling when selected=true", () => {
    const { container } = render(
      <NoteListItem
        note={makeNote()}
        selected={true}
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );
    // Selected item gets bg-primary class
    expect(container.firstChild).toHaveClass("bg-primary");
  });

  it("does not apply bg-primary when selected=false", () => {
    const { container } = render(
      <NoteListItem
        note={makeNote()}
        selected={false}
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );
    expect(container.firstChild).not.toHaveClass("bg-primary");
  });
});
