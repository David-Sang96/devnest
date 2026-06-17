import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteToolbar } from "@/components/notes/note-toolbar";

function makeMockEditor(activeOverrides: Record<string, boolean> = {}) {
  const chainable = {
    focus: vi.fn().mockReturnThis(),
    toggleBold: vi.fn().mockReturnThis(),
    toggleItalic: vi.fn().mockReturnThis(),
    toggleUnderline: vi.fn().mockReturnThis(),
    toggleStrike: vi.fn().mockReturnThis(),
    toggleCode: vi.fn().mockReturnThis(),
    toggleCodeBlock: vi.fn().mockReturnThis(),
    toggleBlockquote: vi.fn().mockReturnThis(),
    toggleBulletList: vi.fn().mockReturnThis(),
    toggleOrderedList: vi.fn().mockReturnThis(),
    toggleHeading: vi.fn().mockReturnThis(),
    setHorizontalRule: vi.fn().mockReturnThis(),
    run: vi.fn().mockReturnValue(true),
  };

  return {
    isActive: vi.fn((name: string, opts?: object) => {
      const key = opts ? `${name}-${JSON.stringify(opts)}` : name;
      return activeOverrides[key] ?? false;
    }),
    chain: vi.fn(() => chainable),
    _chainable: chainable,
  };
}

describe("<NoteToolbar />", () => {
  it("renders null when editor is null", () => {
    const { container } = render(<NoteToolbar editor={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders all formatting buttons", () => {
    const editor = makeMockEditor();
    render(<NoteToolbar editor={editor as never} />);
    expect(screen.getByRole("button", { name: /bold/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /italic/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /underline/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /strikethrough/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /inline code/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bullet list/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ordered list/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /blockquote/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /code block/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /heading 1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /heading 2/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /heading 3/i })).toBeInTheDocument();
  });

  it("clicking Bold calls editor.chain().focus().toggleBold().run()", async () => {
    const editor = makeMockEditor();
    render(<NoteToolbar editor={editor as never} />);
    await userEvent.click(screen.getByRole("button", { name: /bold/i }));
    expect(editor.chain).toHaveBeenCalled();
    expect(editor._chainable.toggleBold).toHaveBeenCalled();
    expect(editor._chainable.run).toHaveBeenCalled();
  });

  it("clicking H1 calls toggleHeading({ level: 1 })", async () => {
    const editor = makeMockEditor();
    render(<NoteToolbar editor={editor as never} />);
    await userEvent.click(screen.getByRole("button", { name: /heading 1/i }));
    expect(editor._chainable.toggleHeading).toHaveBeenCalledWith({ level: 1 });
  });

  it("active Bold button has primary styles", () => {
    const editor = makeMockEditor({ bold: true });
    render(<NoteToolbar editor={editor as never} />);
    const boldBtn = screen.getByRole("button", { name: /bold/i });
    expect(boldBtn.className).toMatch(/bg-primary/);
  });
});
