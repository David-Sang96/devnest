"use client";

import { useState } from "react";
import type { KanbanLabel } from "@/types/kanban";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];

interface LabelPickerProps {
  labels: KanbanLabel[];
  selectedIds: string[];
  onToggle: (labelId: string) => void;
  onCreateLabel: (name: string, color: string) => void;
  onClose: () => void;
}

export function LabelPicker({
  labels,
  selectedIds,
  onToggle,
  onCreateLabel,
  onClose,
}: LabelPickerProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreateLabel(trimmed, newColor);
    setNewName("");
    setNewColor(PRESET_COLORS[0]);
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-full left-0 z-50 mb-1 w-60 rounded-lg border border-border bg-popover p-3 shadow-lg">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Labels</p>

        <div className="mb-3 flex max-h-36 flex-col gap-0.5 overflow-y-auto">
          {labels.length === 0 && (
            <p className="text-xs text-muted-foreground">No labels yet.</p>
          )}
          {labels.map((label) => (
            <label
              key={label.id}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-accent"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(label.id)}
                onChange={() => onToggle(label.id)}
                className="size-3 accent-primary"
              />
              <span
                className="size-3 shrink-0 rounded-sm"
                style={{ background: label.color }}
              />
              <span className="flex-1 truncate text-sm text-foreground">
                {label.name}
              </span>
            </label>
          ))}
        </div>

        <div className="border-t border-border pt-2">
          <p className="mb-1.5 text-xs text-muted-foreground">Create label</p>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            placeholder="Label name…"
            className="mb-2 w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="mb-2 flex gap-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={cn(
                  "size-4 rounded-sm transition-transform hover:scale-110",
                  newColor === c && "ring-2 ring-ring ring-offset-1 ring-offset-popover"
                )}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="w-full rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>
    </>
  );
}
