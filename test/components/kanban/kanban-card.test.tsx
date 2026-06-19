import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanCardItem } from "@/components/kanban/kanban-card";
import type { KanbanCard, KanbanLabel } from "@/types/kanban";

function makeCard(overrides: Partial<KanbanCard> = {}): KanbanCard {
  return {
    id: "card1",
    columnId: "col1",
    boardId: "b1",
    title: "Fix login bug",
    description: "",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function makeLabel(overrides: Partial<KanbanLabel> = {}): KanbanLabel {
  return {
    id: "l1",
    boardId: "b1",
    name: "backend",
    color: "#ef4444",
    createdAt: 1,
    ...overrides,
  };
}

const defaultProps = {
  card: makeCard(),
  onRemove: vi.fn(),
  onCardClick: vi.fn(),
};

describe("<KanbanCardItem />", () => {
  it("renders card title", () => {
    render(<KanbanCardItem {...defaultProps} />);
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
  });

  it("clicking the card calls onCardClick with card id", async () => {
    const onCardClick = vi.fn();
    render(<KanbanCardItem {...defaultProps} onCardClick={onCardClick} />);
    await userEvent.click(screen.getByText("Fix login bug"));
    expect(onCardClick).toHaveBeenCalledWith("card1");
  });

  it("clicking the delete button does NOT call onCardClick", async () => {
    const onCardClick = vi.fn();
    render(<KanbanCardItem {...defaultProps} onCardClick={onCardClick} />);
    await userEvent.click(screen.getByRole("button", { name: /delete card/i }));
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it("clicking delete button calls onRemove with id and columnId", async () => {
    const onRemove = vi.fn();
    render(<KanbanCardItem {...defaultProps} onRemove={onRemove} />);
    await userEvent.click(screen.getByRole("button", { name: /delete card/i }));
    expect(onRemove).toHaveBeenCalledWith("card1", "col1");
  });

  describe("metadata", () => {
    it("shows no metadata section when no priority, due date, or labels", () => {
      const { container } = render(<KanbanCardItem {...defaultProps} />);
      // No priority dot (span with inline style background color)
      expect(container.querySelectorAll('[title="low"],[title="medium"],[title="high"],[title="urgent"]')).toHaveLength(0);
    });

    it("shows priority dot when priority is set", () => {
      render(
        <KanbanCardItem
          {...defaultProps}
          card={makeCard({ priority: "high" })}
        />
      );
      expect(screen.getByTitle("high")).toBeInTheDocument();
    });

    it("shows due date when dueDate is set", () => {
      const due = new Date(2026, 11, 25).getTime(); // Dec 25 2026 local midnight
      render(
        <KanbanCardItem
          {...defaultProps}
          card={makeCard({ dueDate: due })}
        />
      );
      expect(screen.getByText(/dec/i)).toBeInTheDocument();
    });

    it("shows label chips for assigned labels", () => {
      const label = makeLabel({ id: "l1", name: "backend" });
      render(
        <KanbanCardItem
          {...defaultProps}
          card={makeCard({ labelIds: ["l1"] })}
          labels={[label]}
        />
      );
      expect(screen.getByText("backend")).toBeInTheDocument();
    });

    it("shows +N more when more than 3 labels", () => {
      const labels: KanbanLabel[] = [
        makeLabel({ id: "l1", name: "one" }),
        makeLabel({ id: "l2", name: "two" }),
        makeLabel({ id: "l3", name: "three" }),
        makeLabel({ id: "l4", name: "four" }),
      ];
      render(
        <KanbanCardItem
          {...defaultProps}
          card={makeCard({ labelIds: ["l1", "l2", "l3", "l4"] })}
          labels={labels}
        />
      );
      expect(screen.getByText("+1")).toBeInTheDocument();
      expect(screen.getByText("one")).toBeInTheDocument();
      expect(screen.queryByText("four")).not.toBeInTheDocument();
    });
  });
});
