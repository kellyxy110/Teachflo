// Import Staging Pipeline
// Parsed rows are validated, checked for duplicates, and written to staging.
// Nothing touches production tables until commit is called.

import { db } from "@/lib/db";
import { resolveStudentIdentity } from "./resolve-student";
import { splitFullName, type FullNameFormat, DEFAULT_FULL_NAME_FORMAT } from "./name-format";
import { normalizeKey, learnSubjectAlias } from "./subject-normalize";
import type { AssessmentComponentMapping } from "./validation";

export interface StagedAssessmentComponentValue extends AssessmentComponentMapping {
  obtainedScore: number;
  sourceLabel: string;
}

export interface ParsedRow {
  fullName?: string;
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

function normalizeComponentName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseNum(v: unknown): number | null {
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

export interface StageJobOptions {
  // Used only as a tie-breaker preference in identity resolution (prefer a
  // match already in this class before falling back to a school-wide match)
  // — never a hard filter. See resolve-student.ts.
  classId?: string;
  term?: "FIRST" | "SECOND" | "THIRD";
  session?: string;
  // Teacher-confirmed split direction for a mapped "Full Name" column. Never
  // guessed silently — the UI must have the teacher confirm this first.
  fullNameFormat?: FullNameFormat;
  // Teacher-confirmed raw subject text -> canonical subject name, from the
  // Subject Registry confirmation step. Unmapped raw values pass through as-is.
  subjectCanonicalMap?: Record<string, string>;
  // Confirmed definitions only. Ownership of an existing component ID is
  // checked by the authenticated route before these definitions reach staging.
  assessmentComponentMappings?: AssessmentComponentMapping[];
}

export async function stageImportJob(
  jobId: string,
  schoolId: string,
  rows: StagingRowInput[],
  options: StageJobOptions = {}
): Promise<StageJobResult> {
  const {
    classId,
    term,
    session,
    fullNameFormat = DEFAULT_FULL_NAME_FORMAT,
    subjectCanonicalMap = {},
    assessmentComponentMappings = [],
  } = options;

  let newCount = 0;
  let updateCount = 0;
  let conflictCount = 0;
  let skipCount = 0;
  const errors: string[] = [];

  // Tracks students that this same batch has already decided to CREATE, keyed by
  // regNumber (or normalized name when no reg number is given). Result-import-style
  // sheets legitimately repeat the same student across multiple rows (one row per
  // subject) with no existing DB match for any of them — without this, every row
  // after the first would independently resolve to CREATE and each subject would
  // land on its own duplicate Student record instead of one student with N scores.
  const batchNewStudents = new Map<string, number>();

  // Mark job as analyzing
  await db.importJob.update({ where: { id: jobId }, data: { status: "ANALYZING" } });

  for (const { rowIndex, rawData, parsedData } of rows) {
    const rowNum = rowIndex + 2;

    // A mapped "Full Name" column is split per the teacher-confirmed format
    // rather than a hardcoded assumption. Explicit firstName/lastName mappings
    // (when present) always win over a fullName column.
    let firstName = parsedData.firstName?.trim();
    let lastName = parsedData.lastName?.trim();
    let rawFullName: string | null = null;
    if ((!firstName || !lastName) && parsedData.fullName?.trim()) {
      const split = splitFullName(parsedData.fullName, fullNameFormat);
      firstName = firstName || split.firstName;
      lastName = lastName || split.lastName;
      rawFullName = split.rawFullName;
    }

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

    // Canonicalize subject via the teacher-confirmed Subject Registry mapping
    // (falls through to the raw value if it wasn't part of that confirmation).
    const rawSubject = parsedData.subject?.trim();
    const canonicalSubject = rawSubject
      ? subjectCanonicalMap[normalizeKey(rawSubject)] ?? rawSubject
      : rawSubject;

    const resolution = await resolveStudentIdentity({ schoolId, classId, firstName, lastName, regNumber });

    const stagedAssessmentComponents: StagedAssessmentComponentValue[] = assessmentComponentMappings.flatMap((mapping) => {
      const obtainedScore = parseNum(rawData[mapping.sourceColumn]);
      return obtainedScore === null
        ? []
        : [{
            ...mapping,
            normalizedName: normalizeComponentName(mapping.normalizedName),
            obtainedScore,
            sourceLabel: mapping.sourceColumn,
          }];
    });

    const hasScores =
      parsedData.ca1 !== undefined ||
      parsedData.ca2 !== undefined ||
      parsedData.exam !== undefined ||
      parsedData.total !== undefined ||
      stagedAssessmentComponents.length > 0;

    let action: "CREATE" | "UPDATE" | "CONFLICT" = "CREATE";
    let conflictData: object | null = null;
    let linkedRowIndex: number | null = null;
    const existing = resolution.type === "MATCH" ? resolution : null;

    const dedupKey = regNumber ? `reg:${regNumber.toLowerCase()}` : `name:${norm(firstName)}|${norm(lastName)}`;

    if (resolution.type === "AMBIGUOUS") {
      // Several existing students share this name in different classes — a
      // student's identity must not be guessed from a name collision. Surface
      // for the teacher to pick manually rather than silently attaching to
      // whichever record happened to be found first.
      action = "CONFLICT";
      conflictData = {
        reason: "AMBIGUOUS_NAME",
        incoming: { firstName, lastName, regNumber },
        candidates: resolution.candidates,
      };
      conflictCount++;
    } else if (existing) {
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
    } else if (batchNewStudents.has(dedupKey)) {
      // Same identity already staged as CREATE earlier in this same file (e.g. one
      // row per subject) — attach this row to that student instead of creating a
      // second one.
      action = "UPDATE";
      linkedRowIndex = batchNewStudents.get(dedupKey)!;
      updateCount++;
    } else {
      newCount++;
      batchNewStudents.set(dedupKey, rowIndex);
    }

    // Check for existing scores
    let scoreConflict: object | null = null;
    if (hasScores && existing && canonicalSubject && term && session) {
      const existingScore = await db.score.findFirst({
        where: {
          studentId: existing.studentId,
          subject: canonicalSubject,
          term,
          session,
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
    const suppliedTotal = parseNum(parsedData.total);
    const visibleComponentSum = stagedAssessmentComponents.reduce(
      (sum, component) => sum + component.obtainedScore,
      parseNum(parsedData.exam) ?? 0
    );
    const enriched = {
      ...parsedData,
      firstName,
      lastName,
      rawFullName,
      regNumber,
      subject: canonicalSubject,
      gender: normalizeGender(parsedData.gender),
      ca1Parsed: parseNum(parsedData.ca1),
      ca2Parsed: parseNum(parsedData.ca2),
      examParsed: parseNum(parsedData.exam),
      // A supplied source total (for example SchoolCube TAVG) is authoritative.
      // Component arithmetic is retained only as a preview/validation signal.
      totalParsed: suppliedTotal,
      gradeParsed: parsedData.grade?.trim() || computeGrade(suppliedTotal),
      assessmentComponents: stagedAssessmentComponents,
      visibleComponentSum: stagedAssessmentComponents.length > 0 ? visibleComponentSum : null,
      componentTotalMismatch:
        suppliedTotal !== null && stagedAssessmentComponents.length > 0
          ? Math.abs(visibleComponentSum - suppliedTotal) > 0.000001
          : false,
      // Row index of the sibling row in this same file that owns the CREATE for this
      // student (set only when this row was matched via batchNewStudents above).
      linkedRowIndex,
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
        studentId: existing?.studentId,
      },
    });

    // Learn the confirmed subject alias for this school (best-effort, never blocks).
    if (rawSubject && canonicalSubject && rawSubject !== canonicalSubject) {
      await learnSubjectAlias(schoolId, rawSubject, canonicalSubject);
    }
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
