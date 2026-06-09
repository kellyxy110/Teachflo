"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";

export async function createHomework(data: {
  title: string;
  subject: string;
  dueDate: Date;
  classIds: string[];
}) {
  const { schoolId, teacher } = await requireSchool();

  const homework = await db.homework.create({
    data: {
      schoolId,
      teacherId: teacher.id,
      title: data.title,
      subject: data.subject,
      dueDate: data.dueDate,
      classes: { connect: data.classIds.map((id) => ({ id })) },
    },
  });

  revalidatePath("/homework");
  return homework.id;
}

export async function markHomeworkDone(homeworkId: string) {
  const { schoolId } = await requireSchool();

  await db.homework.updateMany({
    where: { id: homeworkId, schoolId },
    data: { isSubmitted: true },
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
    include: { classes: { select: { id: true, name: true, level: true } } },
    orderBy: { dueDate: "asc" },
  });
}
