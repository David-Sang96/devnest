import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanColumnItem } from "@/components/kanban/kanban-column";
import type { KanbanColumn, KanbanCard } from "@/types/kanban";

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
  column: makeColumn(),
  cards: [] as KanbanCard[],
  onAddCard: vi.fn(),
  onRemoveCard: vi.fn(),
  onRemoveColumn: vi.fn(),
  onRenameColumn: vi.fn(),
  onColorColumn: vi.fn(),
  onCardClick: vi.fn(),
  onSetWipLimit: vi.fn(),
};

describe("<KanbanColumnItem />", () => {
  it("renders column title", () => {
    render(<KanbanColumnItem {...defaultProps} />);
    expect(screen.getByText("To Do")).toBeInTheDocument();
  });

  it("shows card count", () => {
    const cards: KanbanCard[] = [
      { id: "c1", columnId: "col1", boardId: "b1", title: "Card A", description: "", createdAt: 1, updatedAt: 1 },
    ];
    render(<KanbanColumnItem {...defaultProps} cards={cards} column={makeColumn({ cardOrder: ["c1"] })} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows pencil and trash buttons in normal mode", () => {
    render(<KanbanColumnItem {...defaultProps} />);
    expect(screen.getByRole("button", { name: /rename column/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete column/i })).toBeInTheDocument();
  });

  describe("edit mode (no overlap fix)", () => {
    it("clicking pencil shows input and hides pencil + trash", async () => {
      render(<KanbanColumnItem {...defaultProps} />);
      await userEvent.click(screen.getByRole("button", { name: /rename column/i }));
      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /rename column/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /delete column/i })).not.toBeInTheDocument();
    });

    it("Enter commits rename and calls onRenameColumn", async () => {
      const onRenameColumn = vi.fn();
      render(<KanbanColumnItem {...defaultProps} onRenameColumn={onRenameColumn} />);
      await userEvent.click(screen.getByRole("button", { name: /rename column/i }));
      const input = screen.getByRole("textbox");
      await userEvent.clear(input);
      await userEvent.type(input, "In Progress{Enter}");
      expect(onRenameColumn).toHaveBeenCalledWith("col1", "In Progress");
    });

    it("Escape cancels edit without calling onRenameColumn", async () => {
      const onRenameColumn = vi.fn();
      render(<KanbanColumnItem {...defaultProps} onRenameColumn={onRenameColumn} />);
      await userEvent.click(screen.getByRole("button", { name: /rename column/i }));
      await userEvent.type(screen.getByRole("textbox"), " extra{Escape}");
      expect(onRenameColumn).not.toHaveBeenCalled();
      expect(screen.getByText("To Do")).toBeInTheDocument();
    });

    it("restores pencil and trash after committing", async () => {
      render(<KanbanColumnItem {...defaultProps} />);
      await userEvent.click(screen.getByRole("button", { name: /rename column/i }));
      await userEvent.keyboard("{Enter}");
      expect(screen.getByRole("button", { name: /rename column/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /delete column/i })).toBeInTheDocument();
    });
  });

  it("calls onRemoveColumn with column and board id when trash clicked", async () => {
    const onRemoveColumn = vi.fn();
    render(<KanbanColumnItem {...defaultProps} onRemoveColumn={onRemoveColumn} />);
    await userEvent.click(screen.getByRole("button", { name: /delete column/i }));
    expect(onRemoveColumn).toHaveBeenCalledWith("col1", "b1");
  });

  describe("card count badge", () => {
    it("shows 0 for empty column", () => {
      render(<KanbanColumnItem {...defaultProps} />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("counts only non-archived cards", () => {
      const cards: KanbanCard[] = [
        { id: "c1", columnId: "col1", boardId: "b1", title: "Active", description: "", createdAt: 1, updatedAt: 1 },
        { id: "c2", columnId: "col1", boardId: "b1", title: "Archived", description: "", createdAt: 1, updatedAt: 1, archived: true },
      ];
      render(
        <KanbanColumnItem
          {...defaultProps}
          column={makeColumn({ cardOrder: ["c1", "c2"] })}
          cards={cards}
        />
      );
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("archived cards are not rendered in the card list", () => {
      const cards: KanbanCard[] = [
        { id: "c1", columnId: "col1", boardId: "b1", title: "Active Card", description: "", createdAt: 1, updatedAt: 1 },
        { id: "c2", columnId: "col1", boardId: "b1", title: "Archived Card", description: "", createdAt: 1, updatedAt: 1, archived: true },
      ];
      render(
        <KanbanColumnItem
          {...defaultProps}
          column={makeColumn({ cardOrder: ["c1", "c2"] })}
          cards={cards}
        />
      );
      expect(screen.getByText("Active Card")).toBeInTheDocument();
      expect(screen.queryByText("Archived Card")).not.toBeInTheDocument();
    });
  });

  describe("WIP limit badge", () => {
    it("shows count/limit format with no amber or red classes when under the limit", () => {
      const cards: KanbanCard[] = [
        { id: "c1", columnId: "col1", boardId: "b1", title: "Card 1", description: "", createdAt: 1, updatedAt: 1 },
      ];
      render(
        <KanbanColumnItem
          {...defaultProps}
          column={makeColumn({ cardOrder: ["c1"], wipLimit: 3 })}
          cards={cards}
        />
      );
      const badge = screen.getByText("1/3");
      expect(badge).toBeInTheDocument();
      expect(badge.className).not.toMatch(/amber/);
      expect(badge.className).not.toMatch(/red|destructive/);
    });

    it("applies amber styling when active count equals the WIP limit", () => {
      const cards: KanbanCard[] = [
        { id: "c1", columnId: "col1", boardId: "b1", title: "Card 1", description: "", createdAt: 1, updatedAt: 1 },
        { id: "c2", columnId: "col1", boardId: "b1", title: "Card 2", description: "", createdAt: 1, updatedAt: 1 },
      ];
      render(
        <KanbanColumnItem
          {...defaultProps}
          column={makeColumn({ cardOrder: ["c1", "c2"], wipLimit: 2 })}
          cards={cards}
        />
      );
      const badge = screen.getByText("2/2");
      expect(badge).toBeInTheDocument();
      expect(badge.className).toMatch(/amber/);
    });

    it("applies red/destructive styling when active count exceeds the WIP limit", () => {
      const cards: KanbanCard[] = [
        { id: "c1", columnId: "col1", boardId: "b1", title: "Card 1", description: "", createdAt: 1, updatedAt: 1 },
        { id: "c2", columnId: "col1", boardId: "b1", title: "Card 2", description: "", createdAt: 1, updatedAt: 1 },
        { id: "c3", columnId: "col1", boardId: "b1", title: "Card 3", description: "", createdAt: 1, updatedAt: 1 },
      ];
      render(
        <KanbanColumnItem
          {...defaultProps}
          column={makeColumn({ cardOrder: ["c1", "c2", "c3"], wipLimit: 2 })}
          cards={cards}
        />
      );
      const badge = screen.getByText("3/2");
      expect(badge).toBeInTheDocument();
      expect(badge.className).toMatch(/red|destructive/);
    });
  });

  describe("column color", () => {
    it("renders palette / column color button", () => {
      render(<KanbanColumnItem {...defaultProps} />);
      expect(screen.getByRole("button", { name: /column color/i })).toBeInTheDocument();
    });

    it("clicking palette button opens color picker", async () => {
      render(<KanbanColumnItem {...defaultProps} />);
      await userEvent.click(screen.getByRole("button", { name: /column color/i }));
      expect(screen.getByText(/column color/i)).toBeInTheDocument();
    });
  });
});
