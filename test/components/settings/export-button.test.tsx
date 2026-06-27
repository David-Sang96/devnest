import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportButton } from "@/components/settings/export-button";
import type { BackupData } from "@/lib/backup";

const FAKE_BACKUP: BackupData = {
  version: 2,
  exportedAt: 1_000_000,
  notes: [],
  kanban_boards: [],
  kanban_columns: [],
  kanban_cards: [],
  kanban_labels: [],
};

vi.mock("@/lib/backup", () => ({
  exportAllData: vi.fn(),
  downloadBackup: vi.fn(),
}));

describe("<ExportButton />", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { exportAllData, downloadBackup } = await import("@/lib/backup");
    vi.mocked(exportAllData).mockResolvedValue(FAKE_BACKUP);
    vi.mocked(downloadBackup).mockImplementation(() => {});
  });

  it("renders 'Export backup' in the initial state", () => {
    render(<ExportButton onExported={() => {}} />);
    expect(screen.getByText("Export backup")).toBeInTheDocument();
  });

  it("the export button is initially enabled", () => {
    render(<ExportButton onExported={() => {}} />);
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("shows 'Exporting…' briefly while the export runs", async () => {
    // Make exportAllData hang so we can catch the loading state
    const { exportAllData } = await import("@/lib/backup");
    vi.mocked(exportAllData).mockReturnValue(new Promise(() => {})); // never resolves

    render(<ExportButton onExported={() => {}} />);
    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Exporting…")).toBeInTheDocument();
  });

  it("shows 'Exported!' after a successful export", async () => {
    render(<ExportButton onExported={() => {}} />);
    await userEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Exported!")).toBeInTheDocument();
    });
  });

  it("calls exportAllData when clicked", async () => {
    const { exportAllData } = await import("@/lib/backup");
    render(<ExportButton onExported={() => {}} />);
    await userEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(vi.mocked(exportAllData)).toHaveBeenCalledOnce());
  });

  it("calls downloadBackup with the exported data", async () => {
    const { downloadBackup } = await import("@/lib/backup");
    render(<ExportButton onExported={() => {}} />);
    await userEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(vi.mocked(downloadBackup)).toHaveBeenCalledWith(FAKE_BACKUP));
  });

  it("calls onExported with the exportedAt timestamp", async () => {
    const onExported = vi.fn();
    render(<ExportButton onExported={onExported} />);
    await userEvent.click(screen.getByRole("button"));

    await waitFor(() =>
      expect(onExported).toHaveBeenCalledWith(FAKE_BACKUP.exportedAt)
    );
  });
});
