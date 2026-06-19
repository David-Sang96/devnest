"use client";

import { cn } from "@/lib/utils";

const SWATCHES = [
  "#1d4ed8",
  "#065f46",
  "#4c1d95",
  "#9a3412",
  "#134e4a",
  "#713f12",
  "#1e3a5f",
  "#7f1d1d",
  "#0f172a",
];

interface ColumnColorPickerProps {
  currentColor?: string;
  onSelect: (color: string | undefined) => void;
  onClose: () => void;
}

export function ColumnColorPicker({
  currentColor,
  onSelect,
  onClose,
}: ColumnColorPickerProps) {
  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-border bg-popover p-3 shadow-lg">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Column color
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SWATCHES.map((color) => (
            <button
              key={color}
              onClick={() => {
                onSelect(color);
                onClose();
              }}
              className={cn(
                "size-6 rounded-md transition-transform hover:scale-110",
                currentColor === color && "ring-2 ring-ring ring-offset-1 ring-offset-popover"
              )}
              style={{ background: color }}
              aria-label={color}
            />
          ))}
          <button
            onClick={() => {
              onSelect(undefined);
              onClose();
            }}
            className={cn(
              "flex size-6 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground transition-colors hover:bg-accent",
              !currentColor && "ring-2 ring-ring ring-offset-1 ring-offset-popover"
            )}
            aria-label="No color"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}
