"use client";

import { useState, useMemo, useEffect } from "react";
import type { Note, SortOrder, DateFilter } from "@/types/notes";
import { extractPlainText } from "@/lib/note-content";

const DAY_MS = 86_400_000;

function isInDateRange(ts: number, filter: DateFilter): boolean {
  if (filter === "all") return true;
  const now = Date.now();
  if (filter === "today") {
    const d = new Date(ts);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }
  if (filter === "week") return now - ts <= 7 * DAY_MS;
  if (filter === "month") return now - ts <= 30 * DAY_MS;
  return true;
}

export function useNotesFilter(notes: Note[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("updatedAt");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery), 150);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const filteredNotes = useMemo(() => {
    let result = [...notes];

    if (dateFilter !== "all") {
      result = result.filter((n) => isInDateRange(n.updatedAt, dateFilter));
    }

    if (showPinnedOnly) {
      result = result.filter((n) => n.pinned);
    }

    const q = debouncedQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          extractPlainText(n.content).toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortOrder === "title") return a.title.localeCompare(b.title);
      if (sortOrder === "createdAt") return b.createdAt - a.createdAt;
      return b.updatedAt - a.updatedAt;
    });

    // Pinned notes always float to top (stable secondary sort)
    result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

    return result;
  }, [notes, debouncedQuery, sortOrder, dateFilter, showPinnedOnly]);

  const hasActiveFilters =
    debouncedQuery !== "" ||
    sortOrder !== "updatedAt" ||
    dateFilter !== "all" ||
    showPinnedOnly;

  function clearFilters() {
    setSearchQuery("");
    setDebouncedQuery("");
    setSortOrder("updatedAt");
    setDateFilter("all");
    setShowPinnedOnly(false);
  }

  return {
    filteredNotes,
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    dateFilter,
    setDateFilter,
    showPinnedOnly,
    setShowPinnedOnly,
    hasActiveFilters,
    clearFilters,
  };
}
