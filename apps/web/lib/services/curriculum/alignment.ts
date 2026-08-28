import { AlignmentStatus, CurriculumSourceKind } from "@prisma/client";
import { db } from "@/lib/db";

export type CurriculumActor = { teacherId: string; schoolId: string };

/** Create a reviewed alignment without allowing client-supplied tenancy to grant access. */
export async function createQuestionVersionAlignment(input: {
  questionVersionId: string;
  curriculumNodeId: string;
  curriculumVersionId: string;
  status?: AlignmentStatus;
  sourceKind?: CurriculumSourceKind;
  confidence?: number;
  notes?: string;
}, actor: CurriculumActor) {
  const [version, node, curriculumVersion, teacher] = await Promise.all([
    db.questionVersion.findUnique({ where: { id: input.questionVersionId }, include: { question: true } }),
    db.curriculumNode.findUnique({ where: { id: input.curriculumNodeId } }),
    db.curriculumVersion.findUnique({ where: { id: input.curriculumVersionId } }),
    db.teacher.findFirst({ where: { id: actor.teacherId, schoolId: actor.schoolId, isActive: true }, select: { id: true } }),
  ]);
  if (!teacher) throw new Error("Teacher is not authorized for this school.");
  if (!version?.question || version.question.schoolId !== actor.schoolId) throw new Error("Question is not accessible in this school.");
  if (!node || (node.schoolId !== null && node.schoolId !== actor.schoolId)) throw new Error("Curriculum node is not accessible in this school.");
  if (!curriculumVersion) throw new Error("Curriculum version not found.");
  if (node.curriculumVersionId && node.curriculumVersionId !== curriculumVersion.id) throw new Error("Node does not belong to this curriculum version.");
  return db.questionVersionCurriculumAlignment.create({
    data: {
      questionVersionId: input.questionVersionId,
      curriculumNodeId: input.curriculumNodeId,
      curriculumVersionId: input.curriculumVersionId,
      status: input.status ?? AlignmentStatus.PROPOSED,
      sourceKind: input.sourceKind ?? CurriculumSourceKind.HUMAN_CREATED,
      confidence: input.confidence,
      notes: input.notes,
      reviewedByTeacherId: input.status === AlignmentStatus.APPROVED ? actor.teacherId : undefined,
      reviewedAt: input.status === AlignmentStatus.APPROVED ? new Date() : undefined,
    },
  });
}

export async function getQuestionVersionAlignments(questionVersionId: string, actor: CurriculumActor) {
  const version = await db.questionVersion.findUnique({ where: { id: questionVersionId }, select: { question: { select: { schoolId: true } } } });
  if (!version?.question || version.question.schoolId !== actor.schoolId) throw new Error("Question is not accessible in this school.");
  return db.questionVersionCurriculumAlignment.findMany({ where: { questionVersionId }, include: { node: true, version: true }, orderBy: { id: "asc" } });
}
