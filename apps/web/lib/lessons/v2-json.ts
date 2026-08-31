/** Strict normalization for model stage output. No heuristic extraction. */
export function parseStrictJsonObject(input: string): Record<string, unknown> {
  const text = input.trim();
  const fenced = text.match(/^```json\s*\r?\n([\s\S]*?)\r?\n```$/i);
  const candidate = fenced ? fenced[1].trim() : text;
  if (!fenced && (text.startsWith("```") || text.endsWith("```") || !text.startsWith("{") || !text.endsWith("}"))) throw new Error("Stage output must be a raw JSON object or one JSON code fence");
  if (fenced && (!candidate.startsWith("{") || !candidate.endsWith("}"))) throw new Error("JSON fence must contain exactly one object");
  let parsed: unknown;
  try { parsed = JSON.parse(candidate); } catch { throw new Error("Stage output contains malformed JSON"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Stage output must be a JSON object");
  return parsed as Record<string, unknown>;
}

export type JsonShapeDiagnostic = { beginsWithJsonObject: boolean; beginsWithCodeFence: boolean; openingFenceLanguage: string | null; closingFencePresent: boolean; surroundingProseBeforeFence: boolean; surroundingProseAfterFence: boolean; numberOfCodeFences: number; numberOfTopLevelJsonCandidates: number; responseTruncatedIndicator: boolean; firstNonWhitespaceToken: string; lastNonWhitespaceToken: string; responseCharacterCount: number };
export function classifyJsonShape(input: string): JsonShapeDiagnostic {
  const text = input.trim(); const fences = [...text.matchAll(/```([^\r\n`]*)/g)]; const first = text[0] ?? ""; const last = text[text.length - 1] ?? "";
  const opening = text.match(/^```([^\r\n`]*)\s*\r?\n/); const closing = /\r?\n```\s*$/.test(text); const before = opening ? text.slice(0, text.indexOf("```")) : "";
  // Only inspect text after a *closing* fence. With an incomplete fence,
  // everything after the opening marker is the candidate payload, not prose
  // surrounding the fenced block.
  const after = opening && closing ? text.slice(text.lastIndexOf("```") + 3) : "";
  const candidates = (text.match(/(?:^|[\n\r])\s*\{/g) ?? []).length;
  return { beginsWithJsonObject: first === "{", beginsWithCodeFence: Boolean(opening), openingFenceLanguage: opening?.[1]?.trim() || null, closingFencePresent: closing, surroundingProseBeforeFence: Boolean(before.trim()), surroundingProseAfterFence: Boolean(after.trim()), numberOfCodeFences: fences.length, numberOfTopLevelJsonCandidates: candidates, responseTruncatedIndicator: (text.length > 0 && !["}", "`"].includes(last)) || /(?:\.\.\.|truncat(?:ed|ion)|incomplete)$/i.test(text), firstNonWhitespaceToken: first === "{" ? "JSON_OBJECT" : first === "`" ? "CODE_FENCE" : first ? "TEXT" : "EMPTY", lastNonWhitespaceToken: last === "}" ? "JSON_OBJECT_END" : last === "`" ? "CODE_FENCE_END" : last ? "TEXT" : "EMPTY", responseCharacterCount: input.length };
}
