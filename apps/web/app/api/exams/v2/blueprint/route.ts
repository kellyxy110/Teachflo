import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildBlueprint } from "@/lib/exam-v2/blueprint";
import type { ExamModeType } from "@/lib/exam-v2/types";

export async function POST(request: Request) {
  try {
    const { userId } = await safeAuth();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { subject, classLevel, topic, mode, studentId, totalQuestions } = body;

  if (!subject || !classLevel || !topic || !mode || !studentId) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const teacher = await db.teacher.findUnique({ where: { clerkId: (await (await import("@clerk/nextjs/server")).auth()).userId! } });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 403 });

  const skills = await db.$queryRawUnsafe<
    Array<{ skill: string; topic: string | null; total: number; correct: number; percentage: number; bloomsLevel: string | null }>
  >(
    `SELECT qt.skill, qt.topic, qt."bloomsLevel",
       COUNT(qr.id)::int as total,
       COUNT(CASE WHEN qr."isCorrect" = true THEN 1 END)::int as correct,
       ROUND(COUNT(CASE WHEN qr."isCorrect" = true THEN 1 END) * 100.0
         / NULLIF(COUNT(qr.id), 0), 1) as percentage
     FROM question_responses qr
     JOIN exam_attempts ea ON ea.id = qr."attemptId"
     JOIN question_tags qt ON qt."questionId" = qr."questionId"
     WHERE ea."studentId" = $1 AND ea."schoolId" = $2
     GROUP BY qt.skill, qt.topic, qt."bloomsLevel"`,
    studentId,
    teacher.schoolId
  );

  const blueprint = buildBlueprint({
    studentId,
    subject,
    classLevel,
    topic,
    mode: mode as ExamModeType,
    skills,
    totalQuestions,
  });

  return Response.json(blueprint);
}
