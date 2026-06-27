import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CardDetailPanel } from "@/components/kanban/card-detail-panel";
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
    updatedAt: 1,
    ...overrides,
  };
}

const defaultProps = {
  card: makeCard(),
  labels: [] as KanbanLabel[],
  onClose: vi.fn(),
  onUpdateCard: vi.fn(),
  onArchive: vi.fn(),
  onDelete: vi.fn(),
  onCreateLabel: vi.fn(),
};

describe("<CardDetailPanel />", () => {
  it("renders card title in the header input", () => {
    render(<CardDetailPanel {...defaultProps} />);
    expect(screen.getByDisplayValue("Fix login bug")).toBeInTheDocument();
  });

  it("close button calls onClose", async () => {
    const onClose = vi.fn();
    render(<CardDetailPanel {...defaultProps} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /close panel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders Tiptap editor area", () => {
    render(<CardDetailPanel {...defaultProps} />);
    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  it("shows all four priority chips", () => {
    render(<CardDetailPanel {...defaultProps} />);
    expect(screen.getByRole("button", { name: /low/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /medium/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /high/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /urgent/i })).toBeInTheDocument();
  });

  it("clicking a priority chip calls onUpdateCard with that priority", async () => {
    const onUpdateCard = vi.fn();
    render(<CardDetailPanel {...defaultProps} onUpdateCard={onUpdateCard} />);
    await userEvent.click(screen.getByRole("button", { name: /high/i }));
    expect(onUpdateCard).toHaveBeenCalledWith("card1", { priority: "high" });
  });

  it("clicking active priority clears it (sets undefined)", async () => {
    const onUpdateCard = vi.fn();
    render(
      <CardDetailPanel
        {...defaultProps}
        card={makeCard({ priority: "high" })}
        onUpdateCard={onUpdateCard}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /high/i }));
    expect(onUpdateCard).toHaveBeenCalledWith("card1", { priority: undefined });
  });

  it("renders due date input", () => {
    render(<CardDetailPanel {...defaultProps} />);
    expect(screen.getByDisplayValue("")).toBeInTheDocument(); // empty date input
  });

  it("shows '+ Add' label button", () => {
    render(<CardDetailPanel {...defaultProps} />);
    expect(screen.getByRole("button", { name: /\+ add/i })).toBeInTheDocument();
  });

  it("clicking '+ Add' opens LabelPicker with label list", async () => {
    const labels = [makeLabel({ name: "frontend" })];
    render(<CardDetailPanel {...defaultProps} labels={labels} />);
    await userEvent.click(screen.getByRole("button", { name: /\+ add/i }));
    // LabelPicker renders a checkbox per label when open
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getAllByText("frontend")).toBeTruthy();
  });

  it("assigned labels appear as chips in the panel", () => {
    const labels = [makeLabel({ id: "l1", name: "backend" })];
    render(
      <CardDetailPanel
        {...defaultProps}
        card={makeCard({ labelIds: ["l1"] })}
        labels={labels}
      />
    );
    expect(screen.getByText("backend")).toBeInTheDocument();
  });

  it("Archive button calls onArchive and onClose", async () => {
    const onArchive = vi.fn();
    const onClose = vi.fn();
    render(
      <CardDetailPanel {...defaultProps} onArchive={onArchive} onClose={onClose} />
    );
    await userEvent.click(screen.getByRole("button", { name: /archive/i }));
    expect(onArchive).toHaveBeenCalledWith("card1");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("Delete button calls onDelete and onClose", async () => {
    const onDelete = vi.fn();
    const onClose = vi.fn();
    render(
      <CardDetailPanel {...defaultProps} onDelete={onDelete} onClose={onClose} />
    );
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith("card1", "col1");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("title input updates onUpdateCard on blur when changed", async () => {
    const onUpdateCard = vi.fn();
    render(<CardDetailPanel {...defaultProps} onUpdateCard={onUpdateCard} />);
    const input = screen.getByDisplayValue("Fix login bug");
    await userEvent.clear(input);
    await userEvent.type(input, "New title");
    await userEvent.tab();
    expect(onUpdateCard).toHaveBeenCalledWith("card1", { title: "New title" });
  });
});
