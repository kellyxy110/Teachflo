import { ImportSource, ImportStatus, Prisma, QuestionSourceKind, QuestionType, Section, StagingAction, StagingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { parseCsvQuestions } from "./csv";
import { parseDocxQuestions } from "./docx";
import { parseXlsxQuestions } from "./xlsx";
import type { QuestionImportCandidate } from "./types";

type Actor = { teacherId: string; schoolId: string };

function sourceFor(format: "CSV" | "XLSX" | "DOCX"): ImportSource {
  return format === "CSV" ? ImportSource.CSV : format === "XLSX" ? ImportSource.EXCEL : ImportSource.MANUAL;
}

function json(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }

export function parseQuestionImport(name: string, buffer: Buffer, mime?: string) {
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "csv") return parseCsvQuestions(name, buffer, mime);
  if (ext === "xlsx") return parseXlsxQuestions(name, buffer, mime);
  if (ext === "docx") return parseDocxQuestions(name, buffer, mime);
  throw new Error("Unsupported question import format.");
}

export async function stageQuestionImport(actor: Actor, name: string, buffer: Buffer, mime?: string) {
  const result = parseQuestionImport(name, buffer, mime);
  const format = result.format;
  const existing = await db.importJob.findFirst({ where: { schoolId: actor.schoolId, teacherId: actor.teacherId, metadata: { path: ["questionImport", "sourceFingerprint"], equals: result.sourceFingerprint } } });
  if (existing) {
    const rows = await db.importStagingRow.findMany({ where: { jobId: existing.id }, orderBy: { rowIndex: "asc" } });
    return { jobId: existing.id, duplicate: true, result, rows: rows.map((row) => ({ id: row.id, rowIndex: row.rowIndex, candidate: row.parsedData })) };
  }
  const job = await db.importJob.create({ data: { schoolId: actor.schoolId, teacherId: actor.teacherId, source: sourceFor(format), fileName: name, status: ImportStatus.STAGED, totalRows: result.candidates.length, metadata: json({ questionImport: { format, sourceFingerprint: result.sourceFingerprint, warnings: result.warnings, errors: result.errors, revision: 1 } }) } });
  if (result.candidates.length) {
    await db.importStagingRow.createMany({ data: result.candidates.map((candidate, index) => ({ jobId: job.id, rowIndex: index, rawData: json(candidate.rawSource), parsedData: json({ ...candidate, reviewRevision: 1 }), action: candidate.status === "ERROR" ? StagingAction.SKIP : StagingAction.CREATE, status: candidate.status === "ERROR" ? StagingStatus.SKIPPED : StagingStatus.PENDING, error: candidate.errors.length ? candidate.errors.join("; ") : null })) });
  }
  const rows = await db.importStagingRow.findMany({ where: { jobId: job.id }, orderBy: { rowIndex: "asc" } });
  return { jobId: job.id, duplicate: false, result, rows: rows.map((row) => ({ id: row.id, rowIndex: row.rowIndex, candidate: row.parsedData })) };
}

export async function getQuestionImportJob(actor: Actor, jobId: string) {
  const job = await db.importJob.findUnique({ where: { id: jobId }, include: { stagingRows: { orderBy: { rowIndex: "asc" } } } });
  if (!job || job.schoolId !== actor.schoolId || job.teacherId !== actor.teacherId) throw new Error("Question import job not found.");
  return { jobId: job.id, status: job.status, rows: job.stagingRows.map((row) => ({ id: row.id, rowIndex: row.rowIndex, candidate: row.parsedData, stagingStatus: row.status })) };
}

async function ownedRow(actor: Actor, rowId: string) {
  const row = await db.importStagingRow.findUnique({ where: { id: rowId }, include: { job: true } });
  if (!row || row.job.schoolId !== actor.schoolId || row.job.teacherId !== actor.teacherId) throw new Error("Question import candidate not found.");
  return row;
}

export async function reviewQuestionCandidate(actor: Actor, rowId: string, patch: Partial<QuestionImportCandidate>, expectedRevision: number) {
  const row = await ownedRow(actor, rowId);
  const current = row.parsedData as Record<string, unknown>;
  const revision = Number(current.reviewRevision ?? 1);
  if (revision !== expectedRevision) throw new Error("STALE_REVIEW_CANDIDATE");
  const next = { ...current, ...patch, reviewRevision: revision + 1 };
  const status = patch.status ?? (patch.errors?.length ? "ERROR" : "READY");
  await db.importStagingRow.update({ where: { id: rowId }, data: { parsedData: json(next), status: status === "READY" ? StagingStatus.RESOLVED : status === "ERROR" ? StagingStatus.SKIPPED : StagingStatus.PENDING, action: status === "ERROR" ? StagingAction.SKIP : StagingAction.CREATE, error: next.errors?.length ? next.errors.join("; ") : null } });
  return next;
}

