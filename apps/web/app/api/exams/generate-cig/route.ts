import { buildCIGExamPrompt, type CIGContext, type Difficulty } from "@teachflow/ai-prompts";
import { safeAuth, requireSchool } from "@/lib/auth";
import { openRouterCompletion, EXAM_MODELS } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";
import { getNode, getTopicContext } from "@/lib/curriculum-graph";
import { getAICache, setAICache, makeCacheKey } from "@/lib/ai-cache";
import { validateMCQArray } from "@/lib/ai-validator";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { QuestionType } from "@prisma/client";

export const maxDuration = 120;

type GeneratedQuestion = {
  stem: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: string;
  solution: string;
  explanation: string;
  commonMistakes?: string;
  examTip?: string;
  bloomLevel?: string;
};

export async function POST(request: Request) {
  let userId: string | null = null;
  try {
    const auth = await safeAuth();
    userId = auth.userId;
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ok } = await rateLimit(`cig-exam-gen:${userId}`);
  if (!ok) {
    return Response.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  let body: {
    nodeId: string;
    difficulty?: string;
    mcqCount?: number;
    examId?: string;
    saveToExam?: boolean;
    newExamTitle?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { nodeId, difficulty = "WAEC", mcqCount = 10, examId, saveToExam, newExamTitle } = body;

  if (!nodeId?.trim()) {
    return Response.json({ error: "nodeId is required" }, { status: 400 });
  }

  const validDifficulties: Difficulty[] = ["BASIC", "APPLICATION", "WAEC", "JAMB", "JUPEB"];
  if (!validDifficulties.includes(difficulty as Difficulty)) {
    return Response.json({ error: "Invalid difficulty" }, { status: 400 });
  }

  const count = Math.min(Math.max(5, mcqCount), 40);

  // Fetch CIG node + context
  const node = await getNode(nodeId);
  if (!node || node.type !== "TOPIC") {
    return Response.json({ error: "Topic not found in curriculum graph" }, { status: 404 });
  }

  const ctx = await getTopicContext(nodeId);

  const cigContext: CIGContext = {
    description: node.description ?? "",
    bloomLevels: ctx.bloomLevels,
    examStandards: ctx.examStandards,
    keywords: node.keywords,
    misconceptions: ctx.misconceptions,
    formulae: ctx.formulae,
    prerequisites: ctx.prerequisites.map((p) => p.label),
    crossSubjectConnections: ctx.crossSubjectConnections.map((c) => ({
      topic: c.node.label,
      subject: c.subject,
    })),
    difficulty: node.difficulty ?? "MEDIUM",
  };

  const subject = node.subject ?? "General";
  const classLevel = node.classLevel
    ? node.classLevel.replace(/^JS(\d)$/, "JSS$1")
    : "SS1";
  const topic = node.label;

  const cacheKey = makeCacheKey({ nodeId, difficulty, count: String(count) });

  // Check cache before calling AI
  const cached = await getAICache(cacheKey);
  let questions: GeneratedQuestion[];

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      questions = Array.isArray(parsed) ? parsed : (parsed.questions ?? []);
    } catch {
      // Cache corrupt — fall through to AI
      questions = [];
    }
  } else {
    questions = [];
  }

  if (!questions.length) {
    const prompt = buildCIGExamPrompt({
      subject,
      classLevel,
      topic,
      difficulty: difficulty as Difficulty,
      mcqCount: count,
      cigContext,
    });

    let raw: string;
    try {
      const { completion } = await openRouterCompletion(
        EXAM_MODELS,
        [{ role: "user", content: prompt }],
        { temperature: 0.4, max_tokens: 8000, json: true },
      );
      raw = completion.choices[0]?.message?.content ?? "[]";
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI generation failed";
      return Response.json({ error: msg }, { status: 502 });
    }

    try {
      const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      const rawArray = Array.isArray(parsed) ? parsed : (parsed.questions ?? []);
      questions = validateMCQArray(rawArray);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to parse AI response";
      return Response.json({ error: msg }, { status: 500 });
    }

    // Cache for future requests with same nodeId + difficulty + count
    void setAICache(cacheKey, JSON.stringify(questions));
  }

  if (!questions.length) {
    return Response.json({ error: "AI returned no questions" }, { status: 500 });
  }

  // Save to exam if requested
  if (saveToExam) {
    try {
      const { schoolId, teacher } = await requireSchool();

      let targetExamId = examId;

      if (!targetExamId) {
        const title = newExamTitle?.trim() || `${subject} — ${topic} (AI)`;
        const exam = await db.exam.create({
          data: {
            schoolId,
            teacherId: teacher.id,
            title,
            subject,
            topic,
            classLevel: node.classLevel ?? "SS1",
            examType: "SCHOOL_EXAM",
            difficulty: difficulty as Difficulty,
            examMode: "STANDARD",
          },
        });
        targetExamId = exam.id;
      } else {
        const exam = await db.exam.findFirst({ where: { id: targetExamId, schoolId } });
        if (!exam) return Response.json({ error: "Exam not found" }, { status: 404 });
      }

      const existingCount = await db.question.count({ where: { examId: targetExamId } });

      const ops = questions.map((q, i) =>
        db.question.create({
          data: {
            examId: targetExamId!,
            section: "A",
            number: existingCount + i + 1,
            type: "MCQ" as QuestionType,
            stem: q.stem,
            optionA: q.optionA ?? null,
            optionB: q.optionB ?? null,
            optionC: q.optionC ?? null,
            optionD: q.optionD ?? null,
            correctOption: q.correctOption ?? null,
            solution: q.solution,
            explanation: q.explanation,
            commonMistakes: q.commonMistakes ?? null,
            examTip: q.examTip ?? null,
            difficulty: difficulty.toLowerCase(),
            bloomLevel: q.bloomLevel ?? null,
            topicTag: topic,
            questionSource: "ai-cig",
          },
        }),
      );

      await db.$transaction(ops);
      await db.exam.update({
        where: { id: targetExamId },
        data: { totalQuestions: existingCount + questions.length },
      });

      revalidatePath("/exams");
      revalidatePath(`/exams/${targetExamId}`);

      return Response.json({ questions, saved: true, examId: targetExamId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save questions";
      return Response.json({ error: msg }, { status: 500 });
    }
  }

  return Response.json({ questions, saved: false, meta: { subject, classLevel, topic, nodeId } });
}
