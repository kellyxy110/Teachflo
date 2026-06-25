"use server";

import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import type { Term } from "@prisma/client";

export async function getReportCardData(
  classId: string,
  term: Term,
  session: string,
) {
  const { schoolId } = await requireSchool();

  const validTerms = new Set(["FIRST", "SECOND", "THIRD"]);
  if (!validTerms.has(term)) throw new Error("Invalid term");
  if (!session || session.length > 20) throw new Error("Invalid session");

  const students = await db.student.findMany({
    where: { classId, schoolId, isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      regNumber: true,
      scores: {
        where: { term, session },
        select: {
          subject: true,
          ca1: true,
          ca2: true,
          exam: true,
          total: true,
          grade: true,
          remark: true,
        },
        orderBy: { subject: "asc" },
      },
    },
  });

  const classInfo = await db.class.findFirst({
    where: { id: classId, schoolId },
    select: { name: true, level: true },
  });
  if (!classInfo) throw new Error("Class not found");

  const allTotals = students
    .map((s) => {
      const sum = s.scores.reduce((acc, sc) => acc + (sc.total ?? 0), 0);
      return { id: s.id, total: sum, count: s.scores.length };
    })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.total - a.total);

  const ranked = allTotals.map((s, i) => ({
    studentId: s.id,
    position: i + 1,
    total: s.total,
    average: s.count > 0 ? s.total / s.count : 0,
    subjectCount: s.count,
  }));

  return {
    className: classInfo?.name ?? "",
    classLevel: classInfo?.level ?? "",
    term,
    session,
    students: students.map((s) => {
      const rank = ranked.find((r) => r.studentId === s.id);
      return {
        id: s.id,
        name: `${s.lastName} ${s.firstName}`,
        regNumber: s.regNumber,
        scores: s.scores,
        totalScore: rank?.total ?? 0,
        averageScore: rank?.average ?? 0,
        subjectCount: rank?.subjectCount ?? 0,
        position: rank ? `${rank.position}${getOrdinal(rank.position)} of ${ranked.length}` : "N/A",
      };
    }),
    totalStudents: ranked.length,
  };
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export async function getClassesForReports() {
  const { schoolId } = await requireSchool();
  return db.class.findMany({
    where: { schoolId },
    include: { _count: { select: { students: { where: { isActive: true } } } } },
    orderBy: { name: "asc" },
  });
}
