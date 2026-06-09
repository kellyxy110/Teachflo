"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import type { ClassLevel, LessonMode } from "@prisma/client";

export async function saveLesson(data: {
  subject: string;
  classLevel: ClassLevel;
  topic: string;
  week?: number;
  term?: string;
  markdown: string;
  mode?: LessonMode;
}) {
  const { schoolId, teacher } = await requireSchool();

  const lesson = await db.lesson.create({
    data: {
      schoolId,
      teacherId: teacher.id,
      subject: data.subject,
      classLevel: data.classLevel,
      topic: data.topic,
      week: data.week ?? null,
      term: data.term ? (data.term as any) : null,
      mode: data.mode ?? "STANDARD",
      objectives: [],
      introduction: "",
      content: { markdown: data.markdown },
      activities: [],
      evaluation: [],
      homework: [],
      aiModel: "gpt-4o",
    },
  });

  revalidatePath("/lessons");
  return lesson.id;
}

export async function deleteLesson(lessonId: string) {
  const { schoolId } = await requireSchool();
  await db.lesson.deleteMany({ where: { id: lessonId, schoolId } });
  revalidatePath("/lessons");
  redirect("/lessons");
}

export async function getLessons() {
  const { schoolId } = await requireSchool();
  return db.lesson.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLesson(lessonId: string) {
  const { schoolId } = await requireSchool();
  return db.lesson.findFirst({ where: { id: lessonId, schoolId } });
}
