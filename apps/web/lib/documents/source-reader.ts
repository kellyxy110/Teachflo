export type ReaderFormat = "PDF" | "DOCX" | "TXT" | "OTHER";

export type ReaderChunk = { id: string; content: string; chunkIndex: number; metadata: unknown };
export type SourceSearchResult = ReaderChunk & { locationLabel: string; excerpt: string };

export function readerFormat(mimeType: string, fileName: string): ReaderFormat {
  if (mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) return "PDF";
  if (mimeType.includes("wordprocessingml") || fileName.toLowerCase().endsWith(".docx")) return "DOCX";
  if (mimeType === "text/plain" || fileName.toLowerCase().endsWith(".txt")) return "TXT";
  return "OTHER";
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function sourceLocation(metadata: unknown, format: ReaderFormat): string {
  const root = record(metadata);
  const provenance = record(root?.provenance);
  const location = record(root?.sourceLocation) ?? record(root?.location) ?? record(provenance?.sourceLocation);
  if (!location) return "Location unavailable";
  if (format === "PDF" && typeof location.page === "number") {
    const end = typeof location.pageEnd === "number" && location.pageEnd > location.page ? `–${location.pageEnd}` : "";
    return `Page ${location.page}${end}`;
  }
  if (format === "DOCX") {
    if (typeof location.paragraph === "number") return `Paragraph ${location.paragraph}`;
    if (typeof location.block === "number") return `Block ${location.block}`;
    if (typeof location.section === "number") return `Section ${location.section}`;
  }
  if (format === "TXT" && typeof location.lineStart === "number") {
    const end = typeof location.lineEnd === "number" && location.lineEnd > location.lineStart ? `–${location.lineEnd}` : "";
    return `Lines ${location.lineStart}${end}`;
  }
  return "Location unavailable";
}

export function readerChunks(chunks: ReaderChunk[], format: ReaderFormat) {
  return chunks.map((chunk) => ({ ...chunk, locationLabel: sourceLocation(chunk.metadata, format) }));
}

export function searchSourceChunks(chunks: ReaderChunk[], query: string, format: ReaderFormat): SourceSearchResult[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [];
  return readerChunks(chunks, format).flatMap((chunk) => {
    const metadata = record(chunk.metadata);
    const provenance = record(metadata?.provenance);
    const normalized = typeof provenance?.normalizedText === "string" ? provenance.normalizedText.toLocaleLowerCase() : "";
    const source = chunk.content.toLocaleLowerCase();
    if (!source.includes(needle) && !normalized.includes(needle)) return [];
    const index = source.indexOf(needle);
    const start = index >= 0 ? Math.max(0, index - 80) : 0;
    const excerpt = chunk.content.slice(start, start + 240);
    return [{ ...chunk, locationLabel: chunk.locationLabel, excerpt }];
  });
}

export function selectionProvenance(chunk: ReaderChunk) {
  const metadata = record(chunk.metadata);
  const provenance = record(metadata?.provenance);
  return {
    documentId: typeof provenance?.sourceDocumentId === "string" ? provenance.sourceDocumentId : undefined,
    exactExcerpt: typeof provenance?.exactExcerpt === "string" ? provenance.exactExcerpt : chunk.content,
    sourceLocation: provenance?.sourceLocation,
    sourceHash: typeof provenance?.sourceHash === "string" ? provenance.sourceHash : undefined,
    extractionMethod: typeof provenance?.extractionMethod === "string" ? provenance.extractionMethod : undefined,
    extractionVersion: typeof provenance?.extractionVersion === "string" ? provenance.extractionVersion : undefined,
    origin: "EXTRACTED_FROM_SOURCE" as const,
  };
}
