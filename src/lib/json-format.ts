export type ParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export type JsonToken = {
  type: "key" | "string" | "number" | "boolean" | "null" | "punctuation";
  value: string;
};

export function tokenizeJson(json: string): JsonToken[] {
  const regex =
    /("(?:[^"\\]|\\.)*")(?=\s*:)|("(?:[^"\\]|\\.)*")|(true|false)|(null)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([\[\]{},:\s]+)/g;
  const tokens: JsonToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(json)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "punctuation", value: json.slice(lastIndex, match.index) });
    }
    const [, key, string, bool, null_, number, punctuation] = match;
    if (key !== undefined)         tokens.push({ type: "key",         value: key });
    else if (string !== undefined) tokens.push({ type: "string",      value: string });
    else if (bool !== undefined)   tokens.push({ type: "boolean",     value: bool });
    else if (null_ !== undefined)  tokens.push({ type: "null",        value: null_ });
    else if (number !== undefined) tokens.push({ type: "number",      value: number });
    else if (punctuation !== undefined) tokens.push({ type: "punctuation", value: punctuation });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < json.length) {
    tokens.push({ type: "punctuation", value: json.slice(lastIndex) });
  }
  return tokens;
}

export function tryParse(input: string): ParseResult {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (e) {
    return { ok: false, error: (e as SyntaxError).message };
  }
}

export function formatJson(input: string, indent = 2): string {
  const result = tryParse(input);
  if (!result.ok) return input;
  return JSON.stringify(result.value, null, indent);
}

export function minifyJson(input: string): string {
  const result = tryParse(input);
  if (!result.ok) return input;
  return JSON.stringify(result.value);
}
