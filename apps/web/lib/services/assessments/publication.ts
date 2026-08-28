import { createHash } from "node:crypto";
import { z } from "zod";
import {
  AssessmentLifecycle,
  ResultReleasePolicy,
  type Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";

export type DerivedAssessmentState = "DRAFT" | "SCHEDULED" | "ACTIVE" | "CLOSED" | "ARCHIVED";

export function derivePublicationState(
  publication: { opensAt: Date | null; closesAt: Date | null },
  now = new Date(),
): Exclude<DerivedAssessmentState, "DRAFT" | "ARCHIVED"> {
  if (publication.closesAt && now >= publication.closesAt) return "CLOSED";
  if (publication.opensAt && now < publication.opensAt) return "SCHEDULED";
  return "ACTIVE";
}

export function attemptDeadline(startedAt: Date, durationMinutes: number | null, closesAt: Date | null) {
  const durationDeadline = durationMinutes ? new Date(startedAt.getTime() + durationMinutes * 60_000) : null;
  if (!durationDeadline) return closesAt;
  if (!closesAt) return durationDeadline;
  return durationDeadline < closesAt ? durationDeadline : closesAt;
}

const publishInput = z.object({ examId: z.string().min(1), expectedDraftRevision: z.number().int().positive().optional() });
const draftPatch = z.object({
  examId: z.string().min(1), expectedDraftRevision: z.number().int().positive(),
  title: z.string().min(1).optional(), instructions: z.string().nullable().optional(), duration: z.number().int().positive().nullable().optional(),
  opensAt: z.coerce.date().nullable().optional(), closesAt: z.coerce.date().nullable().optional(), timezone: z.string().nullable().optional(),
});

export async function saveExamDraftForActor(input: z.input<typeof draftPatch>, actor: { teacherId: string; schoolId: string }) {
  const parsed = draftPatch.parse(input);
  const result = await db.exam.updateMany({
    where: { id: parsed.examId, teacherId: actor.teacherId, schoolId: actor.schoolId, lifecycle: AssessmentLifecycle.DRAFT, draftRevision: parsed.expectedDraftRevision },
    data: { title: parsed.title, instructions: parsed.instructions, duration: parsed.duration, opensAt: parsed.opensAt, closesAt: parsed.closesAt, timezone: parsed.timezone, draftRevision: { increment: 1 } },
  });
  if (result.count !== 1) throw new Error("This draft is stale. Reload before saving.");
  return db.exam.findUniqueOrThrow({ where: { id: parsed.examId } });
}

export async function validateExamForPublication(examId: string, actor: { teacherId: string; schoolId: string }) {
  const exam = await db.exam.findFirst({
    where: { id: examId, schoolId: actor.schoolId, teacherId: actor.teacherId },
    include: {
      assessmentItems: { orderBy: { order: "asc" }, include: { question: true, questionVersion: true } },
      questions: true,
    },
  });
  if (!exam) return { exam: null, hardBlockers: ["Assessment not found or not owned by this teacher."], warnings: [], information: [] };
  const items = exam.assessmentItems;
  const hardBlockers: string[] = [];
  const warnings: string[] = [];
  if (exam.lifecycle === AssessmentLifecycle.ARCHIVED) hardBlockers.push("Archived assessments cannot be published.");
  if (!items.length) hardBlockers.push("Add at least one question before publishing.");
  if (items.some((item) => !item.questionVersion)) hardBlockers.push("Every assessment item must have a pinned QuestionVersion.");
  if (items.some((item) => item.question.lifecycle !== "APPROVED")) hardBlockers.push("All questions must be approved before publication.");
  if (items.some((item) => (item.marksOverride ?? item.question.defaultMarks ?? 0) <= 0)) hardBlockers.push("Every question must have positive marks.");
  if (exam.duration !== null && exam.duration <= 0) hardBlockers.push("Duration must be greater than zero.");
  if (exam.opensAt && exam.closesAt && exam.closesAt <= exam.opensAt) hardBlockers.push("Closing time must be after opening time.");
  if (exam.resultReleasePolicy === ResultReleasePolicy.AFTER_CLOSE && !exam.closesAt) warnings.push("Results release after close requires a closing time.");
  return { exam, hardBlockers, warnings, information: [] };
}

export async function publishExamForActor(input: z.input<typeof publishInput>, actor: { teacherId: string; schoolId: string }) {
  const { examId, expectedDraftRevision } = publishInput.parse(input);
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${examId}))`;
    const validation = await validateExamForPublication(examId, actor);
    if (!validation.exam || validation.hardBlockers.length) throw new Error(validation.hardBlockers.join(" "));
    const exam = validation.exam;
    if (expectedDraftRevision !== undefined && expectedDraftRevision !== exam.draftRevision) throw new Error("This draft is stale. Reload before publishing.");
    const existing = await tx.assessmentPublication.findFirst({ where: { examId }, orderBy: { version: "desc" } });
    if (exam.lifecycle === AssessmentLifecycle.PUBLISHED && existing) return existing;
    const version = (existing?.version ?? 0) + 1;
    const items = exam.assessmentItems.map((item) => ({
      assessmentItemId: item.id,
      questionId: item.questionId,
      questionVersionId: item.questionVersionId,
      order: item.order,
      section: item.section,
      marks: item.marksOverride ?? item.question.defaultMarks ?? 0,
      snapshot: item.snapshot ?? item.questionVersion.payload,
    }));
    const snapshot = { title: exam.title, subject: exam.subject, topic: exam.topic, classLevel: exam.classLevel, instructions: exam.instructions, duration: exam.duration, opensAt: exam.opensAt, closesAt: exam.closesAt, timezone: exam.timezone, resultReleasePolicy: exam.resultReleasePolicy, answerReleasePolicy: exam.answerReleasePolicy, gradingMode: exam.gradingMode, passMarkPercent: exam.passMarkPercent, items };
    const publication = await tx.assessmentPublication.create({ data: {
      examId, version, publishedByTeacherId: actor.teacherId, title: exam.title, subject: exam.subject, topic: exam.topic, classLevel: exam.classLevel,
      instructions: exam.instructions, duration: exam.duration, opensAt: exam.opensAt, closesAt: exam.closesAt, timezone: exam.timezone,
      resultReleasePolicy: exam.resultReleasePolicy, answerReleasePolicy: exam.answerReleasePolicy, gradingMode: exam.gradingMode, passMarkPercent: exam.passMarkPercent,
      settingsSnapshot: snapshot as Prisma.InputJsonValue, contentHash: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"),
      items: { create: items.map((item) => ({
        assessmentItem: { connect: { id: item.assessmentItemId } },
        question: { connect: { id: item.questionId } },
        questionVersion: { connect: { id: item.questionVersionId } },
        order: item.order, section: item.section, marks: item.marks, snapshot: item.snapshot as Prisma.InputJsonValue,
      })) },
    }, include: { items: true } });
    await tx.exam.update({ where: { id: examId }, data: { lifecycle: AssessmentLifecycle.PUBLISHED, publishedAt: publication.publishedAt } });
    return publication;
  }, { maxWait: 30_000, timeout: 30_000 });
}

export async function archiveExamForActor(examId: string, actor: { teacherId: string; schoolId: string }) {
  return db.exam.updateMany({ where: { id: examId, teacherId: actor.teacherId, schoolId: actor.schoolId }, data: { lifecycle: AssessmentLifecycle.ARCHIVED, archivedAt: new Date() } });
}

export async function deleteDraftExamForActor(examId: string, actor: { teacherId: string; schoolId: string }) {
  const exam = await db.exam.findFirst({ where: { id: examId, teacherId: actor.teacherId, schoolId: actor.schoolId }, include: { _count: { select: { attempts: true, publications: true } } } });
  if (!exam) throw new Error("Assessment not found.");
  if (exam.lifecycle !== AssessmentLifecycle.DRAFT || exam._count.attempts > 0 || exam._count.publications > 0) throw new Error("Only unused draft assessments can be deleted.");
  await db.exam.delete({ where: { id: examId } });
}

export async function updatePublicationForActor(publicationId: string, actor: { teacherId: string; schoolId: string }, data: Prisma.InputJsonValue) {
  const publication = await db.assessmentPublication.findFirst({ where: { id: publicationId, publishedByTeacherId: actor.teacherId, exam: { schoolId: actor.schoolId } }, include: { _count: { select: { attempts: true } } } });
  if (!publication) throw new Error("Publication not found.");
  if (publication._count.attempts > 0) throw new Error("Published assessments with attempts are immutable.");
  throw new Error("Published assessment content is immutable; create a new publication revision.");
}

export async function createPublicationAttempt(input: { publicationId: string; studentId: string; schoolId: string; startedAt?: Date }) {
  const publication = await db.assessmentPublication.findFirst({ where: { id: input.publicationId, exam: { schoolId: input.schoolId } }, include: { exam: true, items: { orderBy: { order: "asc" } } } });
  if (!publication) throw new Error("Publication not found.");
  const startedAt = input.startedAt ?? new Date();
  const state = derivePublicationState(publication, startedAt);
  if (state !== "ACTIVE") throw new Error("This assessment is not currently available.");
  const deadlineAt = attemptDeadline(startedAt, publication.duration, publication.closesAt);
  return db.examAttempt.create({ data: { studentId: input.studentId, examId: publication.examId, schoolId: input.schoolId, publicationId: publication.id, startedAt, deadlineAt, deliverySnapshot: { publicationId: publication.id, version: publication.version, items: publication.items } } });
}
