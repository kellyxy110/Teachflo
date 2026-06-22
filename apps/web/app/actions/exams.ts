"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import type { ClassLevel, ExamType, Difficulty, Prisma } from "@prisma/client";

type GeneratedQuestion = {
  number: number;
  stem?: string;
  questionText?: string;
  options?: { A: string; B: string; C: string; D: string };
  correctOption?: string;
  marks?: number;
  markScheme?: string;
  solution?: string;
  explanation?: string;
  distractorAnalysis?: Record<string, string>;
  commonMistakes?: string;
  examTip?: string;
  curriculumRef?: string;
};

type GeneratedExam = {
  exam: {
    title: string;
    subject: string;
    topic: string;
    class: string;
    examType: string;
    difficulty: string;
    duration?: number;
    totalMarks?: number;
  };
  sections: {
    A?: { questions: GeneratedQuestion[] };
    B?: { questions: GeneratedQuestion[] };
    C?: { questions: GeneratedQuestion[] };
  };
};

export async function saveExam(data: {
  subject: string;
  classLevel: ClassLevel;
  topic: string;
  examType: ExamType;
  difficulty: Difficulty;
  generated: GeneratedExam;
}) {
  const { schoolId, teacher } = await requireSchool();

  const exam = await db.exam.create({
    data: {
      schoolId,
      teacherId: teacher.id,
      title: data.generated.exam.title || `${data.subject} — ${data.topic}`,
      subject: data.subject,
      topic: data.topic,
      classLevel: data.classLevel,
      examType: data.examType,
      difficulty: data.difficulty,
      duration: data.generated.exam.duration ?? null,
      aiModel: "openrouter/free-tier",
    },
  });

  const questionRows: Prisma.QuestionCreateManyInput[] = [];

  const sections = [
    { key: "A" as const, type: "MCQ" as const },
    { key: "B" as const, type: "ESSAY" as const },
    { key: "C" as const, type: "STRUCTURED" as const },
  ];

  for (const { key, type } of sections) {
    const qs = data.generated.sections[key]?.questions ?? [];
    for (const q of qs) {
      questionRows.push({
        examId: exam.id,
        section: key,
        number: q.number,
        type,
        stem: q.stem ?? q.questionText ?? "",
        optionA: q.options?.A ?? null,
        optionB: q.options?.B ?? null,
        optionC: q.options?.C ?? null,
        optionD: q.options?.D ?? null,
        correctOption: q.correctOption ?? null,
        questionText: q.questionText ?? null,
        markScheme: q.markScheme ?? null,
        solution: q.solution ?? "",
        explanation: q.explanation ?? "",
        distractors: q.distractorAnalysis as Prisma.InputJsonValue | undefined,
        commonMistakes: q.commonMistakes ?? null,
        examTip: q.examTip ?? null,
        curriculumRef: q.curriculumRef ?? null,
      });
    }
  }

  if (questionRows.length > 0) {
    await db.question.createMany({ data: questionRows });
  }

  revalidatePath("/exams");
  return exam.id;
}

export async function deleteExam(examId: string) {
  const { schoolId } = await requireSchool();
  await db.exam.deleteMany({ where: { id: examId, schoolId } });
  revalidatePath("/exams");
  redirect("/exams");
}

export async function getExams() {
  const { schoolId } = await requireSchool();
  return db.exam.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });
}

export async function getExam(examId: string) {
  const { schoolId } = await requireSchool();
  return db.exam.findFirst({
    where: { id: examId, schoolId },
    include: {
      questions: { orderBy: [{ section: "asc" }, { number: "asc" }] },
    },
  });
}
