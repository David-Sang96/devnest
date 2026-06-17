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
  createdAt: number;
  updatedAt: number;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  boardId: string;
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}
