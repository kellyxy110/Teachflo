"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import type { Gender } from "@prisma/client";

export async function addStudent(formData: FormData) {
  const { schoolId } = await requireSchool();

  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const classId = formData.get("classId") as string;
  const regNumber = (formData.get("regNumber") as string) || undefined;
  const gender = (formData.get("gender") as Gender) || undefined;

  if (!firstName || !lastName || !classId)
    throw new Error("Name and class required");

  await db.student.create({
    data: {
      schoolId,
      classId,
      firstName,
      lastName,
      regNumber: regNumber || null,
      gender: gender || null,
    },
  });

  revalidatePath("/students");
  revalidatePath(`/classes/${classId}`);
}

export async function deleteStudent(studentId: string) {
  const { schoolId } = await requireSchool();

  const student = await db.student.findFirst({
    where: { id: studentId, schoolId },
  });
  if (!student) throw new Error("Not found");

  await db.student.update({
    where: { id: studentId },
    data: { isActive: false },
  });

  revalidatePath("/students");
  revalidatePath(`/classes/${student.classId}`);
}

export async function getStudents(classId?: string) {
  const { schoolId } = await requireSchool();

  return db.student.findMany({
    where: { schoolId, classId: classId || undefined, isActive: true },
    include: { class: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}
