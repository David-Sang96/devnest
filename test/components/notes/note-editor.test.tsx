import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteEditor } from "@/components/notes/note-editor";
import type { Note } from "@/types/notes";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    title: "My Note",
    content: "My Note\nBody text",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("<NoteEditor />", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("renders a textarea with the note's content", () => {
    render(<NoteEditor note={makeNote()} onUpdate={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue("My Note\nBody text");
  });

  it("derives the title from the first line of content", () => {
    render(<NoteEditor note={makeNote({ content: "Important note\ndetails" })} onUpdate={vi.fn()} />);
    expect(screen.getByText("Important note")).toBeInTheDocument();
  });

  it("falls back to 'Untitled' when content is empty", () => {
    render(<NoteEditor note={makeNote({ content: "" })} onUpdate={vi.fn()} />);
    expect(screen.getByText("Untitled")).toBeInTheDocument();
  });

  it("does NOT call onUpdate immediately after typing (debounced)", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<NoteEditor note={makeNote()} onUpdate={onUpdate} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "New content" } });

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("calls onUpdate after the 500ms debounce fires", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const note = makeNote({ id: "n1" });
    render(<NoteEditor note={note} onUpdate={onUpdate} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "New content" } });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(onUpdate).toHaveBeenCalledWith("n1", { content: "New content" });
  });

  it("does not call onUpdate within the 500ms debounce window", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<NoteEditor note={makeNote()} onUpdate={onUpdate} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Typing…" } });

    // Advance to just before the debounce fires
    await act(async () => { vi.advanceTimersByTime(499); });

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("shows the 'Saved' indicator after onUpdate resolves", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<NoteEditor note={makeNote()} onUpdate={onUpdate} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "updated" } });

    // Advance past debounce, then flush the async onUpdate → setShowSaved(true) chain
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("hides the 'Saved' indicator after 2 seconds", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<NoteEditor note={makeNote()} onUpdate={onUpdate} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "updated" } });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("Saved")).toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("renders a placeholder when the textarea is empty", () => {
    render(<NoteEditor note={makeNote({ content: "" })} onUpdate={vi.fn()} />);
    expect(screen.getByPlaceholderText("Start writing...")).toBeInTheDocument();
  });

  describe("onBack prop", () => {
    it("renders back button when onBack is provided", () => {
      render(<NoteEditor note={makeNote()} onUpdate={vi.fn()} onBack={vi.fn()} />);
      expect(screen.getByRole("button", { name: /back to notes list/i })).toBeInTheDocument();
    });

    it("does not render back button when onBack is omitted", () => {
      render(<NoteEditor note={makeNote()} onUpdate={vi.fn()} />);
      expect(screen.queryByRole("button", { name: /back to notes list list/i })).not.toBeInTheDocument();
    });

    it("calls onBack when back button is clicked", () => {
      const onBack = vi.fn();
      render(<NoteEditor note={makeNote()} onUpdate={vi.fn()} onBack={onBack} />);
      fireEvent.click(screen.getByRole("button", { name: /back to notes list/i }));
      expect(onBack).toHaveBeenCalledOnce();
    });
  });
});
