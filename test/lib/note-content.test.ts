import { describe, it, expect } from "vitest";
import { loadContent, extractTitle, extractPlainText } from "@/lib/note-content";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

describe("loadContent", () => {
  it("returns empty doc for empty string", () => {
    expect(loadContent("")).toEqual(EMPTY_DOC);
  });

  it("passthrough for valid Tiptap JSON string", () => {
    const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }] };
    expect(loadContent(JSON.stringify(doc))).toEqual(doc);
  });

  it("converts plain text — skips first line (title), wraps rest as paragraphs", () => {
    const result = loadContent("Title\nLine one\nLine two");
    expect(result).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Line one" }] },
        { type: "paragraph", content: [{ type: "text", text: "Line two" }] },
      ],
    });
  });

  it("plain text with only a title returns empty doc", () => {
    expect(loadContent("Title only")).toEqual(EMPTY_DOC);
  });

  it("blank lines become empty paragraphs", () => {
    const result = loadContent("Title\nA\n\nB");
    expect(result).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "A" }] },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "B" }] },
      ],
    });
  });

  it("returns empty doc for malformed JSON that starts with the doc prefix", () => {
    expect(loadContent('{"type":"doc" INVALID')).toEqual(EMPTY_DOC);
  });
});

describe("extractTitle", () => {
  it("returns 'Untitled' for empty string", () => {
    expect(extractTitle("")).toBe("Untitled");
  });

  it("extracts title from plain text first line", () => {
    expect(extractTitle("My Note\nsome body")).toBe("My Note");
  });

  it("returns 'Untitled' when plain text first line is blank", () => {
    expect(extractTitle("\nbody")).toBe("Untitled");
  });

  it("extracts title from Tiptap JSON first paragraph text", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "JSON Title" }] },
        { type: "paragraph", content: [{ type: "text", text: "body" }] },
      ],
    };
    expect(extractTitle(JSON.stringify(doc))).toBe("JSON Title");
  });

  it("returns 'Untitled' when JSON doc has empty first paragraph", () => {
    const doc = { type: "doc", content: [{ type: "paragraph" }] };
    expect(extractTitle(JSON.stringify(doc))).toBe("Untitled");
  });

  it("returns 'Untitled' for malformed JSON with doc prefix", () => {
    expect(extractTitle('{"type":"doc" BROKEN')).toBe("Untitled");
  });
});

describe("extractPlainText", () => {
  it("returns empty string for empty input", () => {
    expect(extractPlainText("")).toBe("");
  });

  it("extracts text from Tiptap JSON, skipping the first paragraph (title)", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Title" }] },
        { type: "paragraph", content: [{ type: "text", text: "Body text" }] },
      ],
    });
    expect(extractPlainText(doc)).toBe("Title Body text");
  });

  it("extracts text from nested Tiptap nodes", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello" },
            { type: "text", text: " world" },
          ],
        },
      ],
    });
    expect(extractPlainText(doc)).toBe("Hello  world");
  });

  it("returns empty string for Tiptap JSON with no text nodes", () => {
    const doc = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });
    expect(extractPlainText(doc)).toBe("");
  });

  it("returns empty string for malformed Tiptap JSON", () => {
    expect(extractPlainText('{"type":"doc" BROKEN')).toBe("");
  });

  it("extracts body from legacy plain text (skips first line)", () => {
    expect(extractPlainText("Title\nFirst body line\nSecond body line")).toBe(
      "First body line Second body line"
    );
  });

  it("returns empty string for legacy plain text with title only", () => {
    expect(extractPlainText("Title only")).toBe("");
  });
});
