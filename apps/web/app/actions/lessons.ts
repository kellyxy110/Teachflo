"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import type { ClassLevel, LessonMode, Term, Prisma } from "@prisma/client";
import { createWorkspaceLessonEnvelope, isLessonContentEnvelope, isLegacyLessonContent } from "@/lib/lessons/content-envelope";
import { privateBookshelfWhere } from "@/lib/documents/access";
import { reconstructLessonSourceReference } from "@/lib/documents/source-reference";

export async function saveLesson(data: {
  subject: string;
  classLevel: ClassLevel;
  topic: string;
  week?: number;
  term?: string;
  markdown: string;
  periods?: number;
  mode?: LessonMode;
  origin?: "AI_GENERATED" | "MANUAL" | "PASTE";
  sourceRepresentation?: string;
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
      term: data.term ? (data.term as Term) : null,
      mode: data.mode ?? "STANDARD",
      objectives: [],
      introduction: "",
      content: createWorkspaceLessonEnvelope({ markdown: data.markdown, origin: data.origin ?? "AI_GENERATED", ...(data.sourceRepresentation !== undefined ? { sourceRepresentation: data.sourceRepresentation } : {}) }) as unknown as Prisma.InputJsonValue,
      activities: [],
      evaluation: [],
      homework: [],
      aiModel: null,
    },
  });

  revalidatePath("/lessons");
  return lesson.id;
}

export async function createManualLesson(data: Parameters<typeof saveLesson>[0]) {
  return saveLesson({ ...data, origin: "MANUAL" });
}

export async function createPastedLesson(data: Parameters<typeof saveLesson>[0] & { sourceRepresentation: string }) {
  return saveLesson({ ...data, markdown: data.sourceRepresentation, origin: "PASTE", sourceRepresentation: data.sourceRepresentation });
}

export async function createManualLessonFromSource(data: Parameters<typeof saveLesson>[0] & { sourceDocumentId: string; sourceChunkId: string }) {
  const { schoolId, teacher } = await requireSchool();
  const document = await db.document.findFirst({ where: { ...privateBookshelfWhere(schoolId, teacher.id), id: data.sourceDocumentId, status: "READY" }, select: { id: true } });
  if (!document) throw new Error("Source is unavailable");
  const rows = await db.$queryRawUnsafe<Array<{ id: string; content: string; metadata: unknown }>>(
    `SELECT dc.id, dc.content, dc.metadata FROM document_chunks dc JOIN documents d ON d.id = dc."documentId"
     WHERE dc.id = $1 AND dc."documentId" = $2 AND dc."schoolId" = $3 AND d."visibility" = 'PRIVATE' AND d."teacherId" = $4`, data.sourceChunkId, data.sourceDocumentId, schoolId, teacher.id,
  );
  const chunk = rows[0];
  if (!chunk) throw new Error("Source passage is unavailable");
  const sourceReference = reconstructLessonSourceReference({ documentId: data.sourceDocumentId, exactExcerpt: chunk.content, metadata: chunk.metadata });
  const lesson = await db.lesson.create({ data: { schoolId, teacherId: teacher.id, subject: data.subject, classLevel: data.classLevel, topic: data.topic, week: data.week ?? null, term: data.term ? (data.term as Term) : null, mode: data.mode ?? "STANDARD", objectives: [], introduction: "", content: createWorkspaceLessonEnvelope({ markdown: data.markdown, origin: "DOCUMENT_IMPORT", sourceReferences: [sourceReference] }) as unknown as Prisma.InputJsonValue, activities: [], evaluation: [], homework: [], aiModel: null } });
  revalidatePath("/lessons");
  return lesson.id;
}

export async function transitionLessonReview(lessonId: string, nextState: "REVIEWED" | "APPROVED") {
  const { schoolId } = await requireSchool();
  const lesson = await db.lesson.findFirst({ where: { id: lessonId, schoolId }, select: { content: true } });
  if (!lesson || !isLessonContentEnvelope(lesson.content)) throw new Error("Only workspace lessons can be reviewed");
  const current = lesson.content.review.state;
  if ((nextState === "REVIEWED" && current !== "DRAFT") || (nextState === "APPROVED" && current !== "REVIEWED")) throw new Error("Invalid lesson review transition");
  const workspace = lesson.content as import("@/lib/lessons/content-envelope").LessonContentEnvelope;
  const content = { ...workspace, review: { ...workspace.review, state: nextState, teacherEditState: "REVIEWED" as const } };
  await db.lesson.update({ where: { id: lessonId }, data: { content: content as unknown as Prisma.InputJsonValue } });
  revalidatePath(`/lessons/${lessonId}`); revalidatePath("/lessons");
}

export async function updateLesson(lessonId: string, markdown: string) {
  const { schoolId } = await requireSchool();

  if (typeof markdown !== "string" || !markdown.trim()) {
    throw new Error("Lesson content cannot be empty");
  }

  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, schoolId },
    select: { id: true },
  });
  if (!lesson) throw new Error("Lesson not found");

  const existing = await db.lesson.findFirst({ where: { id: lessonId, schoolId }, select: { content: true } });
  if (existing?.content != null && !isLessonContentEnvelope(existing.content) && !isLegacyLessonContent(existing.content)) {
    throw new Error("Lesson content is unreadable and cannot be safely edited");
  }
  const content = isLessonContentEnvelope(existing?.content)
    ? { ...existing.content, markdown: markdown.slice(0, 200000), review: { ...existing.content.review, state: "DRAFT" as const, teacherEditState: "EDITED" as const } }
    : { markdown: markdown.slice(0, 200000) };
  await db.lesson.update({
    where: { id: lessonId },
    data: { content: content as unknown as Prisma.InputJsonValue },
  });

  revalidatePath(`/lessons/${lessonId}`);
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
