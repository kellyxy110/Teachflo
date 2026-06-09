"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import { calculateGrade, calculateTotal } from "@teachflow/shared";
import type { Term } from "@prisma/client";

export async function upsertScore(formData: FormData) {
  const { schoolId, teacher } = await requireSchool();

  const studentId = formData.get("studentId") as string;
  const classId = formData.get("classId") as string;
  const subject = formData.get("subject") as string;
  const term = (formData.get("term") as Term) || "FIRST";
  const session =
    (formData.get("session") as string) ||
    `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
  const ca1 = parseFloat((formData.get("ca1") as string) || "0") || 0;
  const ca2 = parseFloat((formData.get("ca2") as string) || "0") || 0;
  const exam = parseFloat((formData.get("exam") as string) || "0") || 0;

  const total = calculateTotal(ca1, ca2, exam);
  const grade = calculateGrade(total);

  await db.score.upsert({
    where: {
      studentId_subject_term_session: { studentId, subject, term, session },
    },
    update: { ca1, ca2, exam, total, grade },
    create: {
      schoolId,
      studentId,
      classId,
      teacherId: teacher.id,
      subject,
      term,
      session,
      ca1,
      ca2,
      exam,
      total,
      grade,
    },
  });

  revalidatePath(`/scores`);
}

export async function getScores(classId: string, subject: string, term: Term, session: string) {
  const { schoolId } = await requireSchool();

  const students = await db.student.findMany({
    where: { classId, schoolId, isActive: true },
    include: {
      scores: {
        where: { subject, term, session },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return students;
}

export async function getSubjectsForClass() {
  return [
    "Mathematics",
    "English Language",
    "Physics",
    "Chemistry",
    "Biology",
    "Agricultural Science",
    "Economics",
    "Government",
    "Literature in English",
    "Geography",
    "History",
    "Civic Education",
    "Christian Religious Studies",
    "Islamic Studies",
    "Further Mathematics",
    "Technical Drawing",
    "Food and Nutrition",
    "Computer Studies",
    "French",
  ];
}
