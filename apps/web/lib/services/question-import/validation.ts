import { createHash } from "node:crypto";

export const QUESTION_IMPORT_MAX_BYTES = 10 * 1024 * 1024;
export const QUESTION_IMPORT_MAX_CANDIDATES = 1000;
export const QUESTION_IMPORT_MAX_COLUMNS = 100;
export const QUESTION_IMPORT_MAX_TEXT = 20_000;

export type QuestionImportFormat = "CSV" | "XLSX" | "DOCX";

const signatures: Record<QuestionImportFormat, number[]> = {
  CSV: [],
  XLSX: [0x50, 0x4b, 0x03, 0x04],
  DOCX: [0x50, 0x4b, 0x03, 0x04],
};

export function sha256(buffer: Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function normalizeText(value: unknown): string {
  return String(value ?? "").replace(/\u0000/g, "").replace(/\s+/g, " ").trim().slice(0, QUESTION_IMPORT_MAX_TEXT);
}

export function candidateFingerprint(parts: string[]): string {
  return sha256(Buffer.from(parts.map((part) => normalizeText(part).toLowerCase()).join("\u001f")));
}

export function validateQuestionImportFile(name: string, buffer: Uint8Array, format: QuestionImportFormat, mime?: string): { fingerprint: string; warnings: string[] } {
  if (buffer.byteLength === 0 || buffer.byteLength > QUESTION_IMPORT_MAX_BYTES) throw new Error("Import file exceeds the 10 MB limit.");
  const extension = name.toLowerCase().split(".").pop();
  const expected = format.toLowerCase();
  if (extension !== expected) throw new Error(`Expected a .${expected} file.`);
  const signature = signatures[format];
  if (signature.length && !signature.every((byte, index) => buffer[index] === byte)) throw new Error("File signature does not match the selected format.");
  if (mime && format !== "CSV" && !/(zip|officedocument|spreadsheet|wordprocessing|octet-stream)/i.test(mime)) {
    throw new Error("File MIME type is not an accepted Office document type.");
  }
  return { fingerprint: sha256(buffer), warnings: mime && format === "CSV" && !/csv|text|plain/i.test(mime) ? ["CSV MIME type is unusual; contents were validated as text."] : [] };
}

export function rejectUnsafeMarkup(value: string): string[] {
  const warnings: string[] = [];
  if (/<\/?script\b|on[a-z]+\s*=|javascript:/i.test(value)) warnings.push("Unsafe markup or URL syntax was detected and retained only as review evidence.");
  return warnings;
}