export async function approveQuestionCandidate(actor: Actor, rowId: string, expectedRevision: number) {
  const row = await ownedRow(actor, rowId);
  const current = row.parsedData as Record<string, unknown>;
  if (Number(current.reviewRevision ?? 1) !== expectedRevision) throw new Error("STALE_REVIEW_CANDIDATE");
  if (current.status !== "READY" && current.status !== "POSSIBLE_DUPLICATE") throw new Error("CANDIDATE_REQUIRES_REVIEW");
  const next = { ...current, status: "READY", approved: true, reviewRevision: expectedRevision + 1 };
  await db.importStagingRow.update({ where: { id: rowId }, data: { parsedData: json(next), status: StagingStatus.RESOLVED, action: StagingAction.CREATE, error: null } });
  return next;
}

function toQuestionType(value: unknown): QuestionType {
  if (typeof value !== "string" || !Object.values(QuestionType).includes(value as QuestionType)) throw new Error("Invalid question type.");
  return value as QuestionType;
}

export async function commitApprovedQuestionCandidates(actor: Actor, jobId: string) {
  const job = await db.importJob.findUnique({ where: { id: jobId }, include: { stagingRows: true } });
  if (!job || job.schoolId !== actor.schoolId || job.teacherId !== actor.teacherId) throw new Error("Question import job not found.");
  const committed: string[] = [];
  for (const row of job.stagingRows) {
    const candidate = row.parsedData as Record<string, unknown>;
    if (candidate.approved !== true || candidate.status !== "READY" || row.status !== StagingStatus.RESOLVED) continue;
    const existing = await db.question.findFirst({ where: { schoolId: actor.schoolId, stem: String(candidate.stem ?? "") } });
    if (existing) { await db.importStagingRow.update({ where: { id: row.id }, data: { action: StagingAction.CONFLICT, status: StagingStatus.PENDING, conflictData: json({ reason: "POSSIBLE_DUPLICATE", questionId: existing.id }) } }); continue; }
    const created = await db.$transaction(async (tx) => {
      const claim = await tx.importStagingRow.updateMany({ where: { id: row.id, status: StagingStatus.RESOLVED }, data: { status: StagingStatus.COMMITTED } });
      if (claim.count !== 1) return null;
      const question = await tx.question.create({ data: { schoolId: actor.schoolId, createdByTeacherId: actor.teacherId, lifecycle: "APPROVED", sourceKind: QuestionSourceKind.IMPORTED, visibility: "PRIVATE", section: Section.A, number: row.rowIndex + 1, type: toQuestionType(candidate.questionType), stem: String(candidate.stem ?? ""), optionA: String((candidate.options as string[] | undefined)?.[0] ?? "") || null, optionB: String((candidate.options as string[] | undefined)?.[1] ?? "") || null, optionC: String((candidate.options as string[] | undefined)?.[2] ?? "") || null, optionD: String((candidate.options as string[] | undefined)?.[3] ?? "") || null, correctOption: candidate.answer ? String(candidate.answer) : null, defaultMarks: typeof candidate.marks === "number" ? candidate.marks : null, solution: String(candidate.answer ?? ""), explanation: String(candidate.explanation ?? ""), difficulty: "medium", questionSource: String(job.fileName ?? "import") } });
      const version = await tx.questionVersion.create({ data: { questionId: question.id, version: 1, payload: json({ stem: question.stem, options: [question.optionA, question.optionB, question.optionC, question.optionD], answer: question.correctOption, marks: question.defaultMarks, explanation: question.explanation, sourceFingerprint: candidate.sourceFingerprint, duplicateFingerprint: candidate.duplicateFingerprint }) } });
      await tx.importStagingRow.update({ where: { id: row.id }, data: { parsedData: json({ ...candidate, importedQuestionId: question.id, importedQuestionVersionId: version.id }) } });
      return { question, version };
    });
    if (!created) continue;
    committed.push(created.question.id);
  }
  await db.importJob.update({ where: { id: jobId }, data: { status: ImportStatus.COMMITTED, committedAt: new Date(), metadata: json({ ...(job.metadata as object ?? {}), questionImport: { ...((job.metadata as Record<string, unknown> | null)?.questionImport as object ?? {}), committedQuestionIds: committed } }) } });
  return committed;
}
