import { safeAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { resolveStudentIdentity } from "@/lib/services/import/resolve-student";
import { splitFullName, DEFAULT_FULL_NAME_FORMAT, type FullNameFormat } from "@/lib/services/import/name-format";
import { normalizeKey, learnSubjectAlias } from "@/lib/services/import/subject-normalize";
import { hasChangedSubjectMapping, importExecuteRequestSchema, validateScoreValue } from "@/lib/services/import/validation";

export const maxDuration = 60;

interface ImportRow {
  fullName?: string;
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
  // Teacher-confirmed split direction for a mapped "Full Name" column — never
  // a silent hardcoded assumption.
  fullNameFormat?: FullNameFormat;
  fullNameFormatConfirmed?: boolean;
  // Teacher-confirmed raw subject text -> canonical subject name.
  subjectCanonicalMap?: Record<string, string>;
  subjectMappingsConfirmed?: boolean;
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

  let body: RequestBody;
  try {
    body = importExecuteRequestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid import request" }, { status: 400 });
  }
  const {
    rows,
    classId,
    subject,
    term,
    session,
    schoolId,
    fullNameFormat = DEFAULT_FULL_NAME_FORMAT,
    subjectCanonicalMap = {},
  } = body;

  if (teacher.schoolId !== schoolId) {
    return Response.json({ error: "School mismatch" }, { status: 403 });
  }

  if (!classId || !rows?.length) {
    return Response.json({ error: "classId and rows are required" }, { status: 400 });
  }
  if (rows.some((row) => ![row.ca1, row.ca2, row.exam, row.total].every(validateScoreValue))) {
    return Response.json({ error: "Scores must be numeric values between 0 and 100" }, { status: 400 });
  }
  if (rows.some((row) => row.fullName?.trim()) && !body.fullNameFormatConfirmed) {
    return Response.json({ error: "Confirm the Full Name interpretation before importing" }, { status: 400 });
  }
  if (hasChangedSubjectMapping(subjectCanonicalMap) && !body.subjectMappingsConfirmed) {
    return Response.json({ error: "Confirm subject mappings before importing" }, { status: 400 });
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

    let firstName = row.firstName?.trim();
    let lastName = row.lastName?.trim();

    let rawFullName: string | null = null;
    if ((!firstName || !lastName) && row.fullName?.trim()) {
      const split = splitFullName(row.fullName, fullNameFormat);
      firstName = firstName || split.firstName;
      lastName = lastName || split.lastName;
      rawFullName = split.rawFullName;
    }

    if (!firstName || !lastName) {
      errors.push(`Row ${rowNum}: Missing name — map the Name column to "Full Name (auto-split)" or separate First/Last Name columns`);
      continue;
    }

    try {
      const regNumber = row.regNumber?.trim() || null;
      const gender = normalizeGender(row.gender);

      const resolution = await resolveStudentIdentity({ schoolId, classId, firstName, lastName, regNumber });
      if (resolution.type === "AMBIGUOUS") {
        const classNames = resolution.candidates.map((c) => c.className).join(", ");
        errors.push(
          `Row ${rowNum}: multiple existing students named ${firstName} ${lastName} found (in ${classNames}) — add a registration number to disambiguate and re-import this row`
        );
        continue;
      }
      let studentId: string | null = resolution.type === "MATCH" ? resolution.studentId : null;

      if (studentId) {
        await db.student.update({
          where: { id: studentId },
          data: {
            classId,
            ...(gender ? { gender } : {}),
            ...(regNumber ? { regNumber } : {}),
            ...(rawFullName && resolution.type === "MATCH" && !resolution.rawFullName ? { rawFullName } : {}),
          },
        });
        studentsUpdated++;
      } else {
        const created = await db.student.create({
          data: {
            schoolId,
            classId,
            firstName,
            lastName,
            regNumber,
            gender,
            ...(rawFullName ? { rawFullName } : {}),
          },
        });
        studentId = created.id;
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
        const rawSubject = row.subject?.trim();
        const subjectName = rawSubject
          ? subjectCanonicalMap[normalizeKey(rawSubject)] ?? rawSubject
          : subject;

        await db.score.upsert({
          where: {
            studentId_subject_term_session: {
              studentId,
              subject: subjectName,
              term,
              session,
            },
          },
          create: {
            schoolId,
            studentId,
            classId,
            teacherId: teacher.id,
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
            teacherId: teacher.id,
          },
        });
        scoresCreated++;

        if (rawSubject && rawSubject !== subjectName) {
          await learnSubjectAlias(schoolId, rawSubject, subjectName);
        }
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
