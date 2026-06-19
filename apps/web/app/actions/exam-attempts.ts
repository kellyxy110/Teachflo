"use server";

import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── Nigerian grading scale ─────────────────────────────────────────────────

function computeGrade(percentage: number): string {
  if (percentage >= 70) return "A";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 45) return "D";
  if (percentage >= 40) return "E";
  return "F";
}

// ── Start attempt ──────────────────────────────────────────────────────────

export async function startExamAttempt(examId: string, studentId: string) {
  const { schoolId } = await requireSchool();

  const student = await db.student.findFirst({
    where: { id: studentId, schoolId },
  });
  if (!student) throw new Error("Student not found in this school");

  const existing = await db.examAttempt.findUnique({
    where: { studentId_examId: { studentId, examId } },
  });
  if (existing) return existing;

  return db.examAttempt.create({
    data: { studentId, examId, schoolId },
  });
}

// ── Submit + auto-grade MCQs ───────────────────────────────────────────────

interface ResponseInput {
  questionId: string;
  selectedOption?: string;
  textResponse?: string;
  timeSpentSeconds?: number;
}

export async function submitExamAttempt(
  attemptId: string,
  responses: ResponseInput[]
) {
  const { schoolId } = await requireSchool();

  const attempt = await db.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: { include: { questions: true } } },
  });
  if (!attempt || attempt.schoolId !== schoolId)
    throw new Error("Attempt not found");
  if (attempt.status !== "IN_PROGRESS")
    throw new Error("Attempt already submitted");

  const questions = new Map(attempt.exam.questions.map((q) => [q.id, q]));
  let totalScore = 0;
  let maxScore = 0;

  const graded = responses
    .map((r) => {
      const q = questions.get(r.questionId);
      if (!q) return null;

      const qMax = 1;
      let isCorrect: boolean | null = null;
      let score = 0;

      if (q.type === "MCQ" && r.selectedOption && q.correctOption) {
        isCorrect = r.selectedOption === q.correctOption;
        score = isCorrect ? qMax : 0;
      }

      totalScore += score;
      maxScore += qMax;

      return {
        attemptId,
        questionId: r.questionId,
        selectedOption: r.selectedOption ?? null,
        textResponse: r.textResponse ?? null,
        isCorrect,
        score,
        maxScore: qMax,
        timeSpentSeconds: r.timeSpentSeconds ?? null,
      };
    })
    .filter(Boolean) as Array<{
    attemptId: string;
    questionId: string;
    selectedOption: string | null;
    textResponse: string | null;
    isCorrect: boolean | null;
    score: number;
    maxScore: number;
    timeSpentSeconds: number | null;
  }>;

  await db.questionResponse.createMany({ data: graded });

  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const grade = computeGrade(percentage);

  await db.examAttempt.update({
    where: { id: attemptId },
    data: {
      status: "SUBMITTED",
      totalScore,
      maxScore,
      percentage,
      grade,
      submittedAt: new Date(),
    },
  });

  revalidatePath("/analytics");
  revalidatePath("/scores");

  return { totalScore, maxScore, percentage, grade };
}

// ── Fetch history ──────────────────────────────────────────────────────────

export async function getStudentExamHistory(studentId: string) {
  const { schoolId } = await requireSchool();

  return db.examAttempt.findMany({
    where: { studentId, schoolId },
    include: {
      exam: { select: { title: true, subject: true, classLevel: true, examType: true } },
    },
    orderBy: { startedAt: "desc" },
  });
}

export async function getExamAttemptDetail(attemptId: string) {
  const { schoolId } = await requireSchool();

  const attempt = await db.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: { select: { title: true, subject: true, classLevel: true } },
      student: { select: { firstName: true, lastName: true, regNumber: true } },
      responses: {
        include: {
          question: {
            select: {
              stem: true,
              optionA: true,
              optionB: true,
              optionC: true,
              optionD: true,
              correctOption: true,
              explanation: true,
              type: true,
              tags: true,
            },
          },
        },
        orderBy: { question: { number: "asc" } },
      },
    },
  });

  if (!attempt || attempt.schoolId !== schoolId) return null;
  return attempt;
}

// ── Per-exam question analytics ────────────────────────────────────────────

export async function getQuestionAnalytics(examId: string) {
  const { schoolId } = await requireSchool();

  const exam = await db.exam.findFirst({
    where: { id: examId, schoolId },
    select: { id: true },
  });
  if (!exam) return null;

  return db.$queryRawUnsafe<
    Array<{
      questionId: string;
      stem: string;
      totalAttempts: number;
      correctCount: number;
      successRate: number;
    }>
  >(
    `SELECT
       q.id as "questionId",
       q.stem,
       COUNT(qr.id)::int as "totalAttempts",
       COUNT(CASE WHEN qr."isCorrect" = true THEN 1 END)::int as "correctCount",
       ROUND(
         COUNT(CASE WHEN qr."isCorrect" = true THEN 1 END) * 100.0
         / NULLIF(COUNT(qr.id), 0), 1
       ) as "successRate"
     FROM questions q
     LEFT JOIN question_responses qr ON qr."questionId" = q.id
     WHERE q."examId" = $1
     GROUP BY q.id, q.stem, q.number
     ORDER BY q.number`,
    examId
  );
}
