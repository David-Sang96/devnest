import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "@/components/command-palette/command-palette";
import type { Note } from "@/types/notes";
import type { KanbanCard } from "@/types/kanban";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockSetTheme = vi.fn();
const mockGetAll = vi.fn();

vi.mock("@/lib/db", () => ({
  getDB: () => Promise.resolve({ getAll: mockGetAll }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: mockSetTheme }),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) =>
    open ? (
      <div
        data-testid="palette"
        onKeyDown={(e) => {
          if (e.key === "Escape") onOpenChange?.(false);
        }}
      >
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    title: "Test Note",
    content: "",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function makeCard(overrides: Partial<KanbanCard> = {}): KanbanCard {
  return {
    id: "c1",
    boardId: "b1",
    columnId: "col1",
    title: "Test Card",
    description: "",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function seedDB(notes: Note[] = [], cards: KanbanCard[] = []) {
  mockGetAll.mockImplementation((store: string) => {
    if (store === "notes") return Promise.resolve(notes);
    if (store === "kanban_cards") return Promise.resolve(cards);
    return Promise.resolve([]);
  });
}

function openPalette() {
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
}

beforeEach(() => {
  vi.clearAllMocks();
  seedDB();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("<CommandPalette />", () => {
  it("is closed by default", () => {
    render(<CommandPalette />);
    expect(screen.queryByTestId("palette")).not.toBeInTheDocument();
  });

  it("opens on Ctrl+K", async () => {
    render(<CommandPalette />);
    openPalette();
    expect(await screen.findByTestId("palette")).toBeInTheDocument();
  });

  it("closes on second Ctrl+K", async () => {
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    openPalette();
    await waitFor(() => {
      expect(screen.queryByTestId("palette")).not.toBeInTheDocument();
    });
  });

  it("closes on Esc", async () => {
    render(<CommandPalette />);
    openPalette();
    const palette = await screen.findByTestId("palette");
    fireEvent.keyDown(palette, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("palette")).not.toBeInTheDocument();
    });
  });

  it("shows all commands when query is empty", async () => {
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    expect(screen.getByText("Go to Notes")).toBeInTheDocument();
    expect(screen.getByText("New Note")).toBeInTheDocument();
    expect(screen.getByText("Toggle Theme")).toBeInTheDocument();
    expect(screen.getByText("Go to Settings")).toBeInTheDocument();
  });

  it("hides Notes and Kanban Cards sections when query is empty", async () => {
    seedDB([makeNote()], [makeCard()]);
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
    expect(screen.queryByText("Kanban Cards")).not.toBeInTheDocument();
  });

  it("shows matching note in Notes section when query matches title", async () => {
    seedDB([makeNote({ id: "n1", title: "Meeting Notes" })]);
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    await userEvent.type(
      screen.getByRole("textbox", { name: /search/i }),
      "Meeting"
    );
    await waitFor(() => {
      expect(screen.getByText("Meeting Notes")).toBeInTheDocument();
      expect(screen.getByText("Notes")).toBeInTheDocument();
    });
  });

  it("shows matching card in Kanban Cards section when query matches title", async () => {
    seedDB([], [makeCard({ id: "c1", title: "Build login page" })]);
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    await userEvent.type(
      screen.getByRole("textbox", { name: /search/i }),
      "login"
    );
    await waitFor(() => {
      expect(screen.getByText("Build login page")).toBeInTheDocument();
      expect(screen.getByText("Kanban Cards")).toBeInTheDocument();
    });
  });

  it("filters commands by query — matching label shown, non-matching hidden", async () => {
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    await userEvent.type(
      screen.getByRole("textbox", { name: /search/i }),
      "settings"
    );
    await waitFor(() => {
      expect(screen.getByText("Go to Settings")).toBeInTheDocument();
      expect(screen.queryByText("New Note")).not.toBeInTheDocument();
    });
  });

  it("shows no-results message when query matches nothing", async () => {
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    await userEvent.type(
      screen.getByRole("textbox", { name: /search/i }),
      "xyzzy999"
    );
    await waitFor(() => {
      expect(screen.getByText(/no results for/i)).toBeInTheDocument();
    });
  });

  it("clicking a command executes its action and closes palette", async () => {
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    await userEvent.click(screen.getByText("Go to Settings"));
    expect(mockPush).toHaveBeenCalledWith("/settings");
    await waitFor(() => {
      expect(screen.queryByTestId("palette")).not.toBeInTheDocument();
    });
  });

  it("clicking 'New Note' navigates to /notes?new=1", async () => {
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    await userEvent.click(screen.getByText("New Note"));
    expect(mockPush).toHaveBeenCalledWith("/notes?new=1");
  });

  it("clicking 'Toggle Theme' calls setTheme('dark') when theme is light", async () => {
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    await userEvent.click(screen.getByText("Toggle Theme"));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("ArrowDown moves highlight to second command, Enter executes it", async () => {
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    const input = screen.getByRole("textbox", { name: /search/i });
    // Empty query → flatItems = all 7 commands. Index 0 = "Go to Notes", 1 = "Go to Kanban".
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockPush).toHaveBeenCalledWith("/kanban");
  });

  it("ArrowUp from index 0 wraps to last item", async () => {
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    const input = screen.getByRole("textbox", { name: /search/i });
    // Empty query → 7 commands. Index 0. ArrowUp → wraps to 6 (Toggle Theme).
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("excludes soft-deleted notes from search results", async () => {
    seedDB([makeNote({ id: "n1", title: "Deleted Note", deletedAt: Date.now() })]);
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    await userEvent.type(
      screen.getByRole("textbox", { name: /search/i }),
      "Deleted"
    );
    await waitFor(() => {
      expect(screen.queryByText("Deleted Note")).not.toBeInTheDocument();
    });
  });

  it("excludes archived kanban cards from search results", async () => {
    seedDB([], [makeCard({ title: "Archived Card", archived: true })]);
    render(<CommandPalette />);
    openPalette();
    await screen.findByTestId("palette");
    await userEvent.type(
      screen.getByRole("textbox", { name: /search/i }),
      "Archived"
    );
    await waitFor(() => {
      expect(screen.queryByText("Archived Card")).not.toBeInTheDocument();
    });
  });
});
