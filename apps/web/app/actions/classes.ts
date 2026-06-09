"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import type { ClassLevel, Term } from "@prisma/client";

export async function createClass(formData: FormData) {
  const { schoolId } = await requireSchool();

  const name = formData.get("name") as string;
  const level = formData.get("level") as ClassLevel;
  const arm = (formData.get("arm") as string) || undefined;
  const term = (formData.get("term") as Term) || "FIRST";
  const session =
    (formData.get("session") as string) ||
    `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

  if (!name || !level) throw new Error("Class name and level required");

  await db.class.create({
    data: { schoolId, name, level, arm: arm || null, term, session },
  });

  revalidatePath("/classes");
}

export async function deleteClass(classId: string) {
  const { schoolId } = await requireSchool();

  await db.class.deleteMany({ where: { id: classId, schoolId } });
  revalidatePath("/classes");
}

export async function getClasses() {
  const { schoolId } = await requireSchool();

  return db.class.findMany({
    where: { schoolId },
    include: { _count: { select: { students: true } } },
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });
}

export async function getClass(classId: string) {
  const { schoolId } = await requireSchool();

  return db.class.findFirst({
    where: { id: classId, schoolId },
    include: {
      students: {
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      },
      _count: { select: { students: true } },
    },
  });
}
