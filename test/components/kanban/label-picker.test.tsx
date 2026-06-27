import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LabelPicker } from "@/components/kanban/label-picker";
import type { KanbanLabel } from "@/types/kanban";

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
  labels: [] as KanbanLabel[],
  selectedIds: [] as string[],
  onToggle: vi.fn(),
  onCreateLabel: vi.fn(),
  onClose: vi.fn(),
};

describe("<LabelPicker />", () => {
  it("shows 'No labels yet' when no labels exist", () => {
    render(<LabelPicker {...defaultProps} />);
    expect(screen.getByText(/no labels yet/i)).toBeInTheDocument();
  });

  it("lists existing labels with checkboxes", () => {
    const labels = [
      makeLabel({ id: "l1", name: "backend" }),
      makeLabel({ id: "l2", name: "frontend" }),
    ];
    render(<LabelPicker {...defaultProps} labels={labels} />);
    expect(screen.getByText("backend")).toBeInTheDocument();
    expect(screen.getByText("frontend")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("checkbox is checked for selected labels", () => {
    const labels = [makeLabel({ id: "l1", name: "backend" })];
    render(<LabelPicker {...defaultProps} labels={labels} selectedIds={["l1"]} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("clicking a checkbox calls onToggle with label id", async () => {
    const onToggle = vi.fn();
    const labels = [makeLabel({ id: "l1", name: "backend" })];
    render(<LabelPicker {...defaultProps} labels={labels} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith("l1");
  });

  it("backdrop click calls onClose", async () => {
    const onClose = vi.fn();
    const { container } = render(<LabelPicker {...defaultProps} onClose={onClose} />);
    // The backdrop is the first fixed div
    const backdrop = container.querySelector(".fixed.inset-0");
    expect(backdrop).toBeTruthy();
    await userEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("Create button is disabled when name is empty", () => {
    render(<LabelPicker {...defaultProps} />);
    expect(screen.getByRole("button", { name: /create/i })).toBeDisabled();
  });

  it("Create button enables when name is typed", async () => {
    render(<LabelPicker {...defaultProps} />);
    await userEvent.type(screen.getByPlaceholderText(/label name/i), "bug");
    expect(screen.getByRole("button", { name: /create/i })).not.toBeDisabled();
  });

  it("clicking Create calls onCreateLabel with name and selected color", async () => {
    const onCreateLabel = vi.fn();
    render(<LabelPicker {...defaultProps} onCreateLabel={onCreateLabel} />);
    await userEvent.type(screen.getByPlaceholderText(/label name/i), "critical");
    await userEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(onCreateLabel).toHaveBeenCalledWith("critical", expect.any(String));
  });

  it("pressing Enter in the name input calls onCreateLabel", async () => {
    const onCreateLabel = vi.fn();
    render(<LabelPicker {...defaultProps} onCreateLabel={onCreateLabel} />);
    await userEvent.type(screen.getByPlaceholderText(/label name/i), "bug{Enter}");
    expect(onCreateLabel).toHaveBeenCalledWith("bug", expect.any(String));
  });

  it("shows delete button per label when onRemoveLabel provided", () => {
    const labels = [makeLabel({ id: "l1", name: "backend" })];
    render(
      <LabelPicker {...defaultProps} labels={labels} onRemoveLabel={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: /delete label backend/i })).toBeInTheDocument();
  });

  it("clicking delete label button calls onRemoveLabel with label id", async () => {
    const onRemoveLabel = vi.fn();
    const labels = [makeLabel({ id: "l1", name: "backend" })];
    render(
      <LabelPicker {...defaultProps} labels={labels} onRemoveLabel={onRemoveLabel} />
    );
    await userEvent.click(screen.getByRole("button", { name: /delete label backend/i }));
    expect(onRemoveLabel).toHaveBeenCalledWith("l1");
  });

  it("no delete button without onRemoveLabel prop", () => {
    const labels = [makeLabel({ id: "l1", name: "backend" })];
    render(<LabelPicker {...defaultProps} labels={labels} />);
    expect(screen.queryByRole("button", { name: /delete label/i })).not.toBeInTheDocument();
  });
});
