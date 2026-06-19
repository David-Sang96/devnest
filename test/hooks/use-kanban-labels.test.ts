import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useKanbanLabels } from "@/hooks/use-kanban-labels";
import type { KanbanLabel } from "@/types/kanban";

// ─── In-memory mock ───────────────────────────────────────────────────────────

let labelsMap = new Map<string, KanbanLabel>();

const mockDB = {
  getAllFromIndex: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock("@/lib/db", () => ({
  getDB: () => Promise.resolve(mockDB),
}));

function resetMock(initial: KanbanLabel[] = []) {
  labelsMap = new Map(initial.map((l) => [l.id, l]));
  mockDB.getAllFromIndex.mockImplementation(
    (_store: string, _field: string, value: string) =>
      Promise.resolve([...labelsMap.values()].filter((l) => l.boardId === value))
  );
  mockDB.get.mockImplementation((_store: string, id: string) =>
    Promise.resolve(labelsMap.get(id))
  );
  mockDB.put.mockImplementation((_store: string, value: KanbanLabel) => {
    labelsMap.set(value.id, value);
    return Promise.resolve();
  });
  mockDB.delete.mockImplementation((_store: string, id: string) => {
    labelsMap.delete(id);
    return Promise.resolve();
  });
}

function makeLabel(overrides: Partial<KanbanLabel> = {}): KanbanLabel {
  return {
    id: crypto.randomUUID(),
    boardId: "board-1",
    name: "label",
    color: "#ef4444",
    createdAt: Date.now(),
    ...overrides,
  };
}

beforeEach(() => resetMock());

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useKanbanLabels()", () => {
  it("loads labels for the given board on mount", async () => {
    const label = makeLabel({ boardId: "board-1" });
    resetMock([label]);

    const { result } = renderHook(() => useKanbanLabels("board-1"));
    await waitFor(() => expect(result.current.labels).toHaveLength(1));
    expect(result.current.labels[0].id).toBe(label.id);
  });

  it("returns empty array when boardId is null", async () => {
    const { result } = renderHook(() => useKanbanLabels(null));
    await waitFor(() => expect(result.current.labels).toEqual([]));
  });

  it("createLabel adds label to state and IDB", async () => {
    resetMock();

    const { result } = renderHook(() => useKanbanLabels("board-1"));
    await waitFor(() => expect(result.current.labels).toEqual([]));

    await act(async () => {
      await result.current.createLabel("bug", "#ef4444");
    });

    expect(result.current.labels).toHaveLength(1);
    expect(result.current.labels[0].name).toBe("bug");
    expect(result.current.labels[0].color).toBe("#ef4444");
    expect(result.current.labels[0].boardId).toBe("board-1");
    expect(mockDB.put).toHaveBeenCalled();
  });

  it("updateLabel changes name and color in state", async () => {
    const label = makeLabel({ id: "l1", name: "old", color: "#000000" });
    resetMock([label]);

    const { result } = renderHook(() => useKanbanLabels("board-1"));
    await waitFor(() => expect(result.current.labels).toHaveLength(1));

    await act(async () => {
      await result.current.updateLabel("l1", { name: "new", color: "#3b82f6" });
    });

    expect(result.current.labels[0].name).toBe("new");
    expect(result.current.labels[0].color).toBe("#3b82f6");
  });

  it("removeLabel removes label from state", async () => {
    const label = makeLabel({ id: "l1" });
    resetMock([label]);

    const { result } = renderHook(() => useKanbanLabels("board-1"));
    await waitFor(() => expect(result.current.labels).toHaveLength(1));

    await act(async () => {
      await result.current.removeLabel("l1");
    });

    expect(result.current.labels).toHaveLength(0);
    expect(mockDB.delete).toHaveBeenCalled();
  });

  it("reloads labels when boardId changes", async () => {
    const label1 = makeLabel({ id: "l1", boardId: "board-1" });
    const label2 = makeLabel({ id: "l2", boardId: "board-2" });
    resetMock([label1, label2]);

    const { result, rerender } = renderHook(
      ({ boardId }: { boardId: string }) => useKanbanLabels(boardId),
      { initialProps: { boardId: "board-1" } }
    );
    await waitFor(() => expect(result.current.labels).toHaveLength(1));
    expect(result.current.labels[0].id).toBe("l1");

    rerender({ boardId: "board-2" });
    await waitFor(() => expect(result.current.labels[0].id).toBe("l2"));
  });
});
