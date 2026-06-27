import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { act } from "@testing-library/react";
import { NoteEditor } from "@/components/notes/note-editor";
import type { Note } from "@/types/notes";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    title: "My Note",
    content: "",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("<NoteEditor />", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  // ── Structure ─────────────────────────────────────────────────

  it("renders title input with note.title", () => {
    render(<NoteEditor note={makeNote({ title: "My Note" })} onUpdate={vi.fn()} />);
    expect(screen.getByRole("textbox", { name: /note title/i })).toHaveValue("My Note");
  });

  it("title input is empty and shows placeholder for new Untitled note", () => {
    render(<NoteEditor note={makeNote({ title: "Untitled", content: "" })} onUpdate={vi.fn()} />);
    expect(screen.getByRole("textbox", { name: /note title/i })).toHaveValue("");
    expect(screen.getByPlaceholderText("Untitled")).toBeInTheDocument();
  });

  it("renders the EditorContent (editor body)", () => {
    render(<NoteEditor note={makeNote()} onUpdate={vi.fn()} />);
    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  // ── Title debounce ────────────────────────────────────────────

  it("does not call onUpdate immediately when title changes", () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<NoteEditor note={makeNote()} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByRole("textbox", { name: /note title/i }), {
      target: { value: "New Title" },
    });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("calls onUpdate with title after 500ms debounce", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<NoteEditor note={makeNote({ id: "n1" })} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByRole("textbox", { name: /note title/i }), {
      target: { value: "New Title" },
    });
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(onUpdate).toHaveBeenCalledWith("n1", { title: "New Title" });
  });

  it("strips newlines from title input", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<NoteEditor note={makeNote({ id: "n1" })} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByRole("textbox", { name: /note title/i }), {
      target: { value: "Hello\nWorld" },
    });
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(onUpdate).toHaveBeenCalledWith("n1", { title: "HelloWorld" });
  });

  it("does not call onUpdate within the 500ms debounce window", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<NoteEditor note={makeNote()} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByRole("textbox", { name: /note title/i }), {
      target: { value: "Typing" },
    });
    await act(async () => { vi.advanceTimersByTime(499); });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("shows Saved indicator after onUpdate resolves", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<NoteEditor note={makeNote()} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByRole("textbox", { name: /note title/i }), {
      target: { value: "Updated" },
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("hides Saved indicator after 2 seconds", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<NoteEditor note={makeNote()} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByRole("textbox", { name: /note title/i }), {
      target: { value: "Updated" },
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("Saved")).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  // ── onBack ────────────────────────────────────────────────────

  describe("onBack prop", () => {
    it("renders back button when onBack provided", () => {
      render(<NoteEditor note={makeNote()} onUpdate={vi.fn()} onBack={vi.fn()} />);
      expect(screen.getByRole("button", { name: /back to notes list/i })).toBeInTheDocument();
    });

    it("does not render back button when onBack omitted", () => {
      render(<NoteEditor note={makeNote()} onUpdate={vi.fn()} />);
      expect(screen.queryByRole("button", { name: /back to notes list/i })).not.toBeInTheDocument();
    });

    it("calls onBack when back button clicked", () => {
      const onBack = vi.fn();
      render(<NoteEditor note={makeNote()} onUpdate={vi.fn()} onBack={onBack} />);
      fireEvent.click(screen.getByRole("button", { name: /back to notes list/i }));
      expect(onBack).toHaveBeenCalledOnce();
    });
  });

  // ── Word/char count footer ────────────────────────────────────

  it("renders word and char count footer with 0 words · 0 chars for empty note", () => {
    render(<NoteEditor note={makeNote({ content: "" })} onUpdate={vi.fn()} />);
    expect(screen.getByText(/0 words · 0 chars/)).toBeInTheDocument();
  });
});
