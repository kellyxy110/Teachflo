"use server";

import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";

export interface StudentContext {
  studentId: string;
  name: string;
  classLevel: string;
  skills: Array<{
    skill: string;
    topic: string | null;
    total: number;
    correct: number;
    percentage: number;
  }>;
  weakSkills: Array<{
    skill: string;
    topic: string | null;
    percentage: number;
  }>;
  recentMistakes: Array<{
    questionStem: string;
    selectedOption: string | null;
    correctOption: string | null;
    explanation: string;
    misconception: string | null;
    subject: string;
    answeredAt: Date;
  }>;
  recommendedTopics: string[];
}

export async function getStudentContext(
  studentId: string
): Promise<StudentContext | null> {
  const { schoolId } = await requireSchool();

  const student = await db.student.findFirst({
    where: { id: studentId, schoolId },
    include: { class: true },
  });
  if (!student) return null;

  const skills = await db.$queryRawUnsafe<
    Array<{
      skill: string;
      topic: string | null;
      total: number;
      correct: number;
      percentage: number;
    }>
  >(
    `SELECT
       qt.skill,
       qt.topic,
       COUNT(qr.id)::int as total,
       COUNT(CASE WHEN qr."isCorrect" = true THEN 1 END)::int as correct,
       ROUND(
         COUNT(CASE WHEN qr."isCorrect" = true THEN 1 END) * 100.0
         / NULLIF(COUNT(qr.id), 0), 1
       ) as percentage
     FROM question_responses qr
     JOIN exam_attempts ea ON ea.id = qr."attemptId"
     JOIN question_tags qt ON qt."questionId" = qr."questionId"
     WHERE ea."studentId" = $1 AND ea."schoolId" = $2
     GROUP BY qt.skill, qt.topic
     ORDER BY percentage ASC`,
    studentId,
    schoolId
  );

  const weakSkills = skills.filter((s) => s.percentage < 50);

  const recentMistakes = await db.$queryRawUnsafe<
    Array<{
      questionStem: string;
      selectedOption: string | null;
      correctOption: string | null;
      explanation: string;
      misconception: string | null;
      subject: string;
      answeredAt: Date;
    }>
  >(
    `SELECT
       q.stem as "questionStem",
       qr."selectedOption",
       q."correctOption",
       q.explanation,
       qr.misconception,
       e.subject,
       qr."createdAt" as "answeredAt"
     FROM question_responses qr
     JOIN exam_attempts ea ON ea.id = qr."attemptId"
     JOIN questions q ON q.id = qr."questionId"
     JOIN exams e ON e.id = q."examId"
     WHERE ea."studentId" = $1
       AND ea."schoolId" = $2
       AND qr."isCorrect" = false
     ORDER BY qr."createdAt" DESC
     LIMIT 10`,
    studentId,
    schoolId
  );

  const recommendedTopics = weakSkills
    .slice(0, 5)
    .map((s) => s.topic || s.skill);

  return {
    studentId,
    name: `${student.firstName} ${student.lastName}`,
    classLevel: student.class.level,
    skills,
    weakSkills,
    recentMistakes,
    recommendedTopics,
  };
}

export async function getStudentsForTeacher() {
  const { schoolId } = await requireSchool();

  return db.student.findMany({
    where: { schoolId, isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      regNumber: true,
      class: { select: { name: true, level: true } },
    },
    orderBy: [{ class: { name: "asc" } }, { lastName: "asc" }],
  });
}
