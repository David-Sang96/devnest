"use client";

import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { X, Archive, Trash2 } from "lucide-react";
import type { KanbanCard, KanbanLabel, Priority } from "@/types/kanban";
import { LabelPicker } from "./label-picker";
import { cn } from "@/lib/utils";

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  low:    { label: "Low",    color: "#22c55e" },
  medium: { label: "Medium", color: "#eab308" },
  high:   { label: "High",   color: "#f97316" },
  urgent: { label: "Urgent", color: "#ef4444" },
};

interface CardDetailPanelProps {
  card: KanbanCard;
  labels: KanbanLabel[];
  onClose: () => void;
  onUpdateCard: (
    id: string,
    changes: Partial<
      Pick<KanbanCard, "title" | "description" | "priority" | "dueDate" | "labelIds" | "archived">
    >
  ) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string, columnId: string) => void;
  onCreateLabel: (name: string, color: string) => void;
  onRemoveLabel?: (id: string) => void;
}

export function CardDetailPanel({
  card,
  labels,
  onClose,
  onUpdateCard,
  onArchive,
  onDelete,
  onCreateLabel,
  onRemoveLabel,
}: CardDetailPanelProps) {
  const [title, setTitle] = useState(card.title);
  const [showLabelPicker, setShowLabelPicker] = useState(false);

  useEffect(() => {
    setTitle(card.title);
    setShowLabelPicker(false);
  }, [card.id]);

  const editor = useEditor(
    {
      extensions: [StarterKit],
      content: (() => {
        if (!card.description) return "";
        try {
          return JSON.parse(card.description);
        } catch {
          return card.description;
        }
      })(),
      onBlur: ({ editor: e }) => {
        const isEmpty = e.isEmpty;
        onUpdateCard(card.id, {
          description: isEmpty ? "" : JSON.stringify(e.getJSON()),
        });
      },
      editorProps: {
        attributes: {
          class:
            "prose prose-sm prose-invert max-w-none min-h-[80px] focus:outline-none px-3 py-2 text-sm text-foreground",
        },
      },
    },
    [card.id]
  );

  const selectedIds = card.labelIds ?? [];
  const cardLabels = labels.filter((l) => selectedIds.includes(l.id));

  const dueDateValue = card.dueDate
    ? new Date(card.dueDate).toISOString().slice(0, 10)
    : "";

  function handleToggleLabel(labelId: string) {
    const next = selectedIds.includes(labelId)
      ? selectedIds.filter((id) => id !== labelId)
      : [...selectedIds, labelId];
    onUpdateCard(card.id, { labelIds: next });
  }

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-start gap-2 border-b border-border px-4 py-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            const trimmed = title.trim();
            if (trimmed && trimmed !== card.title) {
              onUpdateCard(card.id, { title: trimmed });
            } else {
              setTitle(card.title);
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground focus:outline-none"
        />
        <button
          onClick={onClose}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Close panel"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Description */}
        <div className="px-4 pb-1 pt-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Description
          </p>
          <div className="min-h-[80px] rounded-md border border-border bg-background">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-3 flex flex-col gap-2.5 border-t border-border px-4 pb-4 pt-3">
          {/* Priority */}
          <div className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-xs text-muted-foreground">
              Priority
            </span>
            <div className="flex flex-wrap gap-1">
              {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                const active = card.priority === p;
                return (
                  <button
                    key={p}
                    onClick={() =>
                      onUpdateCard(card.id, { priority: active ? undefined : p })
                    }
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                      active
                        ? "text-white"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    style={active ? { background: cfg.color } : undefined}
                  >
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ background: active ? "white" : cfg.color }}
                    />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due date */}
          <div className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-xs text-muted-foreground">
              Due
            </span>
            <input
              type="date"
              value={dueDateValue}
              onChange={(e) => {
                const ts = e.target.value
                  ? new Date(e.target.value).getTime()
                  : undefined;
                onUpdateCard(card.id, { dueDate: ts });
              }}
              className="rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Labels */}
          <div className="relative flex items-start gap-3">
            <span className="mt-0.5 w-14 shrink-0 text-xs text-muted-foreground">
              Labels
            </span>
            <div className="flex flex-wrap gap-1">
              {cardLabels.map((l) => (
                <span
                  key={l.id}
                  className="rounded-full px-2 py-px text-xs font-medium text-white"
                  style={{ background: l.color }}
                >
                  {l.name}
                </span>
              ))}
              <button
                onClick={() => setShowLabelPicker((v) => !v)}
                className="rounded-full border border-dashed border-border px-2 py-px text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                + Add
              </button>
            </div>
            {showLabelPicker && (
              <LabelPicker
                labels={labels}
                selectedIds={selectedIds}
                onToggle={handleToggleLabel}
                onCreateLabel={onCreateLabel}
                onClose={() => setShowLabelPicker(false)}
                onRemoveLabel={onRemoveLabel}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <button
          onClick={() => {
            onArchive(card.id);
            onClose();
          }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Archive className="size-3.5" />
          Archive
        </button>
        <button
          onClick={() => {
            onDelete(card.id, card.columnId);
            onClose();
          }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
