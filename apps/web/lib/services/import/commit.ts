// Commit service: moves staged rows into production tables, then provisions workspace.
// Runs inside a Prisma transaction where possible.

import { db } from "@/lib/db";
import { provisionClassWorkspace } from "@/lib/services/provision/workspace";
import type { StagedAssessmentComponentValue } from "./stage";

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

function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
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
    // Excludes COMMITTED rows so a retry after a partial failure (timeout, crash,
    // duplicate request) resumes the remaining rows instead of re-creating students
    // that already succeeded in an earlier attempt. Ordered by rowIndex so a row
    // linked to an earlier "owner" row (see linkedRowIndex below) is always
    // processed after the row that creates the student it depends on.
    include: {
      stagingRows: {
        where: { status: { notIn: ["SKIPPED", "COMMITTED"] } },
        orderBy: { rowIndex: "asc" },
      },
    },
  });

  if (!job) throw new Error("Import job not found");
  if (job.schoolId !== schoolId) throw new Error("School mismatch");
  const lockExpired = job.status === "COMMITTING" && job.updatedAt.getTime() < Date.now() - 5 * 60_000;
  if (!["STAGED", "CONFIRMED"].includes(job.status) && !lockExpired) {
    throw new Error(`Job is in status ${job.status} — cannot commit`);
  }

  // A job-level lease prevents two browser requests from creating separate
  // students for the same unstaged row. A stale lease can be resumed after five
  // minutes (longer than the route's 120-second duration) following a crash.
  const locked = await db.importJob.updateMany({
    where: { id: jobId, schoolId, status: job.status, updatedAt: job.updatedAt },
    data: { status: "COMMITTING" },
  });
  if (locked.count !== 1) throw new Error("Another commit is already processing this import job");

  let studentsCreated = 0;
  let studentsUpdated = 0;
  let scoresUpserted = 0;
  const errors: string[] = [];

  // Rows created earlier in this same pass, so a later row for the same student
  // (e.g. the next subject in a one-row-per-subject sheet) attaches to it instead
  // of creating a second Student record.
  const rowIndexToStudentId = new Map<number, string>();
  const knownComponents = await db.assessmentComponent.findMany({ where: { schoolId, isActive: true } });
  type KnownComponent = (typeof knownComponents)[number];
  const componentsById = new Map(knownComponents.map((component) => [component.id, component]));
  const componentsByName = new Map(knownComponents.map((component) => [component.normalizedName, component]));

  for (const row of job.stagingRows) {
    const parsed = row.parsedData as {
      firstName?: string;
      lastName?: string;
      rawFullName?: string | null;
      regNumber?: string | null;
      gender?: "MALE" | "FEMALE" | null;
      ca1Parsed?: number | null;
      ca2Parsed?: number | null;
      examParsed?: number | null;
      totalParsed?: number | null;
      gradeParsed?: string | null;
      remark?: string | null;
      subject?: string | null;
      linkedRowIndex?: number | null;
      dateOfBirth?: string | null;
      parentName?: string | null;
      parentPhone?: string | null;
      assessmentComponents?: StagedAssessmentComponentValue[];
    };

    const resolution = row.resolution ?? defaultResolution;
    const conflictReason = (row.conflictData as { reason?: string } | null)?.reason;

    try {
      // An AMBIGUOUS_NAME conflict means several existing students share this
      // name in different classes — the generic MERGE/REPLACE/KEEP_EXISTING
      // picker was designed for "known existing record" conflicts, not "which
      // of N different people is this." Never guess: this must be resolved by
      // adding a registration number and re-importing, not by any default
      // resolution choice. The row stays uncommitted (retriable) rather than
      // silently creating a duplicate or silently dropping the row.
      if (conflictReason === "AMBIGUOUS_NAME") {
        const candidates = (row.conflictData as { candidates?: { className: string }[] } | null)?.candidates ?? [];
        const classNames = candidates.map((c) => c.className).join(", ");
        errors.push(
          `Row ${row.rowIndex + 2}: multiple existing students named ${parsed.firstName} ${parsed.lastName} found (in ${classNames || "different classes"}) — add a registration number to disambiguate and re-import this row`
        );
        await db.importStagingRow.update({ where: { id: row.id }, data: { error: "Ambiguous name match — needs a registration number" } });
        continue;
      }

      let studentId = row.studentId ?? null;

      // Resolve a same-batch link (see stage.ts batchNewStudents) before deciding
      // what to do with this row.
      if (!studentId && parsed.linkedRowIndex != null) {
        studentId = rowIndexToStudentId.get(parsed.linkedRowIndex) ?? null;
        if (!studentId) {
          // Owner row isn't in this pass (e.g. it already committed in an earlier
          // partial attempt) — look up the student it created directly.
          const ownerRow = await db.importStagingRow.findFirst({
            where: { jobId, rowIndex: parsed.linkedRowIndex },
            select: { studentId: true },
          });
          studentId = ownerRow?.studentId ?? null;
        }
        if (!studentId) {
          errors.push(
            `Row ${row.rowIndex + 2}: could not link to student from row ${parsed.linkedRowIndex + 2} (that row may have failed) — skipped`
          );
          await db.importStagingRow.update({ where: { id: row.id }, data: { error: "Linked owner row has no student yet" } });
          continue;
        }
      }

      // Production writes for this one row are indivisible. The job itself is
      // deliberately not transactional: rows committed before a later failure
      // remain durable and are excluded on retry.
      let createdForRow = 0;
      let updatedForRow = 0;
      let scoresForRow = 0;
      const resolvedComponentsForRow: KnownComponent[] = [];
      await db.$transaction(async (tx) => {
      if (row.action === "CREATE" || (row.action === "CONFLICT" && resolution !== "KEEP_EXISTING")) {
        if (row.action === "CREATE" || !studentId) {
          const student = await tx.student.create({
            data: {
              schoolId,
              classId,
              firstName: parsed.firstName!,
              lastName: parsed.lastName!,
              ...(parsed.rawFullName ? { rawFullName: parsed.rawFullName } : {}),
              regNumber: parsed.regNumber ?? null,
              gender: parsed.gender ?? null,
            },
          });
          studentId = student.id;
          createdForRow++;
        } else if (studentId && resolution === "REPLACE") {
          await tx.student.update({
            where: { id: studentId },
            data: {
              firstName: parsed.firstName!,
              lastName: parsed.lastName!,
              ...(parsed.regNumber ? { regNumber: parsed.regNumber } : {}),
              ...(parsed.gender ? { gender: parsed.gender } : {}),
              classId,
            },
          });
          updatedForRow++;
        } else if (studentId && resolution === "MERGE") {
          await tx.student.update({
            where: { id: studentId },
            data: {
              ...(parsed.gender ? { gender: parsed.gender } : {}),
              ...(parsed.regNumber ? { regNumber: parsed.regNumber } : {}),
              classId,
            },
          });
          updatedForRow++;
        }
      } else if (row.action === "UPDATE" && studentId) {
        await tx.student.update({
          where: { id: studentId },
          data: {
            ...(parsed.gender ? { gender: parsed.gender } : {}),
            ...(parsed.regNumber ? { regNumber: parsed.regNumber } : {}),
            classId,
          },
        });
        updatedForRow++;
      }

      // Preserve the first imported source representation as the audit baseline.
      // `updateMany` deliberately writes only when no earlier import recorded one.
      if (studentId && parsed.rawFullName) {
        await tx.student.updateMany({
          where: { id: studentId, rawFullName: null },
          data: { rawFullName: parsed.rawFullName },
        });
      }

      // Persist profile fields (date of birth, parent contacts) if the sheet had them —
      // these are mapped in the UI but have no home on the Student row itself.
      const dateOfBirth = parseDate(parsed.dateOfBirth);
      const parentName = parsed.parentName?.trim() || null;
      const parentPhone = parsed.parentPhone?.trim() || null;
      if (studentId && (dateOfBirth || parentName || parentPhone)) {
        await tx.studentProfile.upsert({
          where: { studentId },
          create: {
            studentId,
            schoolId,
            ...(dateOfBirth ? { dateOfBirth } : {}),
            ...(parentName ? { parentName } : {}),
            ...(parentPhone ? { parentPhone } : {}),
          },
          update: {
            ...(dateOfBirth ? { dateOfBirth } : {}),
            ...(parentName ? { parentName } : {}),
            ...(parentPhone ? { parentPhone } : {}),
          },
        });
      }

      // Upsert score if we have a subject and any score data
      const subjectName = parsed.subject || subject;
      const hasAnyScore =
        parsed.ca1Parsed !== null ||
        parsed.ca2Parsed !== null ||
        parsed.examParsed !== null ||
        parsed.totalParsed !== null ||
        (parsed.assessmentComponents?.length ?? 0) > 0;

      if (studentId && subjectName && hasAnyScore) {
        let total = parsed.totalParsed;
        if (total === null) {
          total = (parsed.ca1Parsed ?? 0) + (parsed.ca2Parsed ?? 0) + (parsed.examParsed ?? 0);
          if (total === 0) total = null;
        }

        const persistedScore = await tx.score.upsert({
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

        const componentValueRows: Array<{
          scoreId: string;
          assessmentComponentId: string;
          obtainedScore: number;
          sourceLabel: string;
          sourceMaxScore: number | null;
        }> = [];
        for (const stagedComponent of parsed.assessmentComponents ?? []) {
          if (
            !stagedComponent.sourceColumn ||
            !stagedComponent.sourceLabel ||
            !stagedComponent.componentName ||
            !stagedComponent.normalizedName ||
            !Number.isFinite(stagedComponent.obtainedScore) ||
            stagedComponent.obtainedScore < 0 ||
            (stagedComponent.maxScore !== undefined && stagedComponent.obtainedScore > stagedComponent.maxScore)
          ) {
            throw new Error(`Invalid staged assessment component ${stagedComponent.sourceLabel || "value"}`);
          }

          const cachedComponent = stagedComponent.existingComponentId
            ? componentsById.get(stagedComponent.existingComponentId)
            : componentsByName.get(stagedComponent.normalizedName);
          const component = cachedComponent ?? (
            !stagedComponent.existingComponentId && stagedComponent.createConfirmed
              ? await tx.assessmentComponent.upsert({
                  where: {
                    schoolId_normalizedName: {
                      schoolId,
                      normalizedName: stagedComponent.normalizedName,
                    },
                  },
                  create: {
                    schoolId,
                    name: stagedComponent.componentName,
                    normalizedName: stagedComponent.normalizedName,
                    maxScore: stagedComponent.maxScore ?? null,
                    order: stagedComponent.order,
                  },
                  // A previously confirmed school definition remains authoritative.
                  // Imports reuse it rather than silently changing its scale or label.
                  update: {},
                })
              : null
          );

          if (!component) {
            throw new Error(`Assessment component is unavailable for this school: ${stagedComponent.sourceLabel}`);
          }

          const effectiveMaxScore = component.maxScore ?? stagedComponent.maxScore;
          if (effectiveMaxScore !== null && effectiveMaxScore !== undefined && stagedComponent.obtainedScore > effectiveMaxScore) {
            throw new Error(`Assessment component score exceeds its school-defined maximum: ${stagedComponent.sourceLabel}`);
          }

          componentValueRows.push({
            scoreId: persistedScore.id,
            assessmentComponentId: component.id,
            obtainedScore: stagedComponent.obtainedScore,
            sourceLabel: stagedComponent.sourceLabel,
            sourceMaxScore: effectiveMaxScore ?? null,
          });
          if (!cachedComponent) resolvedComponentsForRow.push(component);
        }
        if (componentValueRows.length > 0 && resolution !== "KEEP_EXISTING") {
          await tx.scoreAssessmentComponentValue.deleteMany({
            where: {
              scoreId: persistedScore.id,
              assessmentComponentId: { in: componentValueRows.map((value) => value.assessmentComponentId) },
            },
          });
          await tx.scoreAssessmentComponentValue.createMany({ data: componentValueRows });
        }
        scoresForRow++;
      }

      await tx.importStagingRow.update({
        where: { id: row.id },
        data: { status: "COMMITTED", studentId: studentId ?? undefined },
      });
      }, {
        // A component-rich result row performs several dependent upserts over a
        // remote database connection. Keep the entire row atomic while allowing
        // enough time for legitimate school-specific assessment structures.
        maxWait: 5_000,
        timeout: 30_000,
      });

      // Only update in-memory result/link state after the database transaction
      // has committed. A failed transaction cannot leave a sibling row pointing
      // at a rolled-back Student.
      studentsCreated += createdForRow;
      studentsUpdated += updatedForRow;
      scoresUpserted += scoresForRow;
      if (createdForRow && studentId) rowIndexToStudentId.set(row.rowIndex, studentId);
      for (const component of resolvedComponentsForRow) {
        componentsById.set(component.id, component);
        componentsByName.set(component.normalizedName, component);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      errors.push(`Row ${row.rowIndex + 2}: ${msg}`);
      await db.importStagingRow.update({
        where: { id: row.id },
        data: { error: msg },
      });
    }
  }

  // Rows that failed keep a non-COMMITTED staging status (see catch block above), so a
  // job with outstanding errors is kept in STAGED status rather than COMMITTED — this
  // lets the teacher retry the commit and only the still-failing rows are reprocessed
  // (the query above excludes rows already COMMITTED).
  const stillHasFailures = errors.length > 0;

  await db.importJob.update({
    where: { id: jobId },
    data: {
      status: stillHasFailures ? "STAGED" : "COMMITTED",
      committedAt: stillHasFailures ? null : new Date(),
      // Accumulate across partial/retried commit attempts rather than overwrite —
      // a resumed job should report totals for the whole job, not just this pass.
      newStudents: job.newStudents + Math.max(0, studentsCreated),
      updatedStudents: job.updatedStudents + studentsUpdated,
      newScores: job.newScores + scoresUpserted,
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
