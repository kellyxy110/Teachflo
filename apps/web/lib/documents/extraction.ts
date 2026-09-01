import { inflateRawSync } from "node:zlib";
import { chunkText } from "@/lib/chunker";

export type SourceLocation = { page?: number; pageEnd?: number; paragraph?: number; lineStart?: number; lineEnd?: number };
export type ExtractedBlock = { sourceText: string; normalizedText?: string; location: SourceLocation; extractionMethod: string; extractionVersion: string };
export type ExtractedDocument = { format: "PDF" | "DOCX" | "TXT"; blocks: ExtractedBlock[]; text: string; pageCount?: number };

const VERSION = "l3b-extraction-v1";
const normalize = (value: string) => value.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").trim();

export function chunkExtractedBlocks(blocks: ExtractedBlock[], maxChars = 500, overlap = 50) {
  const output: Array<ExtractedBlock & { chunkIndex: number; sourceExcerpt: string }> = [];
  let index = 0;
  for (const block of blocks) {
    const pieces = chunkText(block.sourceText, maxChars, overlap);
    for (const piece of pieces) output.push({ ...block, sourceText: piece, sourceExcerpt: piece, chunkIndex: index++ });
  }
  return output;
}

export async function extractPdf(buffer: Buffer): Promise<ExtractedDocument> {
  const mod = await import("pdf-parse");
  const Parser = (mod as { PDFParse?: new (input: { data: Buffer }) => { getText: (options?: { pageJoiner?: string }) => Promise<{ pages: Array<{ num: number; text: string }>; text: string; total: number }>; destroy: () => Promise<void> | void } }).PDFParse;
  if (!Parser) throw new Error("PDF parser is unavailable");
  const parser = new Parser({ data: buffer });
  try {
    const result = await parser.getText({ pageJoiner: "" });
    const blocks = result.pages.map((page) => ({ sourceText: page.text, normalizedText: normalize(page.text), location: { page: page.num }, extractionMethod: "pdf-parse", extractionVersion: VERSION })).filter((b) => b.sourceText.length > 0);
    if (blocks.length === 0) throw new Error("No extractable text found in PDF; OCR is required");
    return { format: "PDF", blocks, text: blocks.map((b) => b.sourceText).join(""), pageCount: result.total };
  } finally { await parser.destroy(); }
}

function docxXml(buffer: Buffer): string {
  const u16 = (b: Buffer, o: number) => b.readUInt16LE(o); const u32 = (b: Buffer, o: number) => b.readUInt32LE(o);
  let end = -1; for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 66000); i--) if (u32(buffer, i) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error("DOCX archive directory is missing or malformed");
  const entries = u16(buffer, end + 10); let cursor = end + 22;
  for (let n = 0; n < entries && cursor + 46 <= buffer.length; n++) {
    if (u32(buffer, cursor) !== 0x02014b50) break;
    const method = u16(buffer, cursor + 10), compressedSize = u32(buffer, cursor + 20), nameLength = u16(buffer, cursor + 28), extraLength = u16(buffer, cursor + 30), commentLength = u16(buffer, cursor + 32), localOffset = u32(buffer, cursor + 42);
    const name = buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    if (name === "word/document.xml") { const ln = u16(buffer, localOffset + 26), le = u16(buffer, localOffset + 28); const data = buffer.subarray(localOffset + 30 + ln + le, localOffset + 30 + ln + le + compressedSize); return method === 0 ? data.toString("utf8") : method === 8 ? inflateRawSync(data).toString("utf8") : ""; }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error("DOCX document.xml is missing or uses unsupported compression");
}

export function extractDocx(buffer: Buffer): ExtractedDocument {
  const xml = docxXml(buffer);
  const blocks = [...xml.matchAll(/<w:p[\s\S]*?<\/w:p>/gi)].map((match, index) => {
    const sourceText = match[0].replace(/<w:tab\s*\/?\s*>/gi, "\t").replace(/<w:br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, "");
    return { sourceText, normalizedText: normalize(sourceText), location: { paragraph: index + 1 }, extractionMethod: "ooxml-document.xml", extractionVersion: VERSION };
  }).filter((b) => b.sourceText.length > 0);
  if (blocks.length === 0) throw new Error("DOCX contains no extractable paragraphs");
  return { format: "DOCX", blocks, text: blocks.map((b) => b.sourceText).join("\n") };
}

export function extractTxt(buffer: Buffer): ExtractedDocument {
  const source = new TextDecoder("utf-8", { fatal: false }).decode(buffer).replace(/^\uFEFF/, "");
  if (!source.trim()) throw new Error("Text file is empty");
  const blocks = source.split(/\n/).map((line, index) => ({ sourceText: line, normalizedText: normalize(line), location: { lineStart: index + 1, lineEnd: index + 1 }, extractionMethod: "utf-8", extractionVersion: VERSION })).filter((b) => b.sourceText.length > 0);
  return { format: "TXT", blocks, text: source };
}

export async function extractDocument(buffer: Buffer, mimeType: string): Promise<ExtractedDocument> {
  if (mimeType === "application/pdf") return extractPdf(buffer);
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return extractDocx(buffer);
  if (mimeType === "text/plain") return extractTxt(buffer);
  throw new Error("Unsupported document format");
}
