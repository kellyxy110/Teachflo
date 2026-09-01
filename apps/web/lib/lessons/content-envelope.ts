import type { LessonContentOrigin, LessonNoteContract, LessonSourceContext, LessonStem, LessonValidation, TeacherEditState } from "./v2-contract";

export const LESSON_CONTENT_ENVELOPE_VERSION = "TEACHNEXIS_LESSON_CONTENT_V1" as const;
export const LESSON_SOURCE_REFERENCE_VERSION = "TEACHNEXIS_SOURCE_REFERENCE_V1" as const;

export type SourceReferenceLocation = {
  page?: number;
  pageEnd?: number;
  paragraph?: number;
  block?: number;
  lineStart?: number;
  lineEnd?: number;
};

export type LessonSourceReference = {
  referenceVersion: typeof LESSON_SOURCE_REFERENCE_VERSION;
  documentId: string;
  exactExcerpt: string;
  sourceLocation?: SourceReferenceLocation;
  sourceHash?: string;
  extractionMethod?: string;
  extractionVersion?: string;
  origin: "EXTRACTED_FROM_SOURCE";
};

export type LegacyLessonContent = { markdown: string };

export type LessonReviewState = "DRAFT" | "REVIEWED" | "APPROVED";

export interface LessonContentEnvelope {
  envelopeVersion: typeof LESSON_CONTENT_ENVELOPE_VERSION;
  origin: LessonContentOrigin;
  markdown: string;
  contractVersion?: typeof import("./v2-contract").LESSON_V2_CONTRACT_VERSION;
  lessonNote?: LessonNoteContract;
  source?: LessonSourceContext;
  sourceRepresentation?: string;
  sourceReferences?: LessonSourceReference[];
  provenance?: LessonNoteContract["provenance"];
  stem?: LessonStem;
  validation?: LessonValidation;
  review: {
    state: LessonReviewState;
    teacherEditState: TeacherEditState;
  };
}

export type LessonContentValue = LegacyLessonContent | LessonContentEnvelope;
export type LessonContentKind = "LEGACY_UNSTRUCTURED" | "V2_STRUCTURED";

export function isLessonContentEnvelope(value: unknown): value is LessonContentEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.envelopeVersion === "string" && candidate.envelopeVersion.startsWith("TEACHNEXIS_LESSON_CONTENT_") && typeof candidate.markdown === "string" && typeof candidate.origin === "string";
}

export const isWorkspaceLessonContent = isLessonContentEnvelope;

export function isLegacyLessonContent(value: unknown): value is LegacyLessonContent {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && typeof (value as Record<string, unknown>).markdown === "string");
}

export function detectLessonContentKind(value: unknown): LessonContentKind {
  if (isLessonContentEnvelope(value) && (value.contractVersion === "TEACHNEXIS_LESSON_V2" || value.lessonNote?.contractVersion === "TEACHNEXIS_LESSON_V2")) return "V2_STRUCTURED";
  return "LEGACY_UNSTRUCTURED";
}

export function readLessonMarkdown(value: unknown): string {
  if (isLessonContentEnvelope(value) || isLegacyLessonContent(value)) return value.markdown;
  return "";
}

export function parseLessonContent(value: unknown): LessonContentValue { return normalizeLessonContent(value); }
export function getLessonMarkdown(value: unknown): string { return readLessonMarkdown(value); }
export function getLessonOrigin(value: unknown): LessonContentOrigin | null { return isLessonContentEnvelope(value) ? value.origin : null; }
export function getLessonReviewState(value: unknown): LessonReviewState | null { return isLessonContentEnvelope(value) ? value.review.state : null; }
export function createWorkspaceLessonEnvelope(input: Parameters<typeof createLessonContentEnvelope>[0]): LessonContentEnvelope { return createLessonContentEnvelope(input); }

export function createLessonContentEnvelope(input: {
  markdown: string;
  origin: LessonContentOrigin;
  lessonNote?: LessonNoteContract;
  source?: LessonSourceContext;
  sourceRepresentation?: string;
  sourceReferences?: LessonSourceReference[];
  provenance?: LessonNoteContract["provenance"];
  stem?: LessonStem;
  validation?: LessonValidation;
  reviewState?: LessonReviewState;
  teacherEditState?: TeacherEditState;
}): LessonContentEnvelope {
  return {
    envelopeVersion: LESSON_CONTENT_ENVELOPE_VERSION,
    origin: input.origin,
    markdown: input.markdown,
    ...(input.lessonNote ? { contractVersion: "TEACHNEXIS_LESSON_V2" as const, lessonNote: input.lessonNote } : {}),
    ...(input.source ? { source: input.source } : {}),
    ...(input.sourceRepresentation !== undefined ? { sourceRepresentation: input.sourceRepresentation } : {}),
    ...(input.sourceReferences?.length ? { sourceReferences: input.sourceReferences } : {}),
    ...(input.provenance ? { provenance: input.provenance } : {}),
    ...(input.stem ? { stem: input.stem } : {}),
    ...(input.validation ? { validation: input.validation } : {}),
    review: { state: input.reviewState ?? "DRAFT", teacherEditState: input.teacherEditState ?? "NOT_REVIEWED" },
  };
}

export function normalizeLessonContent(value: unknown): LessonContentValue {
  if (isLessonContentEnvelope(value)) return value;
  if (isLegacyLessonContent(value)) return value;
  return { markdown: "" };
}

export function isRecognizedLessonContent(value: unknown): boolean { return isLessonContentEnvelope(value) || isLegacyLessonContent(value); }
