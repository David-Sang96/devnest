import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteBubbleMenu } from "@/components/notes/note-bubble-menu";

function makeMockEditor(overrides: { isActive?: Record<string, boolean>; linkHref?: string } = {}) {
  const chainable = {
    focus: vi.fn().mockReturnThis(),
    toggleBold: vi.fn().mockReturnThis(),
    toggleItalic: vi.fn().mockReturnThis(),
    toggleUnderline: vi.fn().mockReturnThis(),
    toggleStrike: vi.fn().mockReturnThis(),
    toggleCode: vi.fn().mockReturnThis(),
    setLink: vi.fn().mockReturnThis(),
    unsetLink: vi.fn().mockReturnThis(),
    run: vi.fn().mockReturnValue(true),
  };
  return {
    isActive: vi.fn((name: string) => overrides.isActive?.[name] ?? false),
    getAttributes: vi.fn(() => ({ href: overrides.linkHref ?? "" })),
    chain: vi.fn(() => chainable),
    _chainable: chainable,
  };
}

describe("<NoteBubbleMenu />", () => {
  it("renders null when editor is null", () => {
    const { container } = render(<NoteBubbleMenu editor={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders inline format buttons", () => {
    const editor = makeMockEditor();
    render(<NoteBubbleMenu editor={editor as never} />);
    expect(screen.getByRole("button", { name: /bold/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /italic/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /underline/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /strike/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /code/i })).toBeInTheDocument();
  });

  it("shows Add link button when not in a link", () => {
    const editor = makeMockEditor();
    render(<NoteBubbleMenu editor={editor as never} />);
    expect(screen.getByRole("button", { name: /add link/i })).toBeInTheDocument();
  });

  it("shows Remove link button when inside a link", () => {
    const editor = makeMockEditor({ isActive: { link: true } });
    render(<NoteBubbleMenu editor={editor as never} />);
    expect(screen.getByRole("button", { name: /remove link/i })).toBeInTheDocument();
  });

  it("clicking Add link shows URL input", async () => {
    const editor = makeMockEditor();
    render(<NoteBubbleMenu editor={editor as never} />);
    await userEvent.click(screen.getByRole("button", { name: /add link/i }));
    expect(screen.getByPlaceholderText("https://...")).toBeInTheDocument();
  });

  it("typing URL and pressing Enter calls setLink", async () => {
    const editor = makeMockEditor();
    render(<NoteBubbleMenu editor={editor as never} />);
    await userEvent.click(screen.getByRole("button", { name: /add link/i }));
    await userEvent.type(screen.getByPlaceholderText("https://..."), "https://example.com{Enter}");
    expect(editor._chainable.setLink).toHaveBeenCalledWith({ href: "https://example.com" });
  });

  it("Escape in link input cancels without calling setLink", async () => {
    const editor = makeMockEditor();
    render(<NoteBubbleMenu editor={editor as never} />);
    await userEvent.click(screen.getByRole("button", { name: /add link/i }));
    await userEvent.type(screen.getByPlaceholderText("https://..."), "https://x{Escape}");
    expect(editor._chainable.setLink).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText("https://...")).not.toBeInTheDocument();
  });

  it("clicking Remove link calls unsetLink", async () => {
    const editor = makeMockEditor({ isActive: { link: true } });
    render(<NoteBubbleMenu editor={editor as never} />);
    await userEvent.click(screen.getByRole("button", { name: /remove link/i }));
    expect(editor._chainable.unsetLink).toHaveBeenCalled();
  });
});
