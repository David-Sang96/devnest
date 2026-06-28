import { describe, it, expect } from "vitest";
import { NOTE_TEMPLATES } from "@/lib/note-templates";

describe("NOTE_TEMPLATES", () => {
  it("exports exactly 4 templates", () => {
    expect(NOTE_TEMPLATES).toHaveLength(4);
  });

  it("each template has id, label, title, and content", () => {
    for (const t of NOTE_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(t.title).toBeTruthy();
      expect(t.content).toBeTruthy();
    }
  });

  it("all template ids are unique", () => {
    const ids = NOTE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each template content is valid JSON", () => {
    for (const t of NOTE_TEMPLATES) {
      expect(() => JSON.parse(t.content)).not.toThrow();
    }
  });

  it("each template content parses to a Tiptap doc with content array", () => {
    for (const t of NOTE_TEMPLATES) {
      const doc = JSON.parse(t.content);
      expect(doc.type).toBe("doc");
      expect(Array.isArray(doc.content)).toBe(true);
      expect(doc.content.length).toBeGreaterThan(0);
    }
  });

  it("includes Meeting Notes, Daily Journal, Todo List, Project Brief", () => {
    const labels = NOTE_TEMPLATES.map((t) => t.label);
    expect(labels).toContain("Meeting Notes");
    expect(labels).toContain("Daily Journal");
    expect(labels).toContain("Todo List");
    expect(labels).toContain("Project Brief");
  });
});
