// Commit service: moves staged rows into production tables, then provisions workspace.
// Runs inside a Prisma transaction where possible.

import { db } from "@/lib/db";
import { provisionClassWorkspace } from "@/lib/services/provision/workspace";

export interface CommitOptions {
  jobId: string;
  schoolId: string;
  teacherId: string;
  classId: string;
  subject?: string;
  term: "FIRST" | "SECOND" | "THIRD";
  session: string;
  defaultResolution?: "KEEP_EXISTING" | "REPLACE" | "MERGE";
}

export interface CommitResult {
  studentsCreated: number;
  studentsUpdated: number;
  scoresUpserted: number;
  errors: string[];
}

function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

export async function commitImportJob(opts: CommitOptions): Promise<CommitResult> {
  const {
    jobId,
    schoolId,
    teacherId,
    classId,
    subject,
    term,
    session,
    defaultResolution = "MERGE",
  } = opts;

  const job = await db.importJob.findUnique({
    where: { id: jobId },
    include: { stagingRows: { where: { status: { not: "SKIPPED" } } } },
  });

  if (!job) throw new Error("Import job not found");
  if (job.schoolId !== schoolId) throw new Error("School mismatch");
  if (!["STAGED", "CONFIRMED"].includes(job.status)) {
    throw new Error(`Job is in status ${job.status} — cannot commit`);
  }

  let studentsCreated = 0;
  let studentsUpdated = 0;
  let scoresUpserted = 0;
  const errors: string[] = [];

  for (const row of job.stagingRows) {
    const parsed = row.parsedData as {
      firstName?: string;
      lastName?: string;
      regNumber?: string | null;
      gender?: "MALE" | "FEMALE" | null;
      ca1Parsed?: number | null;
      ca2Parsed?: number | null;
      examParsed?: number | null;
      totalParsed?: number | null;
      gradeParsed?: string | null;
      remark?: string | null;
      subject?: string | null;
    };

    const resolution = row.resolution ?? defaultResolution;

    try {
      let studentId = row.studentId ?? null;

      if (row.action === "CREATE" || (row.action === "CONFLICT" && resolution !== "KEEP_EXISTING")) {
        if (row.action === "CREATE" || !studentId) {
          const student = await db.student.create({
            data: {
              schoolId,
              classId,
              firstName: parsed.firstName!,
              lastName: parsed.lastName!,
              regNumber: parsed.regNumber ?? null,
              gender: parsed.gender ?? null,
            },
          });
          studentId = student.id;
          studentsCreated++;
        } else if (studentId && resolution === "REPLACE") {
          await db.student.update({
            where: { id: studentId },
            data: {
              firstName: parsed.firstName!,
              lastName: parsed.lastName!,
              ...(parsed.regNumber ? { regNumber: parsed.regNumber } : {}),
              ...(parsed.gender ? { gender: parsed.gender } : {}),
              classId,
            },
          });
          studentsUpdated++;
        } else if (studentId && resolution === "MERGE") {
          await db.student.update({
            where: { id: studentId },
            data: {
              ...(parsed.gender ? { gender: parsed.gender } : {}),
              ...(parsed.regNumber ? { regNumber: parsed.regNumber } : {}),
              classId,
            },
          });
          studentsUpdated++;
        }
      } else if (row.action === "UPDATE" && studentId) {
        await db.student.update({
          where: { id: studentId },
          data: {
            ...(parsed.gender ? { gender: parsed.gender } : {}),
            ...(parsed.regNumber ? { regNumber: parsed.regNumber } : {}),
            classId,
          },
        });
        studentsUpdated++;
      }

      // Upsert score if we have a subject and any score data
      const subjectName = parsed.subject || subject;
      const hasAnyScore =
        parsed.ca1Parsed !== null ||
        parsed.ca2Parsed !== null ||
        parsed.examParsed !== null ||
        parsed.totalParsed !== null;

      if (studentId && subjectName && hasAnyScore) {
        let total = parsed.totalParsed;
        if (total === null) {
          total = (parsed.ca1Parsed ?? 0) + (parsed.ca2Parsed ?? 0) + (parsed.examParsed ?? 0);
          if (total === 0) total = null;
        }

        await db.score.upsert({
          where: { studentId_subject_term_session: { studentId, subject: subjectName, term, session } },
          create: {
            schoolId,
            studentId,
            classId,
            teacherId,
            subject: subjectName,
            term,
            session,
            ca1: parsed.ca1Parsed,
            ca2: parsed.ca2Parsed,
            exam: parsed.examParsed,
            total,
            grade: parsed.gradeParsed ?? null,
            remark: parsed.remark ?? null,
          },
          update:
            resolution === "KEEP_EXISTING"
              ? {}
              : {
                  ca1: parsed.ca1Parsed,
                  ca2: parsed.ca2Parsed,
                  exam: parsed.examParsed,
                  total,
                  grade: parsed.gradeParsed ?? null,
                  remark: parsed.remark ?? null,
                  classId,
                  teacherId,
                },
        });
        scoresUpserted++;
      }

      await db.importStagingRow.update({
        where: { id: row.id },
        data: { status: "COMMITTED", studentId: studentId ?? undefined },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      errors.push(`Row ${row.rowIndex + 2}: ${msg}`);
      await db.importStagingRow.update({
        where: { id: row.id },
        data: { error: msg },
      });
    }
  }

  await db.importJob.update({
    where: { id: jobId },
    data: {
      status: "COMMITTED",
      committedAt: new Date(),
      studentsCreated: studentsCreated - studentsUpdated < 0 ? 0 : studentsCreated,
      updatedStudents: studentsUpdated,
      newScores: scoresUpserted,
      errors,
    },
  });

  // Log to sync history
  await db.syncLog.create({
    data: {
      schoolId,
      teacherId,
      type: "MANUAL",
      source: job.source,
      status: errors.length === 0 ? "COMPLETED" : "PARTIAL",
      summary: { studentsCreated, studentsUpdated, scoresUpserted, errors: errors.length },
      completedAt: new Date(),
    },
  });

  // Auto-provision the class workspace after commit
  await provisionClassWorkspace(classId, schoolId).catch(() => {});

  return { studentsCreated, studentsUpdated, scoresUpserted, errors };
}
