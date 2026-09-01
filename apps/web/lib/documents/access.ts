import type { Prisma } from "@prisma/client";

export function documentAccessWhere(schoolId: string, teacherId: string): Prisma.DocumentWhereInput {
  return {
    schoolId,
    OR: [
      { visibility: "SCHOOL" },
      { visibility: "PRIVATE", teacherId },
    ],
  };
}

export function privateBookshelfWhere(schoolId: string, teacherId: string): Prisma.DocumentWhereInput {
  return { schoolId, teacherId, visibility: "PRIVATE" };
}

/** SQL predicate for a joined `documents` alias. Parameters are supplied by the caller. */
export function documentAccessSql(alias: string, schoolParam: string, teacherParam?: string): string {
  if (!teacherParam) return `${alias}."schoolId" = ${schoolParam} AND ${alias}."visibility" = 'SCHOOL'`;
  return `${alias}."schoolId" = ${schoolParam} AND (${alias}."visibility" = 'SCHOOL' OR (${alias}."visibility" = 'PRIVATE' AND ${alias}."teacherId" = ${teacherParam}))`;
}
