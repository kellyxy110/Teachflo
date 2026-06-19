"use server";

import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";

export async function getLibraryResources() {
  const { schoolId } = await requireSchool();

  const [lessons, exams, documents] = await Promise.all([
    db.lesson.findMany({
      where: { schoolId },
      select: {
        id: true,
        subject: true,
        topic: true,
        classLevel: true,
        mode: true,
        week: true,
        term: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.exam.findMany({
      where: { schoolId },
      select: {
        id: true,
        subject: true,
        topic: true,
        classLevel: true,
        examType: true,
        difficulty: true,
        createdAt: true,
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.document.findMany({
      where: { schoolId },
      select: {
        id: true,
        title: true,
        subject: true,
        classLevel: true,
        fileName: true,
        fileSize: true,
        pageCount: true,
        status: true,
        chunkCount: true,
        error: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const allSubjects = [
    ...new Set([
      ...lessons.map((l) => l.subject),
      ...exams.map((e) => e.subject),
      ...documents.map((d) => d.subject),
    ]),
  ].sort();

  return { lessons, exams, documents, allSubjects };
}
