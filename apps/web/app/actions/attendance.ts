"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import type { AttendanceStatus } from "@prisma/client";

const VALID_STATUSES = new Set(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function getClassesForAttendance() {
  const { schoolId } = await requireSchool();

  return db.class.findMany({
    where: { schoolId },
    include: {
      _count: { select: { students: { where: { isActive: true } } } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getStudentsForClass(classId: string) {
  const { schoolId } = await requireSchool();

  return db.student.findMany({
    where: { classId, schoolId, isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, regNumber: true, gender: true },
  });
}

export async function getAttendanceForDate(classId: string, date: string) {
  const { schoolId } = await requireSchool();

  if (!DATE_RE.test(date)) throw new Error("Invalid date format");

  const records = await db.attendance.findMany({
    where: {
      classId,
      schoolId,
      date: new Date(date),
    },
    select: {
      id: true,
      studentId: true,
      status: true,
      note: true,
    },
  });

  const map: Record<string, { id: string; status: AttendanceStatus; note: string | null }> = {};
  for (const r of records) {
    map[r.studentId] = { id: r.id, status: r.status, note: r.note };
  }
  return map;
}

export async function saveAttendance(
  classId: string,
  date: string,
  records: { studentId: string; status: AttendanceStatus; note?: string }[],
) {
  const { schoolId, teacher } = await requireSchool();

  if (!DATE_RE.test(date)) throw new Error("Invalid date format");
  if (!records.length || records.length > 500) throw new Error("Invalid record count");

  // Validate classId belongs to this school
  const classExists = await db.class.findFirst({
    where: { id: classId, schoolId },
    select: { id: true },
  });
  if (!classExists) throw new Error("Class not found");

  // Validate all studentIds belong to this school
  const studentIds = records.map((r) => r.studentId);
  const validStudents = await db.student.findMany({
    where: { id: { in: studentIds }, schoolId },
    select: { id: true },
  });
  const validIds = new Set(validStudents.map((s) => s.id));
  if (validIds.size !== new Set(studentIds).size) {
    throw new Error("Invalid student IDs");
  }

  // Validate all statuses
  for (const r of records) {
    if (!VALID_STATUSES.has(r.status)) throw new Error("Invalid attendance status");
  }

  const dateObj = new Date(date);

  const operations = records.map((r) =>
    db.attendance.upsert({
      where: {
        studentId_date: { studentId: r.studentId, date: dateObj },
      },
      create: {
        schoolId,
        classId,
        studentId: r.studentId,
        teacherId: teacher.id,
        date: dateObj,
        status: r.status,
        note: r.note?.slice(0, 500) ?? null,
      },
      update: {
        status: r.status,
        note: r.note?.slice(0, 500) ?? null,
        teacherId: teacher.id,
      },
    }),
  );

  await db.$transaction(operations);
  revalidatePath("/attendance");
}

export async function getAttendanceStats(classId: string, month?: string) {
  const { schoolId } = await requireSchool();

  if (month && !/^\d{4}-\d{2}$/.test(month)) throw new Error("Invalid month format");

  const now = month ? new Date(month + "-01") : new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const records = await db.attendance.findMany({
    where: {
      classId,
      schoolId,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    select: { studentId: true, status: true, date: true },
  });

  const studentCount = await db.student.count({
    where: { classId, schoolId, isActive: true },
  });

  const totalPresent = records.filter((r) => r.status === "PRESENT").length;
  const totalAbsent = records.filter((r) => r.status === "ABSENT").length;
  const totalLate = records.filter((r) => r.status === "LATE").length;
  const totalExcused = records.filter((r) => r.status === "EXCUSED").length;

  const uniqueDates = new Set(records.map((r) => r.date.toISOString().slice(0, 10)));
  const daysRecorded = uniqueDates.size;

  const studentStats: Record<string, { name: string; present: number; absent: number; late: number; excused: number; total: number }> = {};

  const studentNames = await db.student.findMany({
    where: { classId, schoolId, isActive: true },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameMap: Record<string, string> = {};
  for (const s of studentNames) nameMap[s.id] = `${s.lastName} ${s.firstName}`;

  for (const r of records) {
    if (!studentStats[r.studentId]) {
      studentStats[r.studentId] = { name: nameMap[r.studentId] ?? "Unknown", present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    }
    studentStats[r.studentId][r.status.toLowerCase() as "present" | "absent" | "late" | "excused"]++;
    studentStats[r.studentId].total++;
  }

  return {
    studentCount,
    daysRecorded,
    totalPresent,
    totalAbsent,
    totalLate,
    totalExcused,
    totalRecords: records.length,
    studentStats,
  };
}

export async function getStudentAttendanceHistory(studentId: string, limit = 30) {
  const { schoolId } = await requireSchool();
  const cappedLimit = Math.min(Math.max(1, limit), 100);

  return db.attendance.findMany({
    where: { studentId, schoolId },
    orderBy: { date: "desc" },
    take: cappedLimit,
    select: { date: true, status: true, note: true },
  });
}
