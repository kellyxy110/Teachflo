"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";

export async function createHomework(data: {
  title: string;
  subject: string;
  description: string;
  dueDate?: Date;
  classId: string;
}) {
  const { schoolId, teacher } = await requireSchool();

  const homework = await db.homework.create({
    data: {
      schoolId,
      teacherId: teacher.id,
      title: data.title,
      subject: data.subject,
      description: data.description,
      dueDate: data.dueDate ?? null,
      classId: data.classId,
    },
  });

  revalidatePath("/homework");
  return homework.id;
}

export async function closeHomework(homeworkId: string) {
  const { schoolId } = await requireSchool();
  await db.homework.updateMany({
    where: { id: homeworkId, schoolId },
    data: { status: "CLOSED" },
  });
  revalidatePath("/homework");
}

export async function deleteHomework(homeworkId: string) {
  const { schoolId } = await requireSchool();
  await db.homework.deleteMany({ where: { id: homeworkId, schoolId } });
  revalidatePath("/homework");
}

export async function getHomework() {
  const { schoolId } = await requireSchool();
  return db.homework.findMany({
    where: { schoolId },
    include: { class: { select: { id: true, name: true, level: true } } },
    orderBy: { createdAt: "desc" },
  });
}
