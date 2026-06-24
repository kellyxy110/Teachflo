"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import type { TeacherRole } from "@prisma/client";

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
  const phone = (formData.get("phone") as string)?.trim() || null;
  const photoUrl = (formData.get("photoUrl") as string)?.trim() || null;

  // Credentials
  const qualification = (formData.get("qualification") as string)?.trim() || null;
  const institution = (formData.get("institution") as string)?.trim() || null;
  const gradYearRaw = formData.get("gradYear") as string;
  const gradYear = gradYearRaw ? parseInt(gradYearRaw) || null : null;
  const trcnNumber = (formData.get("trcnNumber") as string)?.trim() || null;
  const trcnStatus = (formData.get("trcnStatus") as string)?.trim() || null;

  // Teaching info
  const role = (formData.get("role") as string)?.trim() || "TEACHER";
  const subjectsRaw = formData.getAll("subjects") as string[];
  const subjects = subjectsRaw.filter(Boolean);
  const classLevelsRaw = formData.getAll("classLevels") as string[];
  const classLevels = classLevelsRaw.filter(Boolean);
  const yearsOfExpRaw = formData.get("yearsOfExp") as string;
  const yearsOfExp = yearsOfExpRaw ? parseInt(yearsOfExpRaw) || null : null;
  const department = (formData.get("department") as string)?.trim() || null;

  // Bio
  const bio = (formData.get("bio") as string)?.trim() || null;

  if (!firstName) throw new Error("First name is required");

  await db.teacher.update({
    where: { id: teacher.id },
    data: {
      firstName,
      lastName: lastName ?? "",
      phone,
      photoUrl,
      qualification,
      institution,
      gradYear,
      trcnNumber,
      trcnStatus,
      role: role as TeacherRole,
      subjects,
      classLevels,
      yearsOfExp,
      department,
      bio,
    },
  });

  revalidatePath("/settings");
}
