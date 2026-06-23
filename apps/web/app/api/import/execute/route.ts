import { safeAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";

export const maxDuration = 60;

interface ImportRow {
  firstName?: string;
  lastName?: string;
  regNumber?: string;
  gender?: string;
  subject?: string;
  ca1?: string;
  ca2?: string;
  exam?: string;
  total?: string;
  grade?: string;
  remark?: string;
}

interface RequestBody {
  rows: ImportRow[];
  classId: string;
  subject: string;
  term: "FIRST" | "SECOND" | "THIRD";
  session: string;
  schoolId: string;
  teacherId: string;
}

function parseScore(val?: string): number | null {
  if (!val || val.trim() === "" || val === "-" || val === "N/A") return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function normalizeGender(val?: string): "MALE" | "FEMALE" | null {
  if (!val) return null;
  const v = val.trim().toUpperCase();
  if (v === "M" || v === "MALE" || v === "BOY") return "MALE";
  if (v === "F" || v === "FEMALE" || v === "GIRL") return "FEMALE";
  return null;
}

function computeGrade(total: number | null): string | null {
  if (total === null) return null;
  if (total >= 70) return "A";
  if (total >= 60) return "B";
  if (total >= 50) return "C";
  if (total >= 45) return "D";
  if (total >= 40) return "E";
  return "F";
}

export async function POST(request: Request) {
  const auth = await safeAuth();
  if (!auth.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacher = await db.teacher.findUnique({ where: { clerkId: auth.userId } });
  if (!teacher) {
    return Response.json({ error: "Teacher not found" }, { status: 403 });
  }

  const { ok } = await rateLimit(`import-exec:${auth.userId}`);
  if (!ok) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const body: RequestBody = await request.json();
  const { rows, classId, subject, term, session, schoolId, teacherId } = body;

  if (teacher.schoolId !== schoolId) {
    return Response.json({ error: "School mismatch" }, { status: 403 });
  }

  if (!classId || !rows?.length) {
    return Response.json({ error: "classId and rows are required" }, { status: 400 });
  }

  const cls = await db.class.findFirst({
    where: { id: classId, schoolId },
  });
  if (!cls) {
    return Response.json({ error: "Class not found" }, { status: 404 });
  }

  let studentsCreated = 0;
  let studentsUpdated = 0;
  let scoresCreated = 0;
  const errors: string[] = [];

  const hasScores = rows.some(
    (r) => r.ca1 || r.ca2 || r.exam || r.total || r.grade
  );

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const firstName = row.firstName?.trim();
    const lastName = row.lastName?.trim();

    if (!firstName || !lastName) {
      errors.push(`Row ${rowNum}: Missing first or last name`);
      continue;
    }

    try {
      const regNumber = row.regNumber?.trim() || null;
      const gender = normalizeGender(row.gender);

      let student = regNumber
        ? await db.student.findFirst({
            where: { schoolId, regNumber },
          })
        : await db.student.findFirst({
            where: {
              schoolId,
              classId,
              firstName: { equals: firstName, mode: "insensitive" },
              lastName: { equals: lastName, mode: "insensitive" },
            },
          });

      if (student) {
        await db.student.update({
          where: { id: student.id },
          data: {
            classId,
            ...(gender ? { gender } : {}),
            ...(regNumber ? { regNumber } : {}),
          },
        });
        studentsUpdated++;
      } else {
        student = await db.student.create({
          data: {
            schoolId,
            classId,
            firstName,
            lastName,
            regNumber,
            gender,
          },
        });
        studentsCreated++;
      }

      if (hasScores && subject) {
        const ca1 = parseScore(row.ca1);
        const ca2 = parseScore(row.ca2);
        const examScore = parseScore(row.exam);
        let total = parseScore(row.total);
        if (total === null && (ca1 !== null || ca2 !== null || examScore !== null)) {
          total = (ca1 ?? 0) + (ca2 ?? 0) + (examScore ?? 0);
        }
        const grade = row.grade?.trim() || computeGrade(total);
        const remark = row.remark?.trim() || null;
        const subjectName = row.subject?.trim() || subject;

        await db.score.upsert({
          where: {
            studentId_subject_term_session: {
              studentId: student.id,
              subject: subjectName,
              term,
              session,
            },
          },
          create: {
            schoolId,
            studentId: student.id,
            classId,
            teacherId,
            subject: subjectName,
            term,
            session,
            ca1,
            ca2,
            exam: examScore,
            total,
            grade,
            remark,
          },
          update: {
            ca1,
            ca2,
            exam: examScore,
            total,
            grade,
            remark,
            classId,
            teacherId,
          },
        });
        scoresCreated++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      errors.push(`Row ${rowNum} (${firstName} ${lastName}): ${msg}`);
    }
  }

  return Response.json({
    studentsCreated,
    studentsUpdated,
    scoresCreated,
    errors,
  });
}
