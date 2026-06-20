"use server";

import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { generateCurriculumPlan } from "@/lib/intelligence/curriculum-engine";
import { retrieveRAGContext } from "@/lib/rag/retriever";
import type { CurriculumPlanData } from "@/lib/intelligence/types";
import type { Prisma } from "@prisma/client";

// ── Generate a curriculum plan ───────────────────────────────────────────

export async function createCurriculumPlan(params: {
  subject: string;
  classLevel: string;
  term: string;
  session: string;
  totalWeeks?: number;
}) {
  const { schoolId, teacher } = await requireSchool();
  const totalWeeks = params.totalWeeks ?? 13;

  // Gather class performance data
  const classPerf = await db.$queryRawUnsafe<
    Array<{ topic: string; avgScore: number }>
  >(
    `SELECT qt.topic,
       ROUND(AVG(CASE WHEN qr."isCorrect" THEN 100 ELSE 0 END), 1) as "avgScore"
     FROM question_responses qr
     JOIN exam_attempts ea ON ea.id = qr."attemptId"
     JOIN question_tags qt ON qt."questionId" = qr."questionId"
     JOIN exams e ON e.id = ea."examId"
     WHERE ea."schoolId" = $1 AND e.subject = $2 AND qt.topic IS NOT NULL
     GROUP BY qt.topic
     ORDER BY "avgScore" ASC`,
    schoolId,
    params.subject
  );

  const classAvg = await db.$queryRawUnsafe<[{ avg: number }]>(
    `SELECT ROUND(AVG(ea.percentage), 1) as avg
     FROM exam_attempts ea
     JOIN exams e ON e.id = ea."examId"
     WHERE ea."schoolId" = $1 AND e.subject = $2 AND ea.percentage IS NOT NULL`,
    schoolId,
    params.subject
  );

  const commonMistakes = await db.mistakePattern.groupBy({
    by: ["pattern"],
    where: { schoolId },
    _sum: { occurrences: true },
    orderBy: { _sum: { occurrences: "desc" } },
    take: 5,
  });

  const weakTopics = classPerf.filter((t) => t.avgScore < 50).map((t) => t.topic);
  const strongTopics = classPerf.filter((t) => t.avgScore >= 75).map((t) => t.topic);

  // Get RAG context if available
  let syllabusContext = "";
  try {
    const chunks = await retrieveRAGContext(
      `${params.subject} syllabus curriculum ${params.classLevel} ${params.term}`,
      schoolId,
      5
    );
    if (chunks.length > 0) {
      syllabusContext = chunks.map((c) => c.content).join("\n\n");
    }
  } catch { /* No RAG available */ }

  const plan = await generateCurriculumPlan({
    subject: params.subject,
    classLevel: params.classLevel,
    term: params.term,
    totalWeeks,
    syllabusContext: syllabusContext || undefined,
    performanceData: classPerf.length > 0
      ? {
          classAverage: classAvg[0]?.avg ?? 0,
          weakTopics,
          strongTopics,
          commonMistakes: commonMistakes.map((m) => m.pattern),
        }
      : undefined,
  });

  const title = `${params.subject} — ${params.classLevel} — ${params.term} Term ${params.session}`;

  const saved = await db.curriculumPlan.upsert({
    where: {
      schoolId_subject_classLevel_term_session: {
        schoolId,
        subject: params.subject,
        classLevel: params.classLevel,
        term: params.term,
        session: params.session,
      },
    },
    create: {
      schoolId,
      teacherId: teacher.id,
      subject: params.subject,
      classLevel: params.classLevel,
      term: params.term,
      session: params.session,
      title,
      weeks: plan.weeks as unknown as Prisma.InputJsonValue,
      assessmentSchedule: plan.assessmentSchedule as unknown as Prisma.InputJsonValue,
      revisionCycles: plan.revisionCycles as unknown as Prisma.InputJsonValue,
      performanceContext: {
        classAverage: classAvg[0]?.avg ?? null,
        weakTopics,
        strongTopics,
      } as unknown as Prisma.InputJsonValue,
      aiModel: "multi-model-v2",
    },
    update: {
      title,
      weeks: plan.weeks as unknown as Prisma.InputJsonValue,
      assessmentSchedule: plan.assessmentSchedule as unknown as Prisma.InputJsonValue,
      revisionCycles: plan.revisionCycles as unknown as Prisma.InputJsonValue,
      performanceContext: {
        classAverage: classAvg[0]?.avg ?? null,
        weakTopics,
        strongTopics,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/intelligence");
  return { planId: saved.id, plan };
}

// ── Get a curriculum plan ────────────────────────────────────────────────

export async function getCurriculumPlan(planId: string) {
  const { schoolId } = await requireSchool();

  const plan = await db.curriculumPlan.findFirst({
    where: { id: planId, schoolId },
  });
  if (!plan) return null;

  return {
    ...plan,
    weeks: plan.weeks as unknown as CurriculumPlanData["weeks"],
    assessmentSchedule: plan.assessmentSchedule as unknown as CurriculumPlanData["assessmentSchedule"],
    revisionCycles: plan.revisionCycles as unknown as CurriculumPlanData["revisionCycles"],
  };
}

// ── List curriculum plans ────────────────────────────────────────────────

export async function getCurriculumPlans() {
  const { schoolId } = await requireSchool();

  return db.curriculumPlan.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      subject: true,
      classLevel: true,
      term: true,
      session: true,
      createdAt: true,
    },
  });
}

// ── Delete a curriculum plan ─────────────────────────────────────────────

export async function deleteCurriculumPlan(planId: string) {
  const { schoolId } = await requireSchool();
  await db.curriculumPlan.deleteMany({
    where: { id: planId, schoolId },
  });
  revalidatePath("/intelligence");
}
