"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import type { ClassLevel, ExamType, Difficulty, Section, QuestionType, BloomsLevel } from "@prisma/client";

export interface ManualQuestionInput {
  examId?: string;
  subject: string;
  classLevel: ClassLevel;
  topic: string;
  examType: ExamType;
  difficulty: Difficulty;
  questionType: QuestionType;
  section: Section;
  stem: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  optionE?: string;
  correctOption?: string;
  questionText?: string;
  markScheme?: string;
  solution: string;
  explanation: string;
  commonMistakes?: string;
  examTip?: string;
  curriculumRef?: string;
  bloomLevel?: string;
  skillTag?: string;
  topicTag?: string;
  subTopicTag?: string;
  estimatedTime?: number;
}

export async function saveManualQuestion(input: ManualQuestionInput) {
  const { schoolId, teacher } = await requireSchool();

  let examId = input.examId;

  if (!examId) {
    const exam = await db.exam.create({
      data: {
        schoolId,
        teacherId: teacher.id,
        title: `${input.subject} — ${input.topic} (Manual)`,
        subject: input.subject,
        topic: input.topic,
        classLevel: input.classLevel,
        examType: input.examType,
        difficulty: input.difficulty,
        examMode: "STANDARD",
      },
    });
    examId = exam.id;
  }

  const existingCount = await db.question.count({ where: { examId } });

  const question = await db.question.create({
    data: {
      examId,
      section: input.section,
      number: existingCount + 1,
      type: input.questionType,
      stem: input.stem,
      optionA: input.optionA ?? null,
      optionB: input.optionB ?? null,
      optionC: input.optionC ?? null,
      optionD: input.optionD ?? null,
      optionE: input.optionE ?? null,
      correctOption: input.correctOption ?? null,
      questionText: input.questionText ?? null,
      markScheme: input.markScheme ?? null,
      solution: input.solution,
      explanation: input.explanation,
      commonMistakes: input.commonMistakes ?? null,
      examTip: input.examTip ?? null,
      curriculumRef: input.curriculumRef ?? null,
      difficulty: input.difficulty.toLowerCase(),
      bloomLevel: input.bloomLevel ?? null,
      skillTag: input.skillTag ?? null,
      topicTag: input.topicTag ?? input.topic,
      subTopicTag: input.subTopicTag ?? null,
      estimatedTime: input.estimatedTime ?? 90,
      questionSource: "manual",
    },
  });

  if (input.skillTag) {
    await db.questionTag.create({
      data: {
        questionId: question.id,
        skill: input.skillTag,
        topic: input.topicTag ?? input.topic,
        subtopic: input.subTopicTag ?? null,
        bloomsLevel: (input.bloomLevel as BloomsLevel) ?? null,
      },
    });
  }

  revalidatePath("/exams");
  revalidatePath(`/exams/${examId}`);
  return { questionId: question.id, examId };
}

export async function bulkImportQuestions(
  examId: string,
  questions: {
    stem: string;
    type: string;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    optionE?: string;
    correctOption?: string;
    solution: string;
    explanation: string;
    section?: string;
    difficulty?: string;
  }[],
) {
  const { schoolId } = await requireSchool();

  const exam = await db.exam.findFirst({
    where: { id: examId, schoolId },
  });
  if (!exam) throw new Error("Exam not found");

  const existingCount = await db.question.count({ where: { examId } });

  const ops = questions.map((q, i) =>
    db.question.create({
      data: {
        examId,
        section: (q.section === "B" ? "B" : q.section === "C" ? "C" : "A") as "A" | "B" | "C",
        number: existingCount + i + 1,
        type: (["MCQ", "SHORT_ANSWER", "ESSAY", "STRUCTURED", "CALCULATION"].includes(q.type) ? q.type : "MCQ") as QuestionType,
        stem: q.stem,
        optionA: q.optionA ?? null,
        optionB: q.optionB ?? null,
        optionC: q.optionC ?? null,
        optionD: q.optionD ?? null,
        optionE: q.optionE ?? null,
        correctOption: q.correctOption ?? null,
        solution: q.solution,
        explanation: q.explanation,
        difficulty: q.difficulty?.toLowerCase() ?? "medium",
        questionSource: "excel-import",
      },
    }),
  );

  await db.$transaction(ops);

  await db.exam.update({
    where: { id: examId },
    data: { totalQuestions: existingCount + questions.length },
  });

  revalidatePath("/exams");
  revalidatePath(`/exams/${examId}`);
  return { imported: questions.length };
}

export async function getTeacherExams() {
  const { schoolId } = await requireSchool();
  return db.exam.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      subject: true,
      topic: true,
      classLevel: true,
      _count: { select: { questions: true } },
    },
    take: 50,
  });
}
