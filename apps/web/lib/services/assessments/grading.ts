import { AttemptStatus, Prisma, ResultReleasePolicy } from "@prisma/client";
import { db } from "@/lib/db";

type TeacherActor = { id: string; schoolId: string };
type StudentActor = { id: string; schoolId: string };

function payloadValue(payload: Prisma.JsonValue | null | undefined, key: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

async function teacherAttempt(attemptId: string, actor: TeacherActor) {
  const attempt = await db.examAttempt.findFirst({
    where: { id: attemptId, schoolId: actor.schoolId, exam: { teacherId: actor.id } },
    include: { exam: true, publication: { include: { items: { include: { questionVersion: true } } } }, responses: true, student: true },
  });
  if (!attempt || !attempt.publication) throw new Error("Attempt not found.");
  return attempt;
}

export async function listGradingQueue(actor: TeacherActor, examId?: string) {
  const attempts = await db.examAttempt.findMany({
    where: { schoolId: actor.schoolId, exam: { teacherId: actor.id, ...(examId ? { id: examId } : {}) }, status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED] } },
    orderBy: { submittedAt: "asc" },
    include: { student: true, exam: true, publication: { include: { items: true } }, responses: true },
  });
  return attempts.map((attempt) => {
    const manualItems = attempt.publication?.items.filter((item) => !["MCQ"].includes(payloadValue(item.snapshot, "type") ?? "MCQ")) ?? [];
    const manualIds = new Set(manualItems.map((item) => item.questionId));
    const pending = attempt.responses.filter((response) => manualIds.has(response.questionId) && response.gradedAt === null).length;
    return { id: attempt.id, examId: attempt.examId, title: attempt.exam.title, student: `${attempt.student.firstName} ${attempt.student.lastName}`, submittedAt: attempt.submittedAt, status: pending > 0 ? "NEEDS_GRADING" : attempt.status === AttemptStatus.GRADED ? "GRADED" : "READY_TO_RELEASE", pending, totalResponses: attempt.responses.length, publicationVersion: attempt.publication?.version ?? null };
  });
}

export async function getGradingAttempt(attemptId: string, actor: TeacherActor) {
  const attempt = await teacherAttempt(attemptId, actor);
  const items = attempt.publication!.items.map((item) => ({
    id: item.id, questionId: item.questionId, order: item.order, marks: item.marks, type: payloadValue(item.snapshot, "type") ?? "MCQ", stem: payloadValue(item.snapshot, "stem") ?? payloadValue(item.snapshot, "questionText") ?? "Question content unavailable", correctOption: payloadValue(item.snapshot, "correctOption"), solution: payloadValue(item.snapshot, "solution") ?? payloadValue(item.snapshot, "explanation"), response: attempt.responses.find((response) => response.publicationItemId === item.id || response.questionId === item.questionId) ?? null,
  }));
  return { attempt: { id: attempt.id, status: attempt.status, submittedAt: attempt.submittedAt, totalScore: attempt.totalScore, maxScore: attempt.maxScore, percentage: attempt.percentage, resultReleasedAt: attempt.resultReleasedAt }, publication: { id: attempt.publication!.id, version: attempt.publication!.version, title: attempt.publication!.title, resultReleasePolicy: attempt.publication!.resultReleasePolicy, answerReleasePolicy: attempt.publication!.answerReleasePolicy }, student: { id: attempt.student.id, name: `${attempt.student.firstName} ${attempt.student.lastName}`, regNumber: attempt.student.regNumber }, items };
}

export async function gradeResponseForTeacher(input: { attemptId: string; publicationItemId: string; awardedMarks: number; feedback?: string | null }, actor: TeacherActor) {
  if (!Number.isFinite(input.awardedMarks) || input.awardedMarks < 0) throw new Error("Marks must be zero or greater.");
  const attempt = await teacherAttempt(input.attemptId, actor);
  if (attempt.status === AttemptStatus.GRADED && attempt.resultReleasedAt) throw new Error("Released results cannot be changed.");
  const item = attempt.publication!.items.find((candidate) => candidate.id === input.publicationItemId);
  if (!item) throw new Error("Response not found.");
  if (input.awardedMarks > item.marks) throw new Error(`Marks cannot exceed ${item.marks}.`);
  const response = attempt.responses.find((candidate) => candidate.publicationItemId === item.id || candidate.questionId === item.questionId);
  if (!response) throw new Error("Student has not answered this question.");
  await db.questionResponse.update({ where: { id: response.id }, data: { score: input.awardedMarks, maxScore: item.marks, feedback: input.feedback ?? response.feedback, gradedByTeacherId: actor.id, gradedAt: new Date() } });
  return recomputeAttempt(attempt.id, actor);
}

export async function recomputeAttempt(attemptId: string, actor: TeacherActor) {
  const attempt = await teacherAttempt(attemptId, actor);
  const responses = await db.questionResponse.findMany({ where: { attemptId } });
  const manualPending = attempt.publication!.items.filter((item) => !["MCQ"].includes(payloadValue(item.snapshot, "type") ?? "MCQ")).some((item) => !responses.some((response) => response.questionId === item.questionId && response.gradedAt));
  const totalScore = responses.reduce((sum, response) => sum + (response.score ?? 0), 0);
  const maxScore = attempt.publication!.items.reduce((sum, item) => sum + item.marks, 0);
  return db.examAttempt.update({ where: { id: attemptId }, data: { totalScore, maxScore, percentage: maxScore ? (totalScore / maxScore) * 100 : 0, ...(manualPending ? {} : { status: AttemptStatus.GRADED, gradedAt: new Date() }) } });
}

export async function releaseAttemptResult(attemptId: string, actor: TeacherActor) {
  const attempt = await teacherAttempt(attemptId, actor);
  if (attempt.status !== AttemptStatus.GRADED) throw new Error("Complete grading before releasing this result.");
  if (attempt.resultReleasedAt) return attempt;
  return db.examAttempt.update({ where: { id: attempt.id }, data: { resultReleasedAt: new Date(), resultReleasedByTeacherId: actor.id } });
}

export async function getStudentResult(attemptId: string, student: StudentActor) {
  const attempt = await db.examAttempt.findFirst({ where: { id: attemptId, studentId: student.id, schoolId: student.schoolId }, include: { publication: { include: { items: true } }, responses: true } });
  if (!attempt || !attempt.publication) throw new Error("Result not found.");
  const released = attempt.publication.resultReleasePolicy === ResultReleasePolicy.AFTER_TEACHER_RELEASE ? Boolean(attempt.resultReleasedAt) : attempt.status !== AttemptStatus.IN_PROGRESS;
  if (!released) return { released: false, title: attempt.publication.title, status: attempt.status };
  const showAnswers = attempt.publication.answerReleasePolicy === "AFTER_TEACHER_RELEASE" ? Boolean(attempt.resultReleasedAt) : false;
  return { released: true, title: attempt.publication.title, status: attempt.status, totalScore: attempt.totalScore, maxScore: attempt.maxScore, percentage: attempt.percentage, responses: showAnswers ? attempt.responses : attempt.responses.map((response) => ({ id: response.id, score: response.score, maxScore: response.maxScore, feedback: response.feedback })) };
}
