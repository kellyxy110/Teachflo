import { createHash } from "node:crypto";

export const PILOT_SOURCE_TITLE = "NEW NERDC SCHEME, 2025.pdf";
export const PILOT_MAX_BYTES = 10 * 1024 * 1024;

export type PilotEvidence = {
  page: number;
  section: string;
  rawText: string;
  label: string;
  scope: string;
};

export type ParsedPilotPdf = {
  fingerprint: string;
  byteSize: number;
  pageCount: number;
  evidence: PilotEvidence;
};

type PdfResult = { text?: string; total?: number };

async function parsePdf(buffer: Buffer): Promise<PdfResult> {
  const mod = await import("pdf-parse");
  const Parser = (mod as { PDFParse?: new (input: { data: Buffer }) => { getText: (options?: { partial?: number[] }) => Promise<PdfResult>; destroy: () => Promise<void> | void } }).PDFParse;
  if (!Parser) throw new Error("PDF parser is unavailable.");
  const parser = new Parser({ data: buffer });
  try {
    return await parser.getText({ partial: [3] });
  } finally {
    await parser.destroy();
  }
}

/**
 * Extracts only the approved JSS1 Mathematics / Whole Numbers evidence.
 * The PDF parser is bounded by byte size; candidate publication remains
 * separately bounded by the exact row match below.
 */
export async function parseWholeNumbersPilot(buffer: Buffer): Promise<ParsedPilotPdf> {
  if (buffer.byteLength === 0 || buffer.byteLength > PILOT_MAX_BYTES) {
    throw new Error("Curriculum source exceeds the bounded PDF size limit.");
  }
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("Curriculum source is not a valid PDF.");
  }

  const parsed = await parsePdf(buffer);
  const text = (parsed.text ?? "").replace(/\r/g, "");
  const section = /JSS\s*1\s+MATHEMATICS\s+SCHEME\s+OF\s+WORK[\s\S]*?FIRST\s+TERM/i.exec(text);
  if (!section) throw new Error("JSS1 Mathematics First Term section was not found.");

  const bounded = text.slice(section.index, section.index + 5000);
  const row = /1\s+Whole Numbers\s+([\s\S]*?properties of whole\s+numbers\.)/i.exec(bounded);
  if (!row) throw new Error("Whole Numbers Week 1 source row was not found.");

  const scope = row[1].replace(/\s+/g, " ").trim();
  return {
    fingerprint: createHash("sha256").update(buffer).digest("hex"),
    byteSize: buffer.byteLength,
    pageCount: Number(parsed.total ?? 0),
    evidence: {
      page: 3,
      section: "JSS 1 Mathematics Scheme of Work / First Term / Week 1",
      rawText: row[0].replace(/\s+/g, " ").trim(),
      label: "Whole Numbers",
      scope,
    },
  };
}
