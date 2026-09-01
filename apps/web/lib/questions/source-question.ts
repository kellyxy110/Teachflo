import type { LessonSourceReference } from "@/lib/lessons/content-envelope";

export const QUESTION_DERIVED_ORIGIN = "TEACHER_ADAPTED_FROM_SOURCE" as const;

export type SourceBackedQuestionPayload = {
  stem: string;
  type: string;
  solution: string;
  explanation: string;
  options?: Record<string, string>;
  sourceReference: LessonSourceReference;
  derivedOrigin: typeof QUESTION_DERIVED_ORIGIN;
};

export function buildSourceBackedQuestionVersionPayload(input: {
  stem: string;
  type: string;
  solution: string;
  explanation: string;
  options?: Record<string, string>;
  sourceReference: LessonSourceReference;
}): SourceBackedQuestionPayload {
  return {
    stem: input.stem,
    type: input.type,
    solution: input.solution,
    explanation: input.explanation,
    ...(input.options && Object.keys(input.options).length > 0 ? { options: input.options } : {}),
    sourceReference: input.sourceReference,
    derivedOrigin: QUESTION_DERIVED_ORIGIN,
  };
}

export function sourceEvidenceForViewer(input: {
  visibility: "PRIVATE" | "SCHOOL" | "SYSTEM";
  ownerTeacherId: string | null;
  viewerTeacherId: string;
  payload: unknown;
}) {
  // Source evidence is private-source data. A question may later be SCHOOL
  // visible, but that must never broaden access to the preserved excerpt.
  if (input.ownerTeacherId !== input.viewerTeacherId) return null;
  if (!input.payload || typeof input.payload !== "object" || Array.isArray(input.payload)) return null;
  const reference = (input.payload as { sourceReference?: unknown }).sourceReference;
  if (!reference || typeof reference !== "object" || Array.isArray(reference)) return null;
  return reference as LessonSourceReference;
}
