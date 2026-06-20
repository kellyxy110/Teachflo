"use server";

import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import { classifyMistake, buildMistakeReport } from "@/lib/intelligence/mistake-engine";
import type { Prisma } from "@prisma/client";

// ── Process a wrong answer through the mistake intelligence pipeline ─────

export async function processMistake(params: {
  studentId: string;
  questionId: string;
  selectedOption: string;
  subject: string;
  timeSpent: number;
}) {
  const { schoolId } = await requireSchool();

  const question = await db.question.findUnique({
    where: { id: params.questionId },
  });
  if (!question) throw new Error("Question not found");

  const analysis = await classifyMistake({
    questionStem: question.stem,
    correctAnswer: question.correctOption || question.solution,
    studentAnswer: params.selectedOption,
    subject: params.subject,
    topic: question.topicTag || question.skillTag || "Unknown",
    explanation: question.explanation,
    timeSpent: params.timeSpent,
    estimatedTime: question.estimatedTime ?? 90,
  });

  const skill = question.skillTag || question.topicTag || "Unknown";

  await db.mistakePattern.upsert({
    where: {
      studentId_skill_errorType: {
        studentId: params.studentId,
        skill,
        errorType: analysis.errorType,
      },
    },
    create: {
      studentId: params.studentId,
      schoolId,
      skill,
      errorType: analysis.errorType,
      pattern: analysis.pattern,
      rootCause: analysis.rootCause,
      prerequisiteGap: analysis.prerequisiteGap,
      occurrences: 1,
    },
    update: {
      occurrences: { increment: 1 },
      lastSeen: new Date(),
      pattern: analysis.pattern,
      rootCause: analysis.rootCause,
      prerequisiteGap: analysis.prerequisiteGap,
      resolved: false,
    },
  });

  return analysis;
}

// ── Get full mistake report for a student ────────────────────────────────

export async function getStudentMistakeReport(studentId: string) {
  const { schoolId } = await requireSchool();

  const student = await db.student.findFirst({
    where: { id: studentId, schoolId },
    select: { firstName: true, lastName: true },
  });
  if (!student) throw new Error("Student not found");

  const patterns = await db.mistakePattern.findMany({
    where: { studentId, schoolId },
    orderBy: { occurrences: "desc" },
  });

  const recentMistakes = await db.$queryRawUnsafe<
    Array<{
      questionStem: string;
      errorType: string;
      misconception: string;
      subject: string;
      date: Date;
    }>
  >(
    `SELECT q.stem as "questionStem",
       COALESCE(qr."errorType", 'unknown') as "errorType",
       COALESCE(qr.misconception, 'No analysis') as misconception,
       e.subject,
       qr."createdAt" as date
     FROM question_responses qr
     JOIN exam_attempts ea ON ea.id = qr."attemptId"
     JOIN questions q ON q.id = qr."questionId"
     JOIN exams e ON e.id = q."examId"
     WHERE ea."studentId" = $1 AND ea."schoolId" = $2
       AND qr."isCorrect" = false
     ORDER BY qr."createdAt" DESC
     LIMIT 20`,
    studentId,
    schoolId
  );

  return {
    student: `${student.firstName} ${student.lastName}`,
    report: buildMistakeReport(studentId, patterns, recentMistakes),
  };
}

// ── Mark a mistake pattern as resolved ───────────────────────────────────

export async function resolveMistakePattern(patternId: string) {
  const { schoolId } = await requireSchool();

  await db.mistakePattern.updateMany({
    where: { id: patternId, schoolId },
    data: { resolved: true },
  });
}

// ── Get mistake summary stats for a school ───────────────────────────────

export async function getSchoolMistakeSummary() {
  const { schoolId } = await requireSchool();

  const topPatterns = await db.mistakePattern.groupBy({
    by: ["skill", "errorType"],
    where: { schoolId, resolved: false },
    _sum: { occurrences: true },
    _count: true,
    orderBy: { _sum: { occurrences: "desc" } },
    take: 10,
  });

  const topGaps = await db.mistakePattern.groupBy({
    by: ["prerequisiteGap"],
    where: { schoolId, resolved: false, prerequisiteGap: { not: null } },
    _sum: { occurrences: true },
    orderBy: { _sum: { occurrences: "desc" } },
    take: 5,
  });

  return {
    topPatterns: topPatterns.map((p) => ({
      skill: p.skill,
      errorType: p.errorType,
      totalOccurrences: p._sum.occurrences ?? 0,
      studentCount: p._count,
    })),
    topPrerequisiteGaps: topGaps
      .filter((g) => g.prerequisiteGap)
      .map((g) => ({
        gap: g.prerequisiteGap!,
        totalOccurrences: g._sum.occurrences ?? 0,
      })),
  };
}
