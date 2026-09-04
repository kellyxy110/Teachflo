import { QuestionLifecycle } from "@prisma/client";
import { db } from "@/lib/db";
import { buildCanonicalQuestionVersionEnvelope } from "@/lib/questions/corpus-contract";
import { type GeneratedQuestionCandidate, validateQuestionCandidate } from "@/lib/questions/family-engine";

export type PersistCandidateInput = { candidate: GeneratedQuestionCandidate; schoolId: string; teacherId: string };

/** Transactional bridge into the canonical Question system; never approves or publishes. */
export async function persistValidatedQuestionCandidate(input: PersistCandidateInput) {
  const validation = validateQuestionCandidate(input.candidate);
  if (!validation.valid) throw new Error(`Question candidate validation failed: ${validation.blockers.join("; ")}`);
  return db.$transaction(async (tx) => {
    const teacher = await tx.teacher.findFirst({ where: { id: input.teacherId, schoolId: input.schoolId, isActive: true }, select: { id: true } });
    if (!teacher) throw new Error("Teacher is not authorized for this school.");
    const duplicate = await tx.questionCorpusMetadata.findFirst({ where: { exactFingerprint: input.candidate.exactFingerprint, questionVersion: { question: { schoolId: input.schoolId } } }, select: { questionVersionId: true } });
    if (duplicate) return { created: false, duplicateQuestionVersionId: duplicate.questionVersionId };
    const question = await tx.question.create({ data: { schoolId: input.schoolId, createdByTeacherId: input.teacherId, lifecycle: QuestionLifecycle.DRAFT, sourceKind: "SYSTEM", visibility: "PRIVATE", section: "A", number: 1, type: input.candidate.type, stem: input.candidate.stem, optionA: input.candidate.options?.[0], optionB: input.candidate.options?.[1], optionC: input.candidate.options?.[2], optionD: input.candidate.options?.[3], correctOption: input.candidate.type === "MCQ" && input.candidate.correctOptionIndex !== undefined ? String.fromCharCode(65 + input.candidate.correctOptionIndex) : null, solution: input.candidate.solution, explanation: input.candidate.solution, relatedChunkIds: [], defaultMarks: input.candidate.metadata.marks, questionSource: "QB-C4 deterministic family" } });
    const version = await tx.questionVersion.create({ data: { questionId: question.id, version: 1, payload: buildCanonicalQuestionVersionEnvelope(input.candidate.metadata) } });
    await tx.questionCorpusMetadata.create({ data: { questionVersionId: version.id, subject: input.candidate.metadata.subject, classLevel: input.candidate.metadata.classLevel, term: input.candidate.metadata.term, topic: input.candidate.metadata.topic, subtopic: input.candidate.metadata.subtopic, questionType: input.candidate.metadata.questionType, difficulty: input.candidate.metadata.difficulty, cognitiveSkills: input.candidate.metadata.cognitiveSkills, assessmentProfiles: input.candidate.metadata.assessmentProfiles, calculatorPolicy: input.candidate.metadata.calculatorPolicy, estimatedTimeSeconds: input.candidate.metadata.estimatedTimeSeconds, marks: input.candidate.metadata.marks, prerequisiteNodeIds: input.candidate.metadata.prerequisiteNodeIds, familyKey: input.candidate.metadata.familyKey, familyVariant: input.candidate.metadata.familyVariant, generationMethod: "DETERMINISTIC", verifierId: input.candidate.metadata.verifierId, verifierVersion: input.candidate.metadata.verifierVersion, origin: "DETERMINISTIC_GENERATED", provenanceVerification: "NOT_REQUIRED", exactFingerprint: input.candidate.exactFingerprint, normalizedFingerprint: input.candidate.normalizedFingerprint, familyVariantFingerprint: input.candidate.familyVariantFingerprint, reviewStatus: QuestionLifecycle.DRAFT } });
    for (const alignment of input.candidate.metadata.curriculumAlignments) {
      const node = await tx.curriculumNode.findUnique({ where: { id: alignment.nodeId }, select: { id: true, curriculumVersionId: true, schoolId: true } });
      if (!node || (node.schoolId !== null && node.schoolId !== input.schoolId) || node.curriculumVersionId !== alignment.curriculumVersionId) throw new Error("Curriculum alignment is not accessible in this school.");
      await tx.questionVersionCurriculumAlignment.create({ data: { questionVersionId: version.id, curriculumNodeId: alignment.nodeId, curriculumVersionId: alignment.curriculumVersionId, status: "PROPOSED", sourceKind: "HUMAN_CREATED" } });
    }
    return { created: true, questionId: question.id, questionVersionId: version.id };
  });
}
