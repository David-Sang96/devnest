import { describe, it, expect } from "vitest";
import {
  tryParse,
  formatJson,
  minifyJson,
  tokenizeJson,
} from "@/lib/json-format";

// ─── tryParse ────────────────────────────────────────────────────────────────

describe("tryParse()", () => {
  it("parses a valid JSON object", () => {
    const result = tryParse('{"a":1}');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ a: 1 });
  });

  it("parses a valid JSON array", () => {
    const result = tryParse("[1,2,3]");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([1, 2, 3]);
  });

  it("parses JSON primitives: null, boolean, number, string", () => {
    expect(tryParse("null")).toEqual({ ok: true, value: null });
    expect(tryParse("true")).toEqual({ ok: true, value: true });
    expect(tryParse("false")).toEqual({ ok: true, value: false });
    expect(tryParse("42")).toEqual({ ok: true, value: 42 });
    expect(tryParse('"hello"')).toEqual({ ok: true, value: "hello" });
  });

  it("returns ok:false and an error message for invalid JSON", () => {
    const result = tryParse("{invalid}");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeTruthy();
  });

  it("returns ok:false for empty input", () => {
    expect(tryParse("")).toMatchObject({ ok: false });
  });

  it("returns ok:false for trailing comma", () => {
    expect(tryParse('{"a":1,}')).toMatchObject({ ok: false });
  });
});

// ─── formatJson ──────────────────────────────────────────────────────────────

describe("formatJson()", () => {
  it("pretty-prints with default 2-space indent", () => {
    expect(formatJson('{"a":1,"b":2}')).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it("respects a custom indent size", () => {
    expect(formatJson('{"a":1}', 4)).toBe('{\n    "a": 1\n}');
  });

  it("returns the raw input unchanged for invalid JSON", () => {
    const bad = "{bad json}";
    expect(formatJson(bad)).toBe(bad);
  });

  it("is idempotent on already-formatted JSON", () => {
    const json = '{"x":1}';
    const once = formatJson(json);
    expect(formatJson(once)).toBe(once);
  });

  it("handles nested objects", () => {
    const result = formatJson('{"a":{"b":1}}');
    expect(result).toBe('{\n  "a": {\n    "b": 1\n  }\n}');
  });

  it("handles arrays of objects", () => {
    const result = formatJson('[{"id":1},{"id":2}]');
    expect(result).toContain('"id": 1');
    expect(result).toContain('"id": 2');
  });
});

// ─── minifyJson ──────────────────────────────────────────────────────────────

describe("minifyJson()", () => {
  it("strips whitespace from pretty-printed JSON", () => {
    const pretty = '{\n  "a": 1,\n  "b": 2\n}';
    expect(minifyJson(pretty)).toBe('{"a":1,"b":2}');
  });

  it("returns raw input unchanged for invalid JSON", () => {
    const bad = "{bad json}";
    expect(minifyJson(bad)).toBe(bad);
  });

  it("round-trips with formatJson", () => {
    const original = '{"x":1,"y":[1,2,3]}';
    expect(minifyJson(formatJson(original))).toBe(original);
  });

  it("collapses nested whitespace", () => {
    const result = minifyJson('{ "a" : { "b" : true } }');
    expect(result).toBe('{"a":{"b":true}}');
  });
});

// ─── tokenizeJson ─────────────────────────────────────────────────────────────

describe("tokenizeJson()", () => {
  it("identifies object keys separately from string values", () => {
    const tokens = tokenizeJson('{"name":"Alice"}');
    const keys = tokens.filter((t) => t.type === "key");
    const strings = tokens.filter((t) => t.type === "string");
    expect(keys).toHaveLength(1);
    expect(keys[0].value).toBe('"name"');
    expect(strings).toHaveLength(1);
    expect(strings[0].value).toBe('"Alice"');
  });

  it("identifies number tokens", () => {
    const tokens = tokenizeJson('{"n":42}');
    const numbers = tokens.filter((t) => t.type === "number");
    expect(numbers).toHaveLength(1);
    expect(numbers[0].value).toBe("42");
  });

  it("identifies boolean tokens", () => {
    const tokens = tokenizeJson('{"a":true,"b":false}');
    const bools = tokens.filter((t) => t.type === "boolean");
    expect(bools.map((t) => t.value)).toEqual(["true", "false"]);
  });

  it("identifies null tokens", () => {
    const tokens = tokenizeJson('{"x":null}');
    const nulls = tokens.filter((t) => t.type === "null");
    expect(nulls).toHaveLength(1);
    expect(nulls[0].value).toBe("null");
  });

  it("handles negative and floating-point numbers", () => {
    const tokens = tokenizeJson('{"a":-1.5,"b":2e10}');
    const numbers = tokens.filter((t) => t.type === "number");
    expect(numbers.map((t) => t.value)).toEqual(["-1.5", "2e10"]);
  });

  it("handles arrays — no keys, only numbers", () => {
    const tokens = tokenizeJson("[1,2,3]");
    expect(tokens.filter((t) => t.type === "key")).toHaveLength(0);
    expect(tokens.filter((t) => t.type === "number")).toHaveLength(3);
  });

  it("produces only punctuation tokens for an empty object", () => {
    const tokens = tokenizeJson("{}");
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.every((t) => t.type === "punctuation")).toBe(true);
  });

  it("handles multiple keys in one object", () => {
    const tokens = tokenizeJson('{"a":1,"b":2,"c":3}');
    expect(tokens.filter((t) => t.type === "key")).toHaveLength(3);
    expect(tokens.filter((t) => t.type === "number")).toHaveLength(3);
  });

  it("does not confuse a string value that looks like a key", () => {
    // "foo" is a value here, not a key — no colon follows it
    const tokens = tokenizeJson('["foo"]');
    expect(tokens.filter((t) => t.type === "key")).toHaveLength(0);
    expect(tokens.filter((t) => t.type === "string")).toHaveLength(1);
  });
});
