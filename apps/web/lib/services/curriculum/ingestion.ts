import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { CurriculumSourceType, IngestionJobState, NodeType, SourceAuthorityLevel, SourceVerificationState, StagedReviewState, Prisma } from "@prisma/client";

export type CurriculumAdminActor = { teacherId: string; schoolId: string };
export type ExtractedCurriculumItem = { stableKey: string; parentStableKey?: string; type: NodeType; label: string; rawText: string; subject?: string; classLevel?: "JS1"|"JS2"|"JS3"|"SS1"|"SS2"|"SS3"; term?: "FIRST"|"SECOND"|"THIRD"; sourcePage?: string; sourceSection?: string; extractionConfidence?: number; classificationConfidence?: number };

async function requireAdmin(actor: CurriculumAdminActor) {
  const teacher = await db.teacher.findFirst({ where: { id: actor.teacherId, schoolId: actor.schoolId, isActive: true }, select: { id: true, role: true } });
  if (!teacher || !["ADMIN", "SUPER_ADMIN"].includes(teacher.role)) throw new Error("Curriculum administration requires a privileged school administrator.");
  return teacher;
}

export function fingerprintSource(content: string | Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

export function normalizeExtractedItem(item: ExtractedCurriculumItem): ExtractedCurriculumItem {
  return { ...item, stableKey: item.stableKey.trim(), label: item.label.trim().replace(/\s+/g, " "), rawText: item.rawText, subject: item.subject?.trim() || undefined };
}

export async function registerCurriculumSource(input: { fingerprint: string; title: string; curriculumId: string; sourceType?: CurriculumSourceType; authorityLevel?: SourceAuthorityLevel; organization?: string; sourceUrl?: string; fileName?: string; mimeType?: string; byteSize?: number; publicationYear?: number; effectiveYear?: number; jurisdiction?: string; country?: string; licenseNote?: string }, actor: CurriculumAdminActor) {
  await requireAdmin(actor);
  const existing = await db.curriculumSource.findUnique({ where: { fingerprint: input.fingerprint } });
  if (existing) return { source: existing, duplicate: true };
  const curriculum = await db.curriculum.findUnique({ where: { id: input.curriculumId }, select: { id: true } });
  if (!curriculum) throw new Error("Target curriculum not found.");
  const source = await db.curriculumSource.create({ data: { ...input, verificationState: SourceVerificationState.UNVERIFIED, registeredByTeacherId: actor.teacherId } });
  return { source, duplicate: false };
}

export async function createIngestionJob(input: { sourceId: string; curriculumVersionId?: string; rawHash?: string }, actor: CurriculumAdminActor) {
  await requireAdmin(actor);
  const source = await db.curriculumSource.findUnique({ where: { id: input.sourceId } });
  if (!source) throw new Error("Curriculum source not found.");
  const latest = await db.curriculumIngestionJob.findFirst({ where: { sourceId: input.sourceId }, orderBy: { revision: "desc" } });
  if (latest && latest.rawHash === (input.rawHash ?? source.fingerprint) && latest.state !== IngestionJobState.FAILED) return { job: latest, duplicate: true };
  const job = await db.curriculumIngestionJob.create({ data: { sourceId: input.sourceId, curriculumVersionId: input.curriculumVersionId, rawHash: input.rawHash ?? source.fingerprint, revision: (latest?.revision ?? 0) + 1 } });
  return { job, duplicate: false };
}

const transitions: Record<IngestionJobState, IngestionJobState[]> = { REGISTERED: ["VALIDATING", "CANCELLED"], VALIDATING: ["EXTRACTING", "FAILED", "CANCELLED"], EXTRACTING: ["NORMALIZING", "FAILED", "CANCELLED"], NORMALIZING: ["STAGED", "FAILED", "CANCELLED"], STAGED: ["NEEDS_REVIEW", "FAILED", "CANCELLED"], NEEDS_REVIEW: ["APPROVED", "FAILED", "CANCELLED"], APPROVED: ["PUBLISHING", "CANCELLED"], PUBLISHING: ["PUBLISHED", "FAILED"], PUBLISHED: [], FAILED: ["VALIDATING", "CANCELLED"], CANCELLED: [] };

export async function transitionIngestionJob(jobId: string, next: IngestionJobState, actor: CurriculumAdminActor) {
  await requireAdmin(actor);
  const job = await db.curriculumIngestionJob.findUnique({ where: { id: jobId } });
  if (!job || !transitions[job.state].includes(next)) throw new Error("Invalid ingestion job state transition.");
  return db.curriculumIngestionJob.update({ where: { id: jobId }, data: { state: next, startedAt: next === "VALIDATING" ? new Date() : undefined, completedAt: ["PUBLISHED", "FAILED", "CANCELLED"].includes(next) ? new Date() : undefined } });
}

export async function stageCurriculumItems(jobId: string, items: ExtractedCurriculumItem[], actor: CurriculumAdminActor) {
  await requireAdmin(actor);
  const job = await db.curriculumIngestionJob.findUnique({ where: { id: jobId } });
  if (!job || (job.state !== IngestionJobState.NORMALIZING && job.state !== IngestionJobState.STAGED && job.state !== IngestionJobState.NEEDS_REVIEW)) throw new Error("Job is not accepting staged items.");
  const normalized = items.map(normalizeExtractedItem);
  const rows = [];
  for (const item of normalized) rows.push(await db.curriculumStagedItem.upsert({ where: { jobId_stableKey: { jobId, stableKey: item.stableKey } }, create: { jobId, ...item }, update: { ...item, reviewRevision: { increment: 1 }, reviewState: StagedReviewState.NEEDS_REVIEW, publishedNodeId: null } }));
  await db.curriculumIngestionJob.update({ where: { id: jobId }, data: { state: IngestionJobState.NEEDS_REVIEW } });
  return rows;
}

export async function validateIngestionJob(jobId: string, actor: CurriculumAdminActor) {
  await requireAdmin(actor);
  const job = await db.curriculumIngestionJob.findUnique({ where: { id: jobId }, include: { stagedItems: true } });
  if (!job) throw new Error("Ingestion job not found.");
  const blockers: string[] = []; const warnings: string[] = []; const keys = new Set<string>();
  for (const item of job.stagedItems) { if (!item.label.trim() || !item.rawText) blockers.push(`${item.stableKey}: missing source text or label`); if (keys.has(item.stableKey)) blockers.push(`${item.stableKey}: duplicate stable key`); keys.add(item.stableKey); if (!item.sourcePage && !item.sourceSection) warnings.push(`${item.stableKey}: no page/section evidence`); if (item.parentStableKey && !keys.has(item.parentStableKey) && !job.stagedItems.some((candidate) => candidate.stableKey === item.parentStableKey)) blockers.push(`${item.stableKey}: orphan parent`); }
  return { blockers, warnings, valid: blockers.length === 0 };
}

export async function reviewStagedItem(input: { id: string; label?: string; normalizedText?: string; reviewNotes?: string; expectedRevision: number; decision: "EDIT"|"REJECT"|"APPROVE" }, actor: CurriculumAdminActor) {
  await requireAdmin(actor);
  const item = await db.curriculumStagedItem.findUnique({ where: { id: input.id } });
  if (!item || item.reviewRevision !== input.expectedRevision) throw new Error("Staged curriculum item is stale; reload before reviewing.");
  const state = input.decision === "APPROVE" ? StagedReviewState.APPROVED : input.decision === "REJECT" ? StagedReviewState.REJECTED : StagedReviewState.EDITED;
  return db.curriculumStagedItem.update({ where: { id: item.id }, data: { label: input.label?.trim() ?? undefined, normalizedText: input.normalizedText ?? undefined, reviewNotes: input.reviewNotes ?? undefined, reviewState: state, reviewRevision: { increment: 1 }, reviewedByTeacherId: actor.teacherId, reviewedAt: new Date() } });
}

export async function publishIngestionJob(jobId: string, actor: CurriculumAdminActor) {
  await requireAdmin(actor);
  const validation = await validateIngestionJob(jobId, actor); if (!validation.valid) throw new Error(`Cannot publish curriculum job: ${validation.blockers.join("; ")}`);
  const job = await db.curriculumIngestionJob.findUnique({ where: { id: jobId }, include: { stagedItems: true } });
  if (!job || !job.curriculumVersionId) throw new Error("Target CurriculumVersion is required.");
  if (job.state === IngestionJobState.PUBLISHED) return { published: true, duplicate: true, count: job.stagedItems.filter((item) => item.reviewState === "PUBLISHED").length };
  if (job.stagedItems.some((item) => item.reviewState !== StagedReviewState.APPROVED && item.reviewState !== StagedReviewState.PUBLISHED)) throw new Error("All staged items require explicit approval before publication.");
  const result = await db.$transaction(async (tx) => {
    await tx.curriculumIngestionJob.update({ where: { id: jobId }, data: { state: IngestionJobState.PUBLISHING } });
    const published = new Map<string, string>();
    for (const item of job.stagedItems) {
      const node = await tx.curriculumNode.upsert({ where: { curriculumVersionId_stableKey: { curriculumVersionId: job.curriculumVersionId!, stableKey: item.stableKey } }, create: { curriculumVersionId: job.curriculumVersionId, stableKey: item.stableKey, type: item.type, label: item.label, description: item.description, subject: item.subject, classLevel: item.classLevel, term: item.term }, update: { label: item.label, description: item.description, subject: item.subject, classLevel: item.classLevel, term: item.term } });
      published.set(item.stableKey, node.id);
      await tx.curriculumStagedItem.update({ where: { id: item.id }, data: { reviewState: StagedReviewState.PUBLISHED, publishedNodeId: node.id, reviewedByTeacherId: actor.teacherId, reviewedAt: new Date() } });
    }
    for (const item of job.stagedItems) if (item.parentStableKey) { const sourceId = published.get(item.stableKey); const targetId = published.get(item.parentStableKey); if (sourceId && targetId && sourceId !== targetId) await tx.curriculumEdge.upsert({ where: { sourceId_targetId_relationship: { sourceId, targetId, relationship: "PART_OF" } }, create: { sourceId, targetId, relationship: "PART_OF" }, update: {} }); }
    await tx.curriculumIngestionJob.update({ where: { id: jobId }, data: { state: IngestionJobState.PUBLISHED, completedAt: new Date() } });
    return published.size;
  });
  return { published: true, duplicate: false, count: result };
}

export function asJson(value: Record<string, unknown>): Prisma.InputJsonValue { return value as Prisma.InputJsonValue; }
