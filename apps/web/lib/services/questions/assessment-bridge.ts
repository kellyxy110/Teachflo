import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";

export const addQuestionsInputSchema = z.object({
  assessmentId: z.string().min(1).max(128),
  questions: z.array(z.object({
    questionId: z.string().min(1).max(128),
    marks: z.number().positive().max(1_000).nullable().optional(),
  }).strict()).min(1).max(50),
}).strict();

export type AddQuestionsInput = z.infer<typeof addQuestionsInputSchema>;

export type AssessmentBridgeActor = {
  teacherId: string;
  schoolId: string;
};

export type AssessmentBridgeErrorCode =
  | "ASSESSMENT_UNAVAILABLE"
  | "ASSESSMENT_IMMUTABLE"
  | "QUESTION_UNAVAILABLE"
  | "QUESTION_NOT_APPROVED"
  | "QUESTION_VERSION_MISSING";

export class AssessmentBridgeError extends Error {
  constructor(public readonly code: AssessmentBridgeErrorCode, message: string) {
    super(message);
    this.name = "AssessmentBridgeError";
  }
}

function questionAccess(actor: AssessmentBridgeActor): Prisma.QuestionWhereInput {
  return {
    OR: [
      { visibility: "SYSTEM" },
      { schoolId: actor.schoolId, visibility: "SCHOOL" },
      { schoolId: actor.schoolId, createdByTeacherId: actor.teacherId, visibility: "PRIVATE" },
      {
        schoolId: null,
        exam: { schoolId: actor.schoolId, teacherId: actor.teacherId },
      },
    ],
  };
}

export async function getQuestionBankWorkspaceForActor(
  actor: AssessmentBridgeActor,
  destinationAssessmentId?: string,
) {
  const [questionRows, assessments] = await Promise.all([
    db.question.findMany({
      where: {
        AND: [questionAccess(actor), { lifecycle: { not: "ARCHIVED" } }],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 51,
      include: {
        exam: { select: { subject: true, topic: true, classLevel: true } },
        versions: { orderBy: { version: "desc" }, take: 1 },
        _count: { select: { assessmentItems: true } },
      },
    }),
    db.exam.findMany({
      where: {
        schoolId: actor.schoolId,
        teacherId: actor.teacherId,
        attempts: { none: {} },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        subject: true,
        topic: true,
        classLevel: true,
        _count: { select: { assessmentItems: true, questions: true } },
      },
    }),
  ]);

  const hasMore = questionRows.length > 50;
  const questions = questionRows.slice(0, 50).map((question) => {
    const latestVersion = question.versions[0] ?? null;
    return {
      id: question.id,
      stem: question.stem,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      optionE: question.optionE,
      correctOption: question.correctOption,
      solution: question.solution,
      explanation: question.explanation,
      type: question.type,
      lifecycle: question.lifecycle,
      visibility: question.visibility,
      defaultMarks: question.defaultMarks,
      difficulty: question.difficulty,
      subject: question.exam?.subject ?? null,
      topic: question.topicTag ?? question.exam?.topic ?? null,
      classLevel: question.exam?.classLevel ?? null,
      latestVersion: latestVersion?.version ?? null,
      usageCount: question._count.assessmentItems,
      selectable: question.lifecycle === "APPROVED" && Boolean(latestVersion),
    };
  });

  return {
    questions,
    assessments,
    hasMore,
    destinationAssessmentId: assessments.some(({ id }) => id === destinationAssessmentId)
      ? destinationAssessmentId ?? null
      : null,
  };
}

export async function addQuestionsToAssessmentForActor(
  actor: AssessmentBridgeActor,
  input: AddQuestionsInput,
) {
  const requested = [...new Map(input.questions.map((question) => [question.questionId, question])).values()];

  return db.$transaction(async (tx) => {
    // Serialize mutations for one assessment. This closes the gap between the
    // existing (examId, order) uniqueness constraint and repeated submissions.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.assessmentId}))`;

    const assessment = await tx.exam.findFirst({
      where: {
        id: input.assessmentId,
        schoolId: actor.schoolId,
        teacherId: actor.teacherId,
      },
      select: {
        id: true,
        title: true,
        attempts: { select: { id: true }, take: 1 },
      },
    });
    if (!assessment) {
      throw new AssessmentBridgeError("ASSESSMENT_UNAVAILABLE", "This assessment is unavailable.");
    }
    if (assessment.attempts.length > 0) {
      throw new AssessmentBridgeError(
        "ASSESSMENT_IMMUTABLE",
        "Questions cannot be added after an assessment attempt has started.",
      );
    }

    const questions = await tx.question.findMany({
      where: {
        id: { in: requested.map(({ questionId }) => questionId) },
        AND: [questionAccess(actor)],
      },
      include: {
        versions: { orderBy: { version: "desc" }, take: 1 },
      },
    });
    if (questions.length !== requested.length) {
      throw new AssessmentBridgeError(
        "QUESTION_UNAVAILABLE",
        "One or more selected questions are unavailable.",
      );
    }
    if (questions.some(({ lifecycle }) => lifecycle !== "APPROVED")) {
      throw new AssessmentBridgeError(
        "QUESTION_NOT_APPROVED",
        "Only approved questions can be added to an assessment.",
      );
    }
    if (questions.some(({ versions }) => versions.length === 0)) {
      throw new AssessmentBridgeError(
        "QUESTION_VERSION_MISSING",
        "One or more selected questions do not have a reusable version.",
      );
    }

    const existing = await tx.assessmentItem.findMany({
      where: {
        examId: assessment.id,
        questionId: { in: questions.map(({ id }) => id) },
      },
      select: { questionId: true },
    });
    const existingIds = new Set(existing.map(({ questionId }) => questionId));
    const pending = requested.filter(({ questionId }) => !existingIds.has(questionId));
    const byId = new Map(questions.map((question) => [question.id, question]));
    const lastItem = await tx.assessmentItem.findFirst({
      where: { examId: assessment.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    let nextOrder = (lastItem?.order ?? 0) + 1;

    for (const requestedQuestion of pending) {
      const question = byId.get(requestedQuestion.questionId);
      if (!question) {
        throw new AssessmentBridgeError("QUESTION_UNAVAILABLE", "A selected question became unavailable.");
      }
      const version = question.versions[0];
      await tx.assessmentItem.create({
        data: {
          examId: assessment.id,
          questionId: question.id,
          questionVersionId: version.id,
          order: nextOrder,
          section: question.section,
          marksOverride: requestedQuestion.marks ?? question.defaultMarks,
          snapshot: version.payload as Prisma.InputJsonValue,
        },
      });
      nextOrder += 1;
    }

    return {
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      added: pending.length,
      skipped: requested.length - pending.length,
    };
  }, { maxWait: 30_000, timeout: 30_000 });
}
