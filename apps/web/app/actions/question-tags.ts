"use server";

import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import { routedChat } from "@/lib/ai/router";

// ── Auto-tag questions using AI ────────────────────────────────────────────

export async function autoTagQuestions(examId: string) {
  const { schoolId } = await requireSchool();

  const exam = await db.exam.findFirst({
    where: { id: examId, schoolId },
    include: { questions: true },
  });
  if (!exam) throw new Error("Exam not found");

  let tagged = 0;

  for (const question of exam.questions) {
    const text = question.stem || question.questionText || "";
    if (!text) continue;

    try {
      const response = await routedChat({
        message: `Analyze this ${exam.subject} (${exam.classLevel}) exam question and return ONLY a JSON object:
{
  "skill": "specific-skill-slug",
  "topic": "broader topic name",
  "subtopic": "narrow subtopic",
  "bloomsLevel": "REMEMBER|UNDERSTAND|APPLY|ANALYZE|EVALUATE|CREATE"
}

Question: ${text}`,
        systemPrompt:
          "You are a curriculum tagging system for Nigerian secondary schools. Return ONLY valid JSON, no markdown, no explanation.",
      });

      const raw = response.content.replace(/```json?\n?|\n?```/g, "").trim();
      const tags = JSON.parse(raw);

      const bloomsValid = [
        "REMEMBER",
        "UNDERSTAND",
        "APPLY",
        "ANALYZE",
        "EVALUATE",
        "CREATE",
      ];

      await db.questionTag.upsert({
        where: {
          questionId_skill: {
            questionId: question.id,
            skill: String(tags.skill),
          },
        },
        create: {
          questionId: question.id,
          skill: String(tags.skill),
          topic: tags.topic ? String(tags.topic) : null,
          subtopic: tags.subtopic ? String(tags.subtopic) : null,
          bloomsLevel: bloomsValid.includes(tags.bloomsLevel)
            ? tags.bloomsLevel
            : null,
        },
        update: {
          topic: tags.topic ? String(tags.topic) : null,
          subtopic: tags.subtopic ? String(tags.subtopic) : null,
          bloomsLevel: bloomsValid.includes(tags.bloomsLevel)
            ? tags.bloomsLevel
            : null,
        },
      });

      tagged++;
    } catch {
      // Skip questions that fail to tag
    }
  }

  return { total: exam.questions.length, tagged };
}

// ── Student Skill Map ──────────────────────────────────────────────────────

export async function getStudentSkillMap(studentId: string) {
  const { schoolId } = await requireSchool();

  return db.$queryRawUnsafe<
    Array<{
      skill: string;
      topic: string | null;
      total: number;
      correct: number;
      percentage: number;
      bloomsLevel: string | null;
    }>
  >(
    `SELECT
       qt.skill,
       qt.topic,
       qt."bloomsLevel",
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
     GROUP BY qt.skill, qt.topic, qt."bloomsLevel"
     ORDER BY percentage ASC`,
    studentId,
    schoolId
  );
}

// ── Weak skills (for adaptive learning) ────────────────────────────────────

export async function getWeakSkills(
  studentId: string,
  threshold = 50
) {
  const skills = await getStudentSkillMap(studentId);
  return skills.filter((s) => s.percentage < threshold);
}
