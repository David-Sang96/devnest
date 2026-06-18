interface TextNode { type: string; text?: string }
interface DocNode { type: string; content?: DocNode[] }

function emptyDoc(): DocNode {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function loadContent(raw: string): DocNode {
  if (!raw) return emptyDoc();

  if (raw.trimStart().startsWith('{"type":"doc"')) {
    try {
      return JSON.parse(raw) as DocNode;
    } catch {
      return emptyDoc();
    }
  }

  const lines = raw.split("\n").slice(1);
  if (lines.length === 0 || (lines.length === 1 && !lines[0])) return emptyDoc();

  return {
    type: "doc",
    content: lines.map((line) =>
      line.trim()
        ? { type: "paragraph", content: [{ type: "text", text: line }] }
        : { type: "paragraph" }
    ),
  };
}

export function extractTitle(raw: string): string {
  if (!raw) return "Untitled";

  if (raw.trimStart().startsWith('{"type":"doc"')) {
    try {
      const doc = JSON.parse(raw) as DocNode;
      const first = doc.content?.[0];
      const text = (first?.content ?? [])
        .map((n: TextNode) => n.text ?? "")
        .join("");
      return text.trim() || "Untitled";
    } catch {
      return "Untitled";
    }
  }

  return raw.split("\n")[0].trim() || "Untitled";
}

function extractTextFromNode(node: DocNode): string {
  if ("text" in node) return (node as TextNode).text ?? "";
  return (node.content ?? []).map(extractTextFromNode).join(" ");
}

export function extractPlainText(raw: string): string {
  if (!raw) return "";
  if (raw.trimStart().startsWith('{"type":"doc"')) {
    try {
      const doc = JSON.parse(raw) as DocNode;
      return extractTextFromNode(doc).trim();
    } catch {
      return "";
    }
  }
  return raw.split("\n").slice(1).join(" ").trim();
}
