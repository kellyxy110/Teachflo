"use server";

import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { computeLearningPath, generateStepContent } from "@/lib/intelligence/adaptive-engine";
import { buildMistakeReport } from "@/lib/intelligence/mistake-engine";
import type { LearningPathData, SkillNode } from "@/lib/intelligence/types";
import type { Prisma } from "@prisma/client";

// ── Generate or refresh a learning path ──────────────────────────────────

export async function generateLearningPath(studentId: string, subject: string) {
  const { schoolId } = await requireSchool();

  const student = await db.student.findFirst({
    where: { id: studentId, schoolId },
    include: { class: true },
  });
  if (!student) throw new Error("Student not found");

  const skills = await db.$queryRawUnsafe<SkillNode[]>(
    `SELECT qt.skill, qt.topic, qt."bloomsLevel",
       COUNT(qr.id)::int as total,
       COUNT(CASE WHEN qr."isCorrect" = true THEN 1 END)::int as correct,
       ROUND(COUNT(CASE WHEN qr."isCorrect" = true THEN 1 END) * 100.0
         / NULLIF(COUNT(qr.id), 0), 1) as percentage,
       'stable' as trend
     FROM question_responses qr
     JOIN exam_attempts ea ON ea.id = qr."attemptId"
     JOIN question_tags qt ON qt."questionId" = qr."questionId"
     JOIN exams e ON e.id = ea."examId"
     WHERE ea."studentId" = $1 AND ea."schoolId" = $2
       AND e.subject = $3
     GROUP BY qt.skill, qt.topic, qt."bloomsLevel"
     ORDER BY percentage ASC`,
    studentId,
    schoolId,
    subject
  );

  const mistakePatterns = await db.mistakePattern.findMany({
    where: { studentId, schoolId },
  });

  const recentMistakes = await db.$queryRawUnsafe<
    Array<{ questionStem: string; errorType: string; misconception: string; subject: string; date: Date }>
  >(
    `SELECT q.stem as "questionStem",
       COALESCE(qr."errorType", 'unknown') as "errorType",
       COALESCE(qr.misconception, '') as misconception,
       e.subject, qr."createdAt" as date
     FROM question_responses qr
     JOIN exam_attempts ea ON ea.id = qr."attemptId"
     JOIN questions q ON q.id = qr."questionId"
     JOIN exams e ON e.id = q."examId"
     WHERE ea."studentId" = $1 AND ea."schoolId" = $2
       AND qr."isCorrect" = false AND e.subject = $3
     ORDER BY qr."createdAt" DESC LIMIT 10`,
    studentId,
    schoolId,
    subject
  );

  const mistakeReport = buildMistakeReport(studentId, mistakePatterns, recentMistakes);

  const existing = await db.learningPath.findUnique({
    where: { studentId_subject: { studentId, subject } },
  });

  const existingData = existing?.steps
    ? (existing.steps as unknown as LearningPathData)
    : undefined;

  const path = computeLearningPath({
    studentId,
    subject,
    classLevel: student.class.level,
    skills,
    mistakeReport,
    existingPath: existingData,
  });

  await db.learningPath.upsert({
    where: { studentId_subject: { studentId, subject } },
    create: {
      studentId,
      schoolId,
      subject,
      classLevel: student.class.level,
      steps: path as unknown as Prisma.InputJsonValue,
      currentStep: path.currentStep,
      status: "ACTIVE",
    },
    update: {
      steps: path as unknown as Prisma.InputJsonValue,
      currentStep: path.currentStep,
      lastComputedAt: new Date(),
    },
  });

  revalidatePath("/intelligence");
  return path;
}

// ── Get student's learning path ──────────────────────────────────────────

export async function getStudentLearningPath(studentId: string, subject: string) {
  const { schoolId } = await requireSchool();

  const path = await db.learningPath.findUnique({
    where: { studentId_subject: { studentId, subject } },
  });
  if (!path || path.schoolId !== schoolId) return null;

  return {
    id: path.id,
    subject: path.subject,
    classLevel: path.classLevel,
    currentStep: path.currentStep,
    status: path.status,
    lastComputedAt: path.lastComputedAt,
    data: path.steps as unknown as LearningPathData,
  };
}

// ── Advance to next step ─────────────────────────────────────────────────

export async function advanceLearningStep(pathId: string) {
  const { schoolId } = await requireSchool();

  const path = await db.learningPath.findUnique({ where: { id: pathId } });
  if (!path || path.schoolId !== schoolId) throw new Error("Path not found");

  const data = path.steps as unknown as LearningPathData;
  if (path.currentStep < data.steps.length - 1) {
    data.steps[path.currentStep].status = "completed";
    data.steps[path.currentStep].completedAt = new Date().toISOString();
    data.steps[path.currentStep + 1].status = "active";
    data.completedSteps += 1;
    data.currentStep = path.currentStep + 1;

    await db.learningPath.update({
      where: { id: pathId },
      data: {
        currentStep: path.currentStep + 1,
        steps: data as unknown as Prisma.InputJsonValue,
      },
    });
  }

  revalidatePath("/intelligence");
  return data;
}

// ── Get step content (AI-generated) ──────────────────────────────────────

export async function getStepContent(pathId: string, stepIndex: number) {
  const { schoolId } = await requireSchool();

  const path = await db.learningPath.findUnique({ where: { id: pathId } });
  if (!path || path.schoolId !== schoolId) throw new Error("Path not found");

  const data = path.steps as unknown as LearningPathData;
  const step = data.steps[stepIndex];
  if (!step) throw new Error("Step not found");

  const content = await generateStepContent(step, path.subject, path.classLevel);
  return { step, content };
}

// ── List all paths for a student ─────────────────────────────────────────

export async function getStudentPaths(studentId: string) {
  const { schoolId } = await requireSchool();

  return db.learningPath.findMany({
    where: { studentId, schoolId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      subject: true,
      classLevel: true,
      currentStep: true,
      status: true,
      lastComputedAt: true,
      steps: true,
    },
  });
}
