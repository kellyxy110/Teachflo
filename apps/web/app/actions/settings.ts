"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";

export async function getSettings() {
  const { teacher, school } = await requireSchool();
  return { teacher, school };
}

export async function updateSchool(formData: FormData) {
  const { schoolId } = await requireSchool();

  const name = (formData.get("name") as string)?.trim();
  const state = (formData.get("state") as string)?.trim();
  const lga = (formData.get("lga") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;

  if (!name || !state) throw new Error("School name and state are required");

  await db.school.update({
    where: { id: schoolId },
    data: { name, state, lga, address },
  });

  revalidatePath("/settings");
}

export async function updateTeacher(formData: FormData) {
  const { teacher } = await requireSchool();

  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const subjectsRaw = (formData.get("subjects") as string)?.trim();
  const subjects = subjectsRaw
    ? subjectsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  if (!firstName) throw new Error("First name is required");

  await db.teacher.update({
    where: { id: teacher.id },
    data: { firstName, lastName: lastName ?? "", subjects },
  });

  revalidatePath("/settings");
}
