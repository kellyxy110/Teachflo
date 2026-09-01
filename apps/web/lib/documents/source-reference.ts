import type { LessonSourceReference } from "@/lib/lessons/content-envelope";

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord | null => value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;

export function reconstructLessonSourceReference(input: { documentId: string; exactExcerpt: string; metadata: unknown }): LessonSourceReference {
  const metadata = record(input.metadata);
  const provenance = record(metadata?.provenance);
  const storedExcerpt = typeof provenance?.exactExcerpt === "string" ? provenance.exactExcerpt : null;
  if (!storedExcerpt || storedExcerpt !== input.exactExcerpt) throw new Error("Source excerpt is stale or does not match the preserved source");
  if (provenance?.sourceDocumentId !== undefined && provenance.sourceDocumentId !== input.documentId) throw new Error("Source document reference is invalid");
  const sourceLocation = record(provenance?.sourceLocation) ?? record(metadata?.sourceLocation);
  const sourceHash = typeof provenance?.sourceHash === "string" ? provenance.sourceHash : undefined;
  const extractionMethod = typeof provenance?.extractionMethod === "string" ? provenance.extractionMethod : undefined;
  const extractionVersion = typeof provenance?.extractionVersion === "string" ? provenance.extractionVersion : undefined;
  return {
    referenceVersion: "TEACHNEXIS_SOURCE_REFERENCE_V1",
    documentId: input.documentId,
    exactExcerpt: storedExcerpt,
    ...(sourceLocation ? { sourceLocation: sourceLocation as LessonSourceReference["sourceLocation"] } : {}),
    ...(sourceHash ? { sourceHash } : {}),
    ...(extractionMethod ? { extractionMethod } : {}),
    ...(extractionVersion ? { extractionVersion } : {}),
    origin: "EXTRACTED_FROM_SOURCE",
  };
}
