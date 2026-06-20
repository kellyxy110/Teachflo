"use server";

import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { buildBlueprint } from "@/lib/exam-v2/blueprint";
import { generateQuestionsFromBlueprint, generateSingleAdaptiveQuestion } from "@/lib/exam-v2/generator";
import { createInitialState, adaptDifficulty } from "@/lib/exam-v2/difficulty";
import { detectMisconception } from "@/lib/exam-v2/misconception";
import { computePostExamAnalytics } from "@/lib/exam-v2/analytics";
import { processMistake } from "@/app/actions/mistake-intelligence";
import type { ExamBlueprint, ExamModeType, AdaptiveState, DifficultyLevel } from "@/lib/exam-v2/types";
import type { ClassLevel, ExamType, Difficulty, Prisma } from "@prisma/client";

function computeGrade(percentage: number): string {
  if (percentage >= 70) return "A";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 45) return "D";
  if (percentage >= 40) return "E";
  return "F";
}

// ── Create adaptive exam with blueprint ──────────────────────────────────

export async function createAdaptiveExam(params: {
  subject: string;
  classLevel: ClassLevel;
  topic: string;
  examType: ExamType;
  difficulty: Difficulty;
  mode: ExamModeType;
  studentId: string;
  totalQuestions?: number;
}) {
  const { schoolId, teacher } = await requireSchool();

  const student = await db.student.findFirst({
    where: { id: params.studentId, schoolId },
  });
  if (!student) throw new Error("Student not found");

  const skills = await db.$queryRawUnsafe<
    Array<{
      skill: string;
      topic: string | null;
      total: number;
      correct: number;
      percentage: number;
      bloomsLevel: string | null;
    }>
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
     GROUP BY qt.skill, qt.topic, qt."bloomsLevel"
     ORDER BY percentage ASC`,
    params.studentId,
    schoolId
  );

  const hasDocuments = await db.$queryRawUnsafe<[{ count: number }]>(
    `SELECT COUNT(*)::int as count FROM document_chunks WHERE "schoolId" = $1`,
    schoolId
  );
  const ragAvailable = (hasDocuments[0]?.count ?? 0) > 0;

  const blueprint = buildBlueprint({
    studentId: params.studentId,
    subject: params.subject,
    classLevel: params.classLevel,
    topic: params.topic,
    mode: params.mode,
    skills,
    totalQuestions: params.totalQuestions,
    ragAvailable,
  });

  const exam = await db.exam.create({
    data: {
      schoolId,
      teacherId: teacher.id,
      title: `${params.subject} — ${params.topic} (${params.mode})`,
      subject: params.subject,
      topic: params.topic,
      classLevel: params.classLevel,
      examType: params.examType,
      difficulty: params.difficulty,
      examMode: params.mode,
      blueprint: blueprint as unknown as Prisma.InputJsonValue,
      totalQuestions: blueprint.totalQuestions,
      targetStudentId: params.studentId,
      aiModel: "multi-model-v2",
    },
  });

  if (params.mode !== "ADAPTIVE") {
    const generated = await generateQuestionsFromBlueprint(blueprint, schoolId);

    const questionRows: Prisma.QuestionCreateManyInput[] = generated.map((q, i) => ({
      examId: exam.id,
      section: "A" as const,
      number: i + 1,
      type: q.type === "MCQ" ? "MCQ" : q.type === "STRUCTURED" ? "STRUCTURED" : "SHORT_ANSWER",
      stem: q.stem,
      optionA: q.optionA ?? null,
      optionB: q.optionB ?? null,
      optionC: q.optionC ?? null,
      optionD: q.optionD ?? null,
      correctOption: q.correctOption ?? null,
      solution: q.solution,
      explanation: q.explanation,
      distractors: q.distractorAnalysis as Prisma.InputJsonValue | undefined,
      commonMistakes: q.commonMistakes ?? null,
      difficulty: q.difficulty,
      bloomLevel: q.bloomLevel,
      skillTag: q.skillTag,
      topicTag: q.topicTag,
      subTopicTag: q.subTopicTag,
      questionSource: q.source,
      estimatedTime: q.estimatedTime,
    }));

    if (questionRows.length > 0) {
      await db.question.createMany({ data: questionRows });

      const createdQuestions = await db.question.findMany({
        where: { examId: exam.id },
        orderBy: { number: "asc" },
      });

      const tagRows: Prisma.QuestionTagCreateManyInput[] = createdQuestions.map((q) => ({
        questionId: q.id,
        skill: q.skillTag || params.topic,
        topic: q.topicTag || params.topic,
        subtopic: q.subTopicTag,
        bloomsLevel: (["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"].includes(q.bloomLevel ?? "")
          ? q.bloomLevel
          : null) as "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE" | "EVALUATE" | "CREATE" | null,
      }));

      await db.questionTag.createMany({ data: tagRows, skipDuplicates: true });
    }
  }

  const attempt = await db.examAttempt.create({
    data: {
      studentId: params.studentId,
      examId: exam.id,
      schoolId,
      examMode: params.mode,
      currentDifficulty: "medium",
      questionsAnswered: 0,
      adaptiveState: createInitialState() as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/exams");

  return {
    examId: exam.id,
    attemptId: attempt.id,
    blueprint,
    mode: params.mode,
    totalQuestions: blueprint.totalQuestions,
  };
}

// ── Get next adaptive question ───────────────────────────────────────────

export async function getNextAdaptiveQuestion(attemptId: string) {
  const { schoolId } = await requireSchool();

  const attempt = await db.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: { select: { id: true, blueprint: true, subject: true, topic: true, classLevel: true, totalQuestions: true, targetStudentId: true } },
    },
  });

  if (!attempt || attempt.schoolId !== schoolId) throw new Error("Attempt not found");
  if (attempt.status !== "IN_PROGRESS") throw new Error("Exam already completed");

  const blueprint = attempt.exam.blueprint as unknown as ExamBlueprint;
  const state = (attempt.adaptiveState as unknown as AdaptiveState) ?? createInitialState();
  const total = attempt.exam.totalQuestions ?? blueprint?.totalQuestions ?? 20;

  if (attempt.questionsAnswered >= total) {
    return { done: true, question: null };
  }

  const targetSkill = pickNextSkill(blueprint, state);

  const question = await generateSingleAdaptiveQuestion(
    blueprint,
    state.currentDifficulty,
    targetSkill,
    state.answeredQuestionIds,
    schoolId
  );

  const created = await db.question.create({
    data: {
      examId: attempt.examId,
      section: "A",
      number: attempt.questionsAnswered + 1,
      type: question.type === "MCQ" ? "MCQ" : question.type === "STRUCTURED" ? "STRUCTURED" : "SHORT_ANSWER",
      stem: question.stem,
      optionA: question.optionA ?? null,
      optionB: question.optionB ?? null,
      optionC: question.optionC ?? null,
      optionD: question.optionD ?? null,
      correctOption: question.correctOption ?? null,
      solution: question.solution,
      explanation: question.explanation,
      distractors: question.distractorAnalysis as Prisma.InputJsonValue | undefined,
      commonMistakes: question.commonMistakes ?? null,
      difficulty: question.difficulty,
      bloomLevel: question.bloomLevel,
      skillTag: question.skillTag,
      topicTag: question.topicTag,
      subTopicTag: question.subTopicTag,
      questionSource: question.source,
      estimatedTime: question.estimatedTime,
    },
  });

  await db.questionTag.create({
    data: {
      questionId: created.id,
      skill: question.skillTag,
      topic: question.topicTag,
      subtopic: question.subTopicTag,
      bloomsLevel: (["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"].includes(question.bloomLevel)
        ? question.bloomLevel
        : null) as "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE" | "EVALUATE" | "CREATE" | null,
    },
  });

  return {
    done: false,
    question: {
      id: created.id,
      number: attempt.questionsAnswered + 1,
      total,
      stem: question.stem,
      type: question.type,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      difficulty: question.difficulty,
      bloomLevel: question.bloomLevel,
      skillTag: question.skillTag,
      estimatedTime: question.estimatedTime,
    },
    currentDifficulty: state.currentDifficulty,
    progress: { answered: attempt.questionsAnswered, total },
  };
}

function pickNextSkill(blueprint: ExamBlueprint, state: AdaptiveState): string {
  const uncovered = blueprint.targetSkills.filter((s) => !state.coveredSkills.includes(s));
  if (uncovered.length > 0) {
    const weakUncovered = uncovered.filter((s) => blueprint.weakSkills.includes(s));
    if (weakUncovered.length > 0) return weakUncovered[0];
    return uncovered[0];
  }
  const weak = blueprint.weakSkills.filter((s) => blueprint.targetSkills.includes(s));
  if (weak.length > 0) return weak[Math.floor(Math.random() * weak.length)];
  return blueprint.targetSkills[Math.floor(Math.random() * blueprint.targetSkills.length)] ?? blueprint.topic;
}

// ── Submit single question response ──────────────────────────────────────

export async function submitQuestionResponse(params: {
  attemptId: string;
  questionId: string;
  selectedOption?: string;
  textResponse?: string;
  timeSpentSeconds: number;
}) {
  const { schoolId } = await requireSchool();

  const attempt = await db.examAttempt.findUnique({
    where: { id: params.attemptId },
    include: { exam: { select: { subject: true, topic: true } } },
  });
  if (!attempt || attempt.schoolId !== schoolId) throw new Error("Attempt not found");
  if (attempt.status !== "IN_PROGRESS") throw new Error("Exam already completed");

  const question = await db.question.findUnique({ where: { id: params.questionId } });
  if (!question) throw new Error("Question not found");

  let isCorrect: boolean | null = null;
  let score = 0;

  if (question.type === "MCQ" && params.selectedOption && question.correctOption) {
    isCorrect = params.selectedOption === question.correctOption;
    score = isCorrect ? 1 : 0;
  }

  let misconceptionData: { errorType: string; misconception: string; feedback: string } | null = null;

  if (isCorrect === false) {
    const result = await detectMisconception({
      questionStem: question.stem,
      correctAnswer: question.correctOption || question.solution,
      studentAnswer: params.selectedOption || params.textResponse || "",
      subject: attempt.exam.subject,
      topic: question.topicTag || attempt.exam.topic,
      explanation: question.explanation,
    });
    misconceptionData = {
      errorType: result.errorType,
      misconception: result.misconception,
      feedback: result.feedback,
    };

    processMistake({
      studentId: attempt.studentId,
      questionId: params.questionId,
      selectedOption: params.selectedOption || params.textResponse || "",
      subject: attempt.exam.subject,
      timeSpent: params.timeSpentSeconds,
    }).catch(() => {});
  }

  const state = (attempt.adaptiveState as unknown as AdaptiveState) ?? createInitialState();

  await db.questionResponse.create({
    data: {
      attemptId: params.attemptId,
      questionId: params.questionId,
      selectedOption: params.selectedOption ?? null,
      textResponse: params.textResponse ?? null,
      isCorrect,
      score,
      maxScore: 1,
      timeSpentSeconds: params.timeSpentSeconds,
      misconception: misconceptionData?.misconception ?? null,
      feedback: misconceptionData?.feedback ?? null,
      errorType: misconceptionData?.errorType ?? null,
      difficultyAtTime: state.currentDifficulty,
    },
  });

  const newState = adaptDifficulty(
    state,
    isCorrect ?? false,
    params.timeSpentSeconds,
    question.estimatedTime ?? 90
  );
  newState.answeredQuestionIds = [...(state.answeredQuestionIds ?? []), params.questionId];
  if (question.skillTag && !newState.coveredSkills.includes(question.skillTag)) {
    newState.coveredSkills = [...newState.coveredSkills, question.skillTag];
  }

  await db.examAttempt.update({
    where: { id: params.attemptId },
    data: {
      questionsAnswered: attempt.questionsAnswered + 1,
      currentDifficulty: newState.currentDifficulty,
      adaptiveState: newState as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    isCorrect,
    score,
    correctOption: question.correctOption,
    explanation: question.explanation,
    solution: question.solution,
    misconception: misconceptionData,
    newDifficulty: newState.currentDifficulty,
    questionsAnswered: attempt.questionsAnswered + 1,
  };
}

// ── Complete exam and compute analytics ──────────────────────────────────

export async function completeAdaptiveExam(attemptId: string) {
  const { schoolId } = await requireSchool();

  const attempt = await db.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: { select: { totalQuestions: true, blueprint: true } },
      responses: {
        include: {
          question: {
            select: {
              stem: true,
              skillTag: true,
              topicTag: true,
              difficulty: true,
              bloomLevel: true,
            },
          },
        },
      },
    },
  });
  if (!attempt || attempt.schoolId !== schoolId) throw new Error("Attempt not found");

  let totalScore = 0;
  let maxScore = 0;
  for (const r of attempt.responses) {
    totalScore += r.score ?? 0;
    maxScore += r.maxScore;
  }

  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const grade = computeGrade(percentage);

  const analytics = computePostExamAnalytics(
    attempt.responses.map((r) => ({
      questionId: r.questionId,
      isCorrect: r.isCorrect,
      score: r.score ?? 0,
      maxScore: r.maxScore,
      timeSpentSeconds: r.timeSpentSeconds,
      errorType: r.errorType,
      misconception: r.misconception,
      difficultyAtTime: r.difficultyAtTime,
      question: r.question,
    })),
    attempt.exam.totalQuestions ?? attempt.responses.length
  );

  await db.examAttempt.update({
    where: { id: attemptId },
    data: {
      status: "SUBMITTED",
      totalScore,
      maxScore,
      percentage,
      grade,
      submittedAt: new Date(),
      analytics: analytics as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/analytics");
  revalidatePath("/scores");
  revalidatePath("/exams");

  return { analytics, percentage, grade };
}

// ── Get exam for taking ──────────────────────────────────────────────────

export async function getExamForTaking(attemptId: string) {
  const { schoolId } = await requireSchool();

  const attempt = await db.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: {
          questions: {
            orderBy: { number: "asc" },
            select: {
              id: true,
              number: true,
              type: true,
              stem: true,
              optionA: true,
              optionB: true,
              optionC: true,
              optionD: true,
              difficulty: true,
              bloomLevel: true,
              skillTag: true,
              estimatedTime: true,
            },
          },
        },
      },
      student: { select: { firstName: true, lastName: true } },
      responses: { select: { questionId: true } },
    },
  });

  if (!attempt || attempt.schoolId !== schoolId) return null;

  const answeredIds = new Set(attempt.responses.map((r) => r.questionId));
  const blueprint = attempt.exam.blueprint as unknown as ExamBlueprint | null;

  return {
    attemptId: attempt.id,
    examId: attempt.examId,
    title: attempt.exam.title,
    subject: attempt.exam.subject,
    topic: attempt.exam.topic,
    classLevel: attempt.exam.classLevel,
    mode: attempt.examMode,
    status: attempt.status,
    studentName: `${attempt.student.firstName} ${attempt.student.lastName}`,
    totalQuestions: attempt.exam.totalQuestions ?? attempt.exam.questions.length,
    questionsAnswered: attempt.questionsAnswered,
    currentDifficulty: attempt.currentDifficulty,
    questions: attempt.exam.questions.map((q) => ({
      ...q,
      answered: answeredIds.has(q.id),
    })),
    blueprint,
    isAdaptive: attempt.examMode === "ADAPTIVE",
  };
}

// ── Get exam analytics ───────────────────────────────────────────────────

export async function getExamAnalyticsV2(attemptId: string) {
  const { schoolId } = await requireSchool();

  const attempt = await db.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: { select: { title: true, subject: true, topic: true, classLevel: true, examMode: true, blueprint: true } },
      student: { select: { firstName: true, lastName: true } },
      responses: {
        include: {
          question: {
            select: {
              stem: true,
              correctOption: true,
              explanation: true,
              skillTag: true,
              topicTag: true,
              difficulty: true,
              bloomLevel: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!attempt || attempt.schoolId !== schoolId) return null;

  return {
    attemptId: attempt.id,
    exam: attempt.exam,
    student: attempt.student,
    status: attempt.status,
    grade: attempt.grade,
    percentage: attempt.percentage,
    totalScore: attempt.totalScore,
    maxScore: attempt.maxScore,
    analytics: attempt.analytics as unknown as import("@/lib/exam-v2/types").PostExamAnalytics | null,
    responses: attempt.responses,
    blueprint: attempt.exam.blueprint as unknown as ExamBlueprint | null,
  };
}

// ── List v2 exams ────────────────────────────────────────────────────────

export async function getV2Exams() {
  const { schoolId } = await requireSchool();

  return db.exam.findMany({
    where: {
      schoolId,
      examMode: { not: "STANDARD" },
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { questions: true, attempts: true } },
      attempts: {
        select: {
          id: true,
          status: true,
          percentage: true,
          grade: true,
          questionsAnswered: true,
          student: { select: { firstName: true, lastName: true } },
        },
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
  });
}
