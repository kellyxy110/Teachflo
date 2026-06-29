"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import { emit } from "@/lib/events";

export async function getStudentsWithHealth(classId?: string) {
  const { schoolId } = await requireSchool();

  const where: { schoolId: string; isActive: boolean; classId?: string } = {
    schoolId,
    isActive: true,
  };
  if (classId) where.classId = classId;

  return db.student.findMany({
    where,
    include: {
      class: { select: { name: true, level: true } },
      healthRecord: { select: { id: true, bloodGroup: true, genotype: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function getHealthRecord(studentId: string) {
  const { schoolId } = await requireSchool();

  const student = await db.student.findFirst({
    where: { id: studentId, schoolId },
    select: { id: true, firstName: true, lastName: true, regNumber: true, gender: true, class: { select: { name: true } } },
  });
  if (!student) throw new Error("Student not found");

  const record = await db.healthRecord.findUnique({
    where: { studentId },
  });

  return { student, record };
}

export async function saveHealthRecord(studentId: string, formData: FormData) {
  const { schoolId, teacher } = await requireSchool();

  const student = await db.student.findFirst({
    where: { id: studentId, schoolId },
    select: { id: true },
  });
  if (!student) throw new Error("Student not found");

  const data = {
    bloodGroup: (formData.get("bloodGroup") as string)?.trim() || null,
    genotype: (formData.get("genotype") as string)?.trim() || null,
    allergies: formData.getAll("allergies").map((a) => (a as string).trim()).filter(Boolean),
    conditions: formData.getAll("conditions").map((c) => (c as string).trim()).filter(Boolean),
    medications: formData.getAll("medications").map((m) => (m as string).trim()).filter(Boolean),
    emergencyContactName: (formData.get("emergencyContactName") as string)?.trim() || null,
    emergencyContactPhone: (formData.get("emergencyContactPhone") as string)?.trim() || null,
    emergencyContactRel: (formData.get("emergencyContactRel") as string)?.trim() || null,
    parentPhone: (formData.get("parentPhone") as string)?.trim() || null,
    parentEmail: (formData.get("parentEmail") as string)?.trim() || null,
    healthNotes: (formData.get("healthNotes") as string)?.trim() || null,
    lastUpdatedBy: teacher.id,
  };

  await db.healthRecord.upsert({
    where: { studentId },
    create: {
      studentId,
      schoolId,
      ...data,
    },
    update: data,
  });

  revalidatePath("/health");
  revalidatePath(`/health/${studentId}`);

  emit("health.record.updated", { schoolId, studentId, updatedBy: teacher.id });
}

export async function addClinicVisit(studentId: string, formData: FormData) {
  const { schoolId, teacher } = await requireSchool();

  const student = await db.student.findFirst({
    where: { id: studentId, schoolId },
    select: { id: true },
  });
  if (!student) throw new Error("Student not found");

  const visit = {
    date: (formData.get("visitDate") as string) || new Date().toISOString().slice(0, 10),
    reason: (formData.get("reason") as string)?.trim() || "",
    treatment: (formData.get("treatment") as string)?.trim() || "",
    notes: (formData.get("notes") as string)?.trim() || "",
    recordedBy: teacher.firstName + " " + teacher.lastName,
  };

  const record = await db.healthRecord.findUnique({
    where: { studentId },
    select: { clinicVisits: true },
  });

  const existing = (record?.clinicVisits as unknown[] ?? []) as Record<string, string>[];
  existing.unshift(visit);
  // Cap at 200 visits to prevent unbounded growth
  if (existing.length > 200) existing.length = 200;

  await db.healthRecord.upsert({
    where: { studentId },
    create: {
      studentId,
      schoolId,
      clinicVisits: existing,
      lastUpdatedBy: teacher.id,
    },
    update: {
      clinicVisits: existing,
      lastUpdatedBy: teacher.id,
    },
  });

  revalidatePath(`/health/${studentId}`);
}

export async function getClassesForHealth() {
  const { schoolId } = await requireSchool();

  return db.class.findMany({
    where: { schoolId },
    include: { _count: { select: { students: { where: { isActive: true } } } } },
    orderBy: { name: "asc" },
  });
}
