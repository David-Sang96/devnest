export type ParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

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
