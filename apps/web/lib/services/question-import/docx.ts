import { inflateRawSync } from "node:zlib";
import { candidateFingerprint, normalizeText, QUESTION_IMPORT_MAX_CANDIDATES, QUESTION_IMPORT_MAX_TEXT, validateQuestionImportFile } from "./validation";
import type { QuestionImportParseResult } from "./types";

const MAX_ENTRIES = 5000;
const MAX_ENTRY_BYTES = 2 * 1024 * 1024;
const u16 = (b: Buffer, o: number) => b.readUInt16LE(o);
const u32 = (b: Buffer, o: number) => b.readUInt32LE(o);

/** Bounded OOXML adapter: text, numbered questions, MCQ options and table rows only. */
export function parseDocxQuestions(name: string, buffer: Buffer, mime?: string): QuestionImportParseResult {
  const { fingerprint, warnings } = validateQuestionImportFile(name, buffer, "DOCX", mime);
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 66000); i--) if (u32(buffer, i) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error("DOCX archive directory is missing or malformed.");
  const entries = u16(buffer, end + 10);
  if (entries > MAX_ENTRIES) throw new Error("DOCX archive contains too many entries.");
  const warningList = [...warnings, "OMML, images, macros, and embedded objects require Teacher review."];
  const names: string[] = [];
  let xml = "";
  for (let cursor = end + 22; cursor < buffer.length && names.length < entries;) {
    if (u32(buffer, cursor) !== 0x02014b50) break;
    const method = u16(buffer, cursor + 10), compressedSize = u32(buffer, cursor + 20);
    const nameLength = u16(buffer, cursor + 28), extraLength = u16(buffer, cursor + 30), commentLength = u16(buffer, cursor + 32);
    const localOffset = u32(buffer, cursor + 42), entryName = buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    names.push(entryName);
    if (entryName === "word/document.xml" && compressedSize <= MAX_ENTRY_BYTES) {
      if (u32(buffer, localOffset) !== 0x04034b50) throw new Error("DOCX local entry is malformed.");
      const ln = u16(buffer, localOffset + 26), le = u16(buffer, localOffset + 28), start = localOffset + 30 + ln + le;
      const compressed = buffer.subarray(start, start + compressedSize);
      xml = method === 0 ? compressed.toString("utf8") : method === 8 ? inflateRawSync(compressed).toString("utf8") : "";
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (names.some((entry) => /vbaProject\.bin|embeddings\//i.test(entry))) warningList.push("Embedded executable/object content was detected and is not executed.");
  if (!xml) throw new Error("DOCX document.xml is missing or uses unsupported compression.");
  const paragraphs = [...xml.matchAll(/<w:p[\s\S]*?<\/w:p>/gi)].map((m) => normalizeText(m[0].replace(/<w:tab\s*\/?\s*>/gi, " ").replace(/<[^>]+>/g, " "))).filter(Boolean);
  const tableRows = [...xml.matchAll(/<w:tr[\s\S]*?<\/w:tr>/gi)].map((m) => [...m[0].matchAll(/<w:tc[\s\S]*?<\/w:tc>/gi)].map((c) => normalizeText(c[0].replace(/<[^>]+>/g, " "))).filter(Boolean)).filter((r) => r.length);
  const starts = (v: string) => /^(?:\d+\s*[.)]|Question\s+\d+\s*[:.)])/i.test(v);
  const groups: string[][] = [];
  for (const p of paragraphs) { if (starts(p) || groups.length === 0) groups.push([p]); else groups[groups.length - 1].push(p); }
  const candidates = groups.slice(0, QUESTION_IMPORT_MAX_CANDIDATES).map((group, index) => {
    const option = /^(?:\(?[A-D]\)?[.)]|[A-D]:)\s*/i;
    const options = group.slice(1).filter((p) => option.test(p)).map((p) => p.replace(option, "").trim());
    const stem = (options.length ? [group[0], ...group.slice(1).filter((p) => !option.test(p))] : group).join("\n").slice(0, QUESTION_IMPORT_MAX_TEXT);
    const row = tableRows[index];
    const rowWarnings = [...warningList];
    if (!starts(group[0])) rowWarnings.push("Question boundary requires Teacher confirmation.");
    if (row) rowWarnings.push("Table-derived content requires Teacher review.");
    return { sourceLocation: { file: name, paragraph: index + 1 }, rawSource: { paragraphs: group, tableRow: row ?? null, packageValidated: true }, stem, questionType: options.length >= 2 ? "MCQ" as const : null, options, answer: null, marks: null, explanation: null, section: null, subject: null, topic: null, warnings: rowWarnings, errors: [], duplicateFingerprint: candidateFingerprint([stem, ...options]), sourceFingerprint: fingerprint, stemConversionState: "NEEDS_REVIEW" as const, status: "NEEDS_REVIEW" as const };
  });
  return { sourceFingerprint: fingerprint, format: "DOCX", candidates: candidates.filter((c) => c.stem), warnings: warningList, errors: [] };
}
