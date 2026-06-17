import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteEmptyState } from "@/components/notes/note-empty-state";

describe("<NoteEmptyState />", () => {
  it("renders 'No note selected' heading", () => {
    render(<NoteEmptyState onNew={() => {}} />);
    expect(screen.getByText("No note selected")).toBeInTheDocument();
  });

  it("renders a 'New Note' button", () => {
    render(<NoteEmptyState onNew={() => {}} />);
    expect(screen.getByRole("button", { name: /new note/i })).toBeInTheDocument();
  });

  it("calls onNew when the button is clicked", async () => {
    const onNew = vi.fn();
    render(<NoteEmptyState onNew={onNew} />);
    await userEvent.click(screen.getByRole("button", { name: /new note/i }));
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("renders descriptive hint text", () => {
    render(<NoteEmptyState onNew={() => {}} />);
    expect(screen.getByText(/pick a note/i)).toBeInTheDocument();
  });
});
