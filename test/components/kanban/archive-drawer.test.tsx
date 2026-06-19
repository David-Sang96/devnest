import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArchiveDrawer } from "@/components/kanban/archive-drawer";
import type { KanbanCard, KanbanColumn } from "@/types/kanban";

function makeCard(overrides: Partial<KanbanCard> = {}): KanbanCard {
  return {
    id: "c1",
    columnId: "col1",
    boardId: "b1",
    title: "Old task",
    description: "",
    archived: true,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function makeColumn(overrides: Partial<KanbanColumn> = {}): KanbanColumn {
  return {
    id: "col1",
    boardId: "b1",
    title: "To Do",
    cardOrder: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

const defaultProps = {
  cards: [makeCard()],
  columns: [makeColumn()],
  onRestore: vi.fn(),
  onDelete: vi.fn(),
};

describe("<ArchiveDrawer />", () => {
  it("renders nothing when cards array is empty", () => {
    const { container } = render(
      <ArchiveDrawer {...defaultProps} cards={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the archive header with count", () => {
    render(<ArchiveDrawer {...defaultProps} />);
    expect(screen.getByText(/archived \(1\)/i)).toBeInTheDocument();
  });

  it("is collapsed by default — cards not visible", () => {
    render(<ArchiveDrawer {...defaultProps} />);
    expect(screen.queryByText("Old task")).not.toBeInTheDocument();
  });

  it("expands when header is clicked", async () => {
    render(<ArchiveDrawer {...defaultProps} />);
    await userEvent.click(screen.getByText(/archived \(1\)/i));
    expect(screen.getByText("Old task")).toBeInTheDocument();
  });

  it("shows column name next to card title", async () => {
    render(<ArchiveDrawer {...defaultProps} />);
    await userEvent.click(screen.getByText(/archived \(1\)/i));
    expect(screen.getByText("To Do")).toBeInTheDocument();
  });

  it("collapses again when header is clicked a second time", async () => {
    render(<ArchiveDrawer {...defaultProps} />);
    await userEvent.click(screen.getByText(/archived \(1\)/i));
    await userEvent.click(screen.getByText(/archived \(1\)/i));
    expect(screen.queryByText("Old task")).not.toBeInTheDocument();
  });

  it("restore button calls onRestore with card id", async () => {
    const onRestore = vi.fn();
    render(<ArchiveDrawer {...defaultProps} onRestore={onRestore} />);
    await userEvent.click(screen.getByText(/archived \(1\)/i));
    await userEvent.click(screen.getByRole("button", { name: /restore card/i }));
    expect(onRestore).toHaveBeenCalledWith("c1");
  });

  it("delete button calls onDelete with card id and columnId", async () => {
    const onDelete = vi.fn();
    render(<ArchiveDrawer {...defaultProps} onDelete={onDelete} />);
    await userEvent.click(screen.getByText(/archived \(1\)/i));
    await userEvent.click(screen.getByRole("button", { name: /delete permanently/i }));
    expect(onDelete).toHaveBeenCalledWith("c1", "col1");
  });

  it("shows count for multiple archived cards", () => {
    const cards = [
      makeCard({ id: "c1", title: "One" }),
      makeCard({ id: "c2", title: "Two" }),
      makeCard({ id: "c3", title: "Three" }),
    ];
    render(<ArchiveDrawer {...defaultProps} cards={cards} />);
    expect(screen.getByText(/archived \(3\)/i)).toBeInTheDocument();
  });
});
