"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import type { ClassLevel, ExamType, Difficulty, Prisma } from "@prisma/client";
import { archiveExamForActor, deleteDraftExamForActor, publishExamForActor, saveExamDraftForActor, validateExamForPublication } from "@/lib/services/assessments/publication";

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
  const { schoolId, teacher } = await requireSchool();
  await deleteDraftExamForActor(examId, { schoolId, teacherId: teacher.id });
  revalidatePath("/exams");
  redirect("/exams");
}

export async function saveExamDraft(input: {
  examId: string; expectedDraftRevision: number; title?: string; instructions?: string | null; duration?: number | null;
  opensAt?: string | null; closesAt?: string | null; timezone?: string | null;
}) {
  const { schoolId, teacher } = await requireSchool();
  return saveExamDraftForActor({ examId: input.examId, expectedDraftRevision: input.expectedDraftRevision, title: input.title, instructions: input.instructions, duration: input.duration, opensAt: input.opensAt ? new Date(input.opensAt) : null, closesAt: input.closesAt ? new Date(input.closesAt) : null, timezone: input.timezone }, { schoolId, teacherId: teacher.id });
}

export async function getExamPublicationReadiness(examId: string) {
  const { schoolId, teacher } = await requireSchool();
  return validateExamForPublication(examId, { schoolId, teacherId: teacher.id });
}

export async function publishExam(examId: string, expectedDraftRevision?: number) {
  const { schoolId, teacher } = await requireSchool();
  const publication = await publishExamForActor({ examId, expectedDraftRevision }, { schoolId, teacherId: teacher.id });
  revalidatePath(`/exams/${examId}`);
  revalidatePath("/exams");
  return { id: publication.id, version: publication.version, publishedAt: publication.publishedAt };
}

export async function archiveExam(examId: string) {
  const { schoolId, teacher } = await requireSchool();
  const result = await archiveExamForActor(examId, { schoolId, teacherId: teacher.id });
  revalidatePath(`/exams/${examId}`);
  revalidatePath("/exams");
  return result.count === 1;
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
      assessmentItems: {
        orderBy: { order: "asc" },
        include: {
          question: { select: { examId: true, type: true, lifecycle: true } },
          questionVersion: { select: { version: true, payload: true } },
        },
      },
      _count: { select: { attempts: true } },
    },
  });
}
