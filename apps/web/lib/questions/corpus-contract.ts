import { createHash } from "node:crypto";
import type { ClassLevel, QuestionType, Term } from "@prisma/client";

export type QuestionCorpusDifficulty = "FOUNDATION" | "STANDARD" | "ADVANCED" | "EXAM_CHALLENGE";
export type QuestionCognitiveSkill = "RECALL" | "UNDERSTANDING" | "APPLICATION" | "ANALYSIS" | "MULTI_STEP_REASONING";
export type CanonicalQuestionMetadata = {
  subject: string; classLevel: ClassLevel; term?: Term; topic: string; subtopic?: string;
  curriculumNodeIds: string[]; objectiveNodeIds: string[]; questionType: QuestionType;
  difficulty: QuestionCorpusDifficulty; cognitiveSkills: QuestionCognitiveSkill[];
  assessmentProfiles: string[]; estimatedTimeSeconds: number; marks: number;
  calculatorPolicy: string; prerequisiteNodeIds: string[];
  curriculumAlignments: Array<{ curriculumVersionId: string; nodeId: string; objectiveNodeId?: string; authority: string }>;
  familyKey?: string; familyVariant?: Record<string, number>; generationMethod?: string;
  verifierId?: string; verifierVersion?: string; exactFingerprint?: string;
  normalizedFingerprint?: string; familyVariantFingerprint?: string;
  origin: string; provenance: { origin: string; verification: string };
  reviewStatus: string; version: number;
};

export function canonicalQuestionFingerprint(input: { stem: string; type: string; answer: string; solution: string }) {
  const canonical = [input.stem, input.type, input.answer, input.solution].map((part) => part.trim().replace(/\s+/g, " ").toLowerCase());
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function questionFamilyKey(input: { subject: string; curriculumNodeId: string; family: string }) {
  return [input.subject.trim().toLowerCase(), input.curriculumNodeId.trim(), input.family.trim()].join(":");
}

export function buildCanonicalQuestionMetadata(input: CanonicalQuestionMetadata): CanonicalQuestionMetadata {
  const result = validateCanonicalQuestionMetadata(input);
  if (!result.valid) throw new Error(result.blockers.join("; "));
  return input;
}

export function buildCanonicalQuestionVersionEnvelope(metadata: CanonicalQuestionMetadata) {
  return { metadata: JSON.parse(JSON.stringify(metadata)) };
}

export function validateCanonicalQuestionMetadata(input: unknown): { valid: boolean; blockers: string[] } {
  const blockers: string[] = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) return { valid: false, blockers: ["metadata must be an object"] };
  const m = input as Record<string, unknown>;
  for (const field of ["subject", "classLevel", "topic", "questionType", "difficulty", "calculatorPolicy", "origin", "reviewStatus"]) {
    if (typeof m[field] !== "string" || !(m[field] as string).trim()) blockers.push(field + " is required");
  }
  if (!Array.isArray(m.cognitiveSkills) || m.cognitiveSkills.length === 0) blockers.push("cognitive skills are required");
  if (!Array.isArray(m.assessmentProfiles) || m.assessmentProfiles.length === 0) blockers.push("assessment profiles are required");
  if (typeof m.marks !== "number" || !Number.isFinite(m.marks) || m.marks <= 0) blockers.push("positive marks required");
  if (typeof m.estimatedTimeSeconds !== "number" || !Number.isFinite(m.estimatedTimeSeconds) || m.estimatedTimeSeconds <= 0) blockers.push("positive estimated time required");
  if (!Number.isInteger(m.version) || (m.version as number) < 1) blockers.push("valid version required");
  if (!Array.isArray(m.curriculumAlignments) || m.curriculumAlignments.length === 0 || m.curriculumAlignments.some((a: unknown) => !a || typeof a !== "object" || !("nodeId" in a) || !("curriculumVersionId" in a))) blockers.push("curriculum alignment required");
  const provenance = m.provenance;
  if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) blockers.push("provenance required");
  else {
    const p = provenance as Record<string, unknown>;
    if (p.origin !== m.origin) blockers.push("provenance origin mismatch");
    if (m.origin === "VERIFIED_PAST_QUESTION" && p.verification !== "VERIFIED") blockers.push("past question provenance must be verified");
  }
  if (m.origin === "DETERMINISTIC_GENERATED" && m.generationMethod !== "DETERMINISTIC") blockers.push("deterministic generation method required");
  return { valid: blockers.length === 0, blockers };
}
