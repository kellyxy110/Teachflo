// Import Staging Pipeline
// Parsed rows are validated, checked for duplicates, and written to staging.
// Nothing touches production tables until commit is called.

import { db } from "@/lib/db";

export interface ParsedRow {
  firstName?: string;
  lastName?: string;
  regNumber?: string;
  gender?: string;
  dateOfBirth?: string;
  parentName?: string;
  parentPhone?: string;
  subject?: string;
  ca1?: string | number;
  ca2?: string | number;
  exam?: string | number;
  total?: string | number;
  grade?: string;
  position?: string | number;
  remark?: string;
  principalRemark?: string;
  behaviourRemark?: string;
  className?: string;
}

export interface StagingRowInput {
  rowIndex: number;
  rawData: Record<string, unknown>;
  parsedData: ParsedRow;
}

export interface StageJobResult {
  jobId: string;
  totalRows: number;
  newCount: number;
  updateCount: number;
  conflictCount: number;
  skipCount: number;
  errors: string[];
}

function norm(s?: string | null) {
  return (s ?? "").trim().toLowerCase();
}

function parseNum(v: string | number | undefined): number | null {
  if (v === undefined || v === "" || v === null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(n) ? null : n;
}

function normalizeGender(v?: string): "MALE" | "FEMALE" | null {
  const u = (v ?? "").trim().toUpperCase();
  if (u === "M" || u === "MALE" || u === "BOY") return "MALE";
  if (u === "F" || u === "FEMALE" || u === "GIRL") return "FEMALE";
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

export async function stageImportJob(
  jobId: string,
  schoolId: string,
  rows: StagingRowInput[]
): Promise<StageJobResult> {
  let newCount = 0;
  let updateCount = 0;
  let conflictCount = 0;
  let skipCount = 0;
  const errors: string[] = [];

  // Mark job as analyzing
  await db.importJob.update({ where: { id: jobId }, data: { status: "ANALYZING" } });

  for (const { rowIndex, rawData, parsedData } of rows) {
    const rowNum = rowIndex + 2;
    const firstName = parsedData.firstName?.trim();
    const lastName = parsedData.lastName?.trim();

    if (!firstName || !lastName) {
      await db.importStagingRow.create({
        data: {
          jobId,
          rowIndex,
          rawData: JSON.parse(JSON.stringify(rawData)),
          parsedData: JSON.parse(JSON.stringify(parsedData)),
          action: "SKIP",
          status: "SKIPPED",
          error: `Row ${rowNum}: Missing first or last name`,
        },
      });
      errors.push(`Row ${rowNum}: Missing first or last name`);
      skipCount++;
      continue;
    }

    const regNumber = parsedData.regNumber?.trim() || null;

    // Check for existing student
    const existing = regNumber
      ? await db.student.findFirst({ where: { schoolId, regNumber } })
      : await db.student.findFirst({
          where: {
            schoolId,
            firstName: { equals: firstName, mode: "insensitive" },
            lastName: { equals: lastName, mode: "insensitive" },
          },
        });

    const hasScores =
      parsedData.ca1 !== undefined ||
      parsedData.ca2 !== undefined ||
      parsedData.exam !== undefined ||
      parsedData.total !== undefined;

    let action: "CREATE" | "UPDATE" | "CONFLICT" = "CREATE";
    let conflictData: object | null = null;

    if (existing) {
      // Check for meaningful conflicts
      const nameConflict =
        norm(existing.firstName) !== norm(firstName) ||
        norm(existing.lastName) !== norm(lastName);
      const regConflict =
        regNumber && existing.regNumber && existing.regNumber !== regNumber;

      if (nameConflict || regConflict) {
        action = "CONFLICT";
        conflictData = {
          existing: {
            firstName: existing.firstName,
            lastName: existing.lastName,
            regNumber: existing.regNumber,
          },
          incoming: { firstName, lastName, regNumber },
        };
        conflictCount++;
      } else {
        action = "UPDATE";
        updateCount++;
      }
    } else {
      newCount++;
    }

    // Check for existing scores
    let scoreConflict: object | null = null;
    if (hasScores && existing && parsedData.subject) {
      const existingScore = await db.score.findFirst({
        where: {
          studentId: existing.id,
          subject: parsedData.subject,
        },
      });
      if (existingScore?.total !== null) {
        scoreConflict = {
          existingTotal: existingScore?.total,
          incomingTotal: parseNum(parsedData.total),
        };
        if (action !== "CONFLICT") {
          const previousAction = action;
          action = "CONFLICT";
          conflictCount++;
          if (previousAction === "CREATE") newCount--;
          else if (previousAction === "UPDATE") updateCount--;
        }
        conflictData = { ...((conflictData as object) ?? {}), scoreConflict };
      }
    }

    // Enrich parsedData
    const enriched = {
      ...parsedData,
      firstName,
      lastName,
      regNumber,
      gender: normalizeGender(parsedData.gender),
      ca1Parsed: parseNum(parsedData.ca1),
      ca2Parsed: parseNum(parsedData.ca2),
      examParsed: parseNum(parsedData.exam),
      totalParsed: parseNum(parsedData.total),
      gradeParsed: parsedData.grade?.trim() || computeGrade(parseNum(parsedData.total)),
    };

    await db.importStagingRow.create({
      data: {
        jobId,
        rowIndex,
        rawData: JSON.parse(JSON.stringify(rawData)),
        parsedData: JSON.parse(JSON.stringify(enriched)),
        action,
        status: action === "CONFLICT" ? "PENDING" : "PENDING",
        conflictData: conflictData != null ? JSON.parse(JSON.stringify(conflictData)) : undefined,
        studentId: existing?.id,
      },
    });
  }

  await db.importJob.update({
    where: { id: jobId },
    data: {
      status: "STAGED",
      totalRows: rows.length,
      newStudents: newCount,
      updatedStudents: updateCount,
      conflicts: conflictCount,
      errors,
    },
  });

  return {
    jobId,
    totalRows: rows.length,
    newCount,
    updateCount,
    conflictCount,
    skipCount,
    errors,
  };
}
