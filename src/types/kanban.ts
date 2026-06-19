export type Priority = "low" | "medium" | "high" | "urgent";

export interface KanbanBoard {
  id: string;
  title: string;
  columnOrder: string[];
  createdAt: number;
  updatedAt: number;
}

export interface KanbanColumn {
  id: string;
  boardId: string;
  title: string;
  cardOrder: string[];
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  boardId: string;
  title: string;
  description: string;
  priority?: Priority;
  dueDate?: number;
  labelIds?: string[];
  archived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface KanbanLabel {
  id: string;
  boardId: string;
  name: string;
  color: string;
  createdAt: number;
}
