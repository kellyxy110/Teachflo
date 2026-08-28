// Canonical student identity resolution — shared by both importers (legacy
// /import execute route and Student Hub stage/commit) so the two systems stop
// disagreeing about what makes a row "the same student."
//
// A student's identity must not depend permanently on their current class:
// Class rows are recreated every academic session, so a returning student
// without a reg number gets a new classId every year. Resolution order:
//   1. regNumber match (schoolId + regNumber) — authoritative when present.
//   2. Exact name match within the target class — highest-confidence fallback
//      for re-importing/correcting the same class's own roster.
//   3. Exact name match anywhere in the school — catches promotion/session
//      rollover. If more than one candidate exists, this is ambiguous and
//      must be surfaced for a human to resolve, never guessed.

import { db } from "@/lib/db";

export interface StudentCandidate {
  id: string;
  firstName: string;
  lastName: string;
  regNumber: string | null;
  className: string;
}

export type StudentResolution =
  | { type: "MATCH"; studentId: string; firstName: string; lastName: string; regNumber: string | null; rawFullName: string | null }
  | { type: "AMBIGUOUS"; candidates: StudentCandidate[] }
  | { type: "NONE" };

export async function resolveStudentIdentity(params: {
  schoolId: string;
  classId?: string | null;
  firstName: string;
  lastName: string;
  regNumber: string | null;
}): Promise<StudentResolution> {
  const { schoolId, classId, firstName, lastName, regNumber } = params;

  if (regNumber) {
    const byReg = await db.student.findFirst({ where: { schoolId, regNumber } });
    return byReg
      ? { type: "MATCH", studentId: byReg.id, firstName: byReg.firstName, lastName: byReg.lastName, regNumber: byReg.regNumber, rawFullName: byReg.rawFullName }
      : { type: "NONE" };
  }

  if (classId) {
    const sameClass = await db.student.findFirst({
      where: {
        schoolId,
        classId,
        firstName: { equals: firstName, mode: "insensitive" },
        lastName: { equals: lastName, mode: "insensitive" },
      },
    });
    if (sameClass) {
      return { type: "MATCH", studentId: sameClass.id, firstName: sameClass.firstName, lastName: sameClass.lastName, regNumber: sameClass.regNumber, rawFullName: sameClass.rawFullName };
    }
  }

  const schoolWide = await db.student.findMany({
    where: {
      schoolId,
      firstName: { equals: firstName, mode: "insensitive" },
      lastName: { equals: lastName, mode: "insensitive" },
    },
    include: { class: { select: { name: true } } },
    take: 5,
  });

  if (schoolWide.length === 1) {
    const s = schoolWide[0];
    return { type: "MATCH", studentId: s.id, firstName: s.firstName, lastName: s.lastName, regNumber: s.regNumber, rawFullName: s.rawFullName };
  }
  if (schoolWide.length > 1) {
    return {
      type: "AMBIGUOUS",
      candidates: schoolWide.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        regNumber: s.regNumber,
        className: s.class.name,
      })),
    };
  }
  return { type: "NONE" };
}
