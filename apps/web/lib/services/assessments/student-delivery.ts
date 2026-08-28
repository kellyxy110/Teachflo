import { AttemptStatus, AssessmentLifecycle, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { attemptDeadline, derivePublicationState } from "./publication";

type StudentActor = { id: string; schoolId: string; classId: string };

function text(payload: Prisma.JsonValue | null | undefined, key: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function assertStudentScope(student: StudentActor, exam: { schoolId: string; classId: string | null; lifecycle: AssessmentLifecycle }) {
  if (exam.schoolId !== student.schoolId || exam.classId !== student.classId || exam.lifecycle !== AssessmentLifecycle.PUBLISHED) {
    throw new Error("This assessment is not available to you.");
  }
}

async function latestPublication(examId: string, student: StudentActor) {
  const exam = await db.exam.findFirst({
    where: { id: examId },
    select: { id: true, schoolId: true, classId: true, lifecycle: true },
  });
  if (!exam) throw new Error("Assessment not found.");
  assertStudentScope(student, exam);
  const publication = await db.assessmentPublication.findFirst({
    where: { examId },
    orderBy: { version: "desc" },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (!publication) throw new Error("This assessment is not available yet.");
  return publication;
}

export async function listStudentAssessments(student: StudentActor) {
  const exams = await db.exam.findMany({
    where: { schoolId: student.schoolId, classId: student.classId, lifecycle: AssessmentLifecycle.PUBLISHED },
    orderBy: { createdAt: "desc" },
    include: {
      publications: { orderBy: { version: "desc" }, take: 1, include: { items: { select: { id: true, marks: true } } } },
      attempts: { where: { studentId: student.id }, select: { id: true, status: true, startedAt: true, deadlineAt: true, submittedAt: true, publicationId: true } },
    },
  });
  return exams.map((exam) => {
    const publication = exam.publications[0];
    const attempt = exam.attempts[0];
    const state = publication ? derivePublicationState(publication, new Date()) : "CLOSED";
    return {
      id: exam.id, title: publication?.title ?? exam.title, subject: publication?.subject ?? exam.subject,
      classLevel: publication?.classLevel ?? exam.classLevel, duration: publication?.duration ?? exam.duration,
      opensAt: publication?.opensAt ?? null, closesAt: publication?.closesAt ?? null,
      questionCount: publication?.items.length ?? 0,
      totalMarks: publication?.items.reduce((sum, item) => sum + item.marks, 0) ?? 0,
      state, attempt: attempt ? { ...attempt, status: attempt.status } : null,
    };
  });
}

export async function getStudentAssessment(examId: string, student: StudentActor) {
  const publication = await latestPublication(examId, student);
  const attempt = await db.examAttempt.findUnique({ where: { studentId_examId: { studentId: student.id, examId } }, include: { responses: true } });
  const state = attempt?.status === AttemptStatus.IN_PROGRESS ? "IN_PROGRESS" : attempt ? "SUBMITTED" : derivePublicationState(publication, new Date());
  return { publication, attempt, state };
}

export async function startStudentAttempt(examId: string, student: StudentActor, startedAt = new Date()) {
  const publication = await latestPublication(examId, student);
  if (derivePublicationState(publication, startedAt) !== "ACTIVE") throw new Error("This assessment is not currently available.");
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${examId}), hashtext(${student.id}))`;
    const existing = await tx.examAttempt.findUnique({ where: { studentId_examId: { studentId: student.id, examId } } });
    if (existing) return existing;
    const deadlineAt = attemptDeadline(startedAt, publication.duration, publication.closesAt);
    return tx.examAttempt.create({
      data: {
        studentId: student.id, examId, schoolId: student.schoolId, status: AttemptStatus.IN_PROGRESS,
        publicationId: publication.id, startedAt, deadlineAt,
        deliverySnapshot: { publicationId: publication.id, version: publication.version, itemIds: publication.items.map((item) => item.id) },
      },
    });
  }, { maxWait: 30_000, timeout: 30_000 });
}

export async function getStudentAttemptDelivery(attemptId: string, student: StudentActor) {
  const attempt = await db.$transaction(async (tx) => {
    const current = await tx.examAttempt.findFirst({
      where: { id: attemptId, studentId: student.id, schoolId: student.schoolId },
      include: { publication: { include: { items: { orderBy: { order: "asc" }, include: { questionVersion: true } } } }, responses: true },
    });
    if (!current || !current.publication) return current;
    if (current.status !== AttemptStatus.IN_PROGRESS || !current.deadlineAt || new Date() < current.deadlineAt) return current;

    // Expiry is server-authoritative. Finalise exactly once while preserving all saved responses.
    const totalScore = current.responses.reduce((sum, response) => sum + (response.score ?? 0), 0);
    const maxScore = current.publication.items.reduce((sum, item) => sum + item.marks, 0);
    return tx.examAttempt.update({
      where: { id: current.id },
      data: {
        status: AttemptStatus.SUBMITTED,
        totalScore,
        maxScore,
        percentage: maxScore ? (totalScore / maxScore) * 100 : 0,
        submittedAt: current.submittedAt ?? new Date(),
      },
      include: { publication: { include: { items: { orderBy: { order: "asc" }, include: { questionVersion: true } } } }, responses: true },
    });
  });
  if (!attempt || !attempt.publication) throw new Error("Attempt not found.");
  if (attempt.publication.examId !== attempt.examId) throw new Error("Attempt publication is invalid.");
  const items = attempt.publication.items.map((item) => {
    const payload = { ...(item.questionVersion.payload && typeof item.questionVersion.payload === "object" && !Array.isArray(item.questionVersion.payload) ? item.questionVersion.payload as Record<string, Prisma.JsonValue> : {}), ...(item.snapshot && typeof item.snapshot === "object" && !Array.isArray(item.snapshot) ? item.snapshot as Record<string, Prisma.JsonValue> : {}) };
    return {
      id: item.id, questionId: item.questionId, order: item.order, type: text(payload, "type") ?? "MCQ",
      stem: text(payload, "stem") ?? text(payload, "questionText") ?? "Question content unavailable",
      optionA: text(payload, "optionA"), optionB: text(payload, "optionB"), optionC: text(payload, "optionC"), optionD: text(payload, "optionD"),
      marks: item.marks, response: attempt.responses.find((response) => response.publicationItemId === item.id || response.questionId === item.questionId) ?? null,
    };
  });
  return { attempt: { id: attempt.id, status: attempt.status, startedAt: attempt.startedAt, deadlineAt: attempt.deadlineAt, submittedAt: attempt.submittedAt }, publication: { id: attempt.publication.id, title: attempt.publication.title, instructions: attempt.publication.instructions, duration: attempt.publication.duration, resultReleasePolicy: attempt.publication.resultReleasePolicy, answerReleasePolicy: attempt.publication.answerReleasePolicy }, items };
}

export async function saveStudentResponse(input: { attemptId: string; publicationItemId: string; selectedOption?: string | null; textResponse?: string | null; }, student: StudentActor) {
  const attempt = await db.examAttempt.findFirst({ where: { id: input.attemptId, studentId: student.id, schoolId: student.schoolId }, include: { publication: { include: { items: { include: { questionVersion: true } } } } } });
  if (!attempt || !attempt.publication) throw new Error("Attempt not found.");
  if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new Error("This attempt has already been submitted.");
  if (attempt.deadlineAt && new Date() >= attempt.deadlineAt) throw new Error("This attempt has expired.");
  const item = attempt.publication.items.find((candidate) => candidate.id === input.publicationItemId);
  if (!item) throw new Error("Question is not part of this attempt.");
  const payload = { ...(item.questionVersion.payload && typeof item.questionVersion.payload === "object" && !Array.isArray(item.questionVersion.payload) ? item.questionVersion.payload as Record<string, Prisma.JsonValue> : {}), ...(item.snapshot && typeof item.snapshot === "object" && !Array.isArray(item.snapshot) ? item.snapshot as Record<string, Prisma.JsonValue> : {}) };
  const expected = text(payload, "correctOption");
  const isObjective = (text(payload, "type") ?? "MCQ") === "MCQ" && Boolean(expected);
  const isCorrect = isObjective && input.selectedOption ? input.selectedOption === expected : null;
  const score = isCorrect === true ? item.marks : isCorrect === false ? 0 : null;
  return db.questionResponse.upsert({
    where: { attemptId_questionId: { attemptId: attempt.id, questionId: item.questionId } },
    create: { attemptId: attempt.id, questionId: item.questionId, publicationItemId: item.id, selectedOption: input.selectedOption ?? null, textResponse: input.textResponse ?? null, isCorrect, score, maxScore: item.marks },
    update: { publicationItemId: item.id, selectedOption: input.selectedOption ?? null, textResponse: input.textResponse ?? null, isCorrect, score, maxScore: item.marks },
  });
}

export async function submitStudentAttempt(attemptId: string, student: StudentActor) {
  return db.$transaction(async (tx) => {
    const attempt = await tx.examAttempt.findFirst({ where: { id: attemptId, studentId: student.id, schoolId: student.schoolId }, include: { publication: { include: { items: true } }, responses: true } });
    if (!attempt || !attempt.publication) throw new Error("Attempt not found.");
    if (attempt.status !== AttemptStatus.IN_PROGRESS) return attempt;
    const responses = attempt.responses;
    const totalScore = responses.reduce((sum, response) => sum + (response.score ?? 0), 0);
    const maxScore = attempt.publication.items.reduce((sum, item) => sum + item.marks, 0);
    const submittedAt = new Date();
    return tx.examAttempt.update({ where: { id: attempt.id }, data: { status: AttemptStatus.SUBMITTED, totalScore, maxScore, percentage: maxScore ? (totalScore / maxScore) * 100 : 0, submittedAt } });
  }, { maxWait: 30_000, timeout: 30_000 });
}
