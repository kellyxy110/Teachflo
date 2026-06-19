"use server";

import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";

export async function getLibraryResources() {
  const { schoolId } = await requireSchool();

  const [lessons, exams] = await Promise.all([
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
  ]);

  return { lessons, exams };
}
