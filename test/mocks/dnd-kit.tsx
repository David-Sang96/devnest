import React from "react";

export function useSortable(_args?: unknown) {
  return {
    attributes: {} as React.HTMLAttributes<HTMLElement>,
    listeners: {} as React.HTMLAttributes<HTMLElement>,
    setNodeRef: () => {},
    transform: null,
    transition: undefined as string | undefined,
    isDragging: false,
  };
}

export function useDroppable(_args?: unknown) {
  return { setNodeRef: () => {}, isOver: false };
}

export function DndContext({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function SortableContext({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function DragOverlay({ children }: { children?: React.ReactNode }) {
  return <>{children ?? null}</>;
}

export const closestCorners = () => null;
export function useSensor() { return {}; }
export function useSensors(...args: unknown[]) { return args; }
export class PointerSensor {}

export function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr];
  const [el] = result.splice(from, 1);
  result.splice(to, 0, el);
  return result;
}

export const horizontalListSortingStrategy = undefined;
export const verticalListSortingStrategy = undefined;
