export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  deletedAt?: number;
}

export type SortOrder = "updatedAt" | "createdAt" | "title";
export type DateFilter = "all" | "today" | "week" | "month";
