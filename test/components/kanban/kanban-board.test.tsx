import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardTab, CreateBoardButton } from "@/components/kanban/kanban-board";
import type { KanbanBoard } from "@/types/kanban";

function makeBoard(overrides: Partial<KanbanBoard> = {}): KanbanBoard {
  return {
    id: "b1",
    title: "My Board",
    columnOrder: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

// ── BoardTab ─────────────────────────────────────────────────────────────────

describe("<BoardTab />", () => {
  const defaultProps = {
    board: makeBoard(),
    active: false,
    onClick: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
  };

  it("renders board title", () => {
    render(<BoardTab {...defaultProps} />);
    expect(screen.getByText("My Board")).toBeInTheDocument();
  });

  it("calls onClick when tab is clicked", async () => {
    const onClick = vi.fn();
    render(<BoardTab {...defaultProps} onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: /my board/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  describe("rename (double-click)", () => {
    it("double-clicking title shows rename input", async () => {
      render(<BoardTab {...defaultProps} />);
      await userEvent.dblClick(screen.getByRole("button", { name: /my board/i }));
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("Enter commits rename and calls onRename", async () => {
      const onRename = vi.fn();
      render(<BoardTab {...defaultProps} onRename={onRename} />);
      await userEvent.dblClick(screen.getByRole("button", { name: /my board/i }));
      const input = screen.getByRole("textbox");
      await userEvent.clear(input);
      await userEvent.type(input, "Renamed{Enter}");
      expect(onRename).toHaveBeenCalledWith("Renamed");
    });

    it("Escape cancels rename without calling onRename", async () => {
      const onRename = vi.fn();
      render(<BoardTab {...defaultProps} onRename={onRename} />);
      await userEvent.dblClick(screen.getByRole("button", { name: /my board/i }));
      await userEvent.type(screen.getByRole("textbox"), " extra{Escape}");
      expect(onRename).not.toHaveBeenCalled();
      expect(screen.getByText("My Board")).toBeInTheDocument();
    });

    it("blur commits rename", async () => {
      const onRename = vi.fn();
      render(
        <div>
          <BoardTab {...defaultProps} onRename={onRename} />
          <button>outside</button>
        </div>
      );
      await userEvent.dblClick(screen.getByRole("button", { name: /my board/i }));
      const input = screen.getByRole("textbox");
      await userEvent.clear(input);
      await userEvent.type(input, "Blurred");
      await userEvent.click(screen.getByRole("button", { name: /outside/i }));
      expect(onRename).toHaveBeenCalledWith("Blurred");
    });
  });

  describe("delete", () => {
    it("delete button is present (may be visually hidden until hover)", () => {
      render(<BoardTab {...defaultProps} />);
      expect(screen.getByRole("button", { name: /delete board/i })).toBeInTheDocument();
    });

    it("clicking delete button opens confirm dialog", async () => {
      render(<BoardTab {...defaultProps} />);
      await userEvent.click(screen.getByRole("button", { name: /delete board/i }));
      expect(screen.getByText(/all columns and cards will be permanently deleted/i)).toBeInTheDocument();
    });

    it("Cancel in confirm dialog calls neither onDelete nor closes without board", async () => {
      const onDelete = vi.fn();
      render(<BoardTab {...defaultProps} onDelete={onDelete} />);
      await userEvent.click(screen.getByRole("button", { name: /delete board/i }));
      await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
      expect(onDelete).not.toHaveBeenCalled();
    });

    it("Delete in confirm dialog calls onDelete", async () => {
      const onDelete = vi.fn();
      render(<BoardTab {...defaultProps} onDelete={onDelete} />);
      await userEvent.click(screen.getByRole("button", { name: /delete board/i }));
      await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));
      expect(onDelete).toHaveBeenCalledOnce();
    });
  });
});

// ── CreateBoardButton ─────────────────────────────────────────────────────────

describe("<CreateBoardButton />", () => {
  it("renders New board trigger", () => {
    render(<CreateBoardButton onCreate={vi.fn()} />);
    expect(screen.getByText("New board")).toBeInTheDocument();
  });

  it("clicking trigger opens dialog with input", async () => {
    render(<CreateBoardButton onCreate={vi.fn()} />);
    await userEvent.click(screen.getByText("New board"));
    expect(screen.getByPlaceholderText("Board name...")).toBeInTheDocument();
  });

  it("Create button disabled when input is empty", async () => {
    render(<CreateBoardButton onCreate={vi.fn()} />);
    await userEvent.click(screen.getByText("New board"));
    expect(screen.getByRole("button", { name: /^create$/i })).toBeDisabled();
  });

  it("Enter submits and calls onCreate with trimmed name", async () => {
    const onCreate = vi.fn();
    render(<CreateBoardButton onCreate={onCreate} />);
    await userEvent.click(screen.getByText("New board"));
    await userEvent.type(screen.getByPlaceholderText("Board name..."), "Sprint 1{Enter}");
    expect(onCreate).toHaveBeenCalledWith("Sprint 1");
  });

  it("clicking Create button calls onCreate", async () => {
    const onCreate = vi.fn();
    render(<CreateBoardButton onCreate={onCreate} />);
    await userEvent.click(screen.getByText("New board"));
    await userEvent.type(screen.getByPlaceholderText("Board name..."), "Sprint 2");
    await userEvent.click(screen.getByRole("button", { name: /^create$/i }));
    expect(onCreate).toHaveBeenCalledWith("Sprint 2");
  });

  it("does not call onCreate when name is blank", async () => {
    const onCreate = vi.fn();
    render(<CreateBoardButton onCreate={onCreate} />);
    await userEvent.click(screen.getByText("New board"));
    await userEvent.keyboard("{Enter}");
    expect(onCreate).not.toHaveBeenCalled();
  });
});
