import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ColumnColorPicker } from "@/components/kanban/column-color-picker";

const defaultProps = {
  currentColor: undefined,
  onSelect: vi.fn(),
  onClose: vi.fn(),
};

const SWATCHES = [
  "#1d4ed8", "#065f46", "#4c1d95", "#9a3412",
  "#134e4a", "#713f12", "#1e3a5f", "#7f1d1d", "#0f172a",
];

describe("<ColumnColorPicker />", () => {
  it("renders the 9 preset color swatches", () => {
    render(<ColumnColorPicker {...defaultProps} />);
    SWATCHES.forEach((color) => {
      expect(screen.getByRole("button", { name: color })).toBeInTheDocument();
    });
  });

  it("renders the None / clear button", () => {
    render(<ColumnColorPicker {...defaultProps} />);
    expect(screen.getByRole("button", { name: /no color/i })).toBeInTheDocument();
  });

  it("clicking a color swatch calls onSelect with that color", async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<ColumnColorPicker {...defaultProps} onSelect={onSelect} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "#1d4ed8" }));
    expect(onSelect).toHaveBeenCalledWith("#1d4ed8");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("clicking None calls onSelect with undefined", async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<ColumnColorPicker {...defaultProps} onSelect={onSelect} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /no color/i }));
    expect(onSelect).toHaveBeenCalledWith(undefined);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("backdrop click calls onClose", async () => {
    const onClose = vi.fn();
    const { container } = render(
      <ColumnColorPicker {...defaultProps} onClose={onClose} />
    );
    const backdrop = container.querySelector(".fixed.inset-0");
    expect(backdrop).toBeTruthy();
    await userEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("active swatch has a ring style when currentColor matches", () => {
    render(<ColumnColorPicker {...defaultProps} currentColor="#1d4ed8" />);
    const activeBtn = screen.getByRole("button", { name: "#1d4ed8" });
    expect(activeBtn.className).toContain("ring-2");
  });
});
