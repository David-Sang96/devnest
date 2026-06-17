import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportButton } from "@/components/settings/import-button";
import type { BackupData } from "@/lib/backup";

const VALID_BACKUP: BackupData = {
  version: 1,
  exportedAt: 1_000_000,
  notes: [],
  kanban_boards: [],
  kanban_columns: [],
  kanban_cards: [],
};

vi.mock("@/lib/backup", () => ({
  parseBackup: vi.fn(),
  importData: vi.fn(),
}));

async function pickFile(json: string, mimeType = "application/json") {
  const file = new File([json], "backup.json", { type: mimeType });
  const input = document.querySelector("input[type='file']") as HTMLInputElement;
  await act(async () => {
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    // Let FileReader.onload fire
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe("<ImportButton />", () => {
  beforeEach(async () => {
    const { parseBackup, importData } = await import("@/lib/backup");
    vi.mocked(parseBackup).mockReturnValue(VALID_BACKUP);
    vi.mocked(importData).mockResolvedValue(undefined);
  });

  it("renders 'Import backup' in the initial state", () => {
    render(<ImportButton onImported={() => {}} />);
    expect(screen.getByText("Import backup")).toBeInTheDocument();
  });

  it("shows a confirm banner when a valid file is selected", async () => {
    render(<ImportButton onImported={() => {}} />);
    await pickFile(JSON.stringify(VALID_BACKUP));

    await waitFor(() => {
      expect(screen.getByText(/This will overwrite all current data/)).toBeInTheDocument();
    });
  });

  it("shows an error banner when an invalid file is selected", async () => {
    const { parseBackup } = await import("@/lib/backup");
    vi.mocked(parseBackup).mockReturnValue(null);

    render(<ImportButton onImported={() => {}} />);
    await pickFile("{bad}");

    await waitFor(() => {
      expect(screen.getByText(/Invalid backup file/i)).toBeInTheDocument();
    });
  });

  it("shows Confirm and Cancel buttons in the confirm state", async () => {
    render(<ImportButton onImported={() => {}} />);
    await pickFile(JSON.stringify(VALID_BACKUP));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });
  });

  it("clicking Cancel returns to the idle state", async () => {
    render(<ImportButton onImported={() => {}} />);
    await pickFile(JSON.stringify(VALID_BACKUP));
    await waitFor(() => screen.getByRole("button", { name: /cancel/i }));

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByText("Import backup")).toBeInTheDocument();
    });
  });

  it("clicking Confirm calls importData", async () => {
    const { importData } = await import("@/lib/backup");
    render(<ImportButton onImported={() => {}} />);
    await pickFile(JSON.stringify(VALID_BACKUP));
    await waitFor(() => screen.getByRole("button", { name: /confirm/i }));

    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => expect(vi.mocked(importData)).toHaveBeenCalledWith(VALID_BACKUP));
  });

  it("calls onImported after a successful import", async () => {
    const onImported = vi.fn();
    render(<ImportButton onImported={onImported} />);
    await pickFile(JSON.stringify(VALID_BACKUP));
    await waitFor(() => screen.getByRole("button", { name: /confirm/i }));

    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => expect(onImported).toHaveBeenCalledOnce());
  });

  it("shows 'Imported!' after a successful import", async () => {
    render(<ImportButton onImported={() => {}} />);
    await pickFile(JSON.stringify(VALID_BACKUP));
    await waitFor(() => screen.getByRole("button", { name: /confirm/i }));

    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(screen.getByText("Imported!")).toBeInTheDocument();
    });
  });
});
