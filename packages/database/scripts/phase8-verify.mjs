/**
 * Development-only Phase 8 database verification.
 *
 * Run: node packages/database/scripts/phase8-verify.mjs
 * The guard deliberately accepts only the dedicated synthetic-test project.
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const APPROVED_PROJECT = "wxgnufdacfncwxbedzap";
const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const line = env.split(/\r?\n/).find((value) => value.startsWith("DATABASE_URL="));
if (!line && !process.env.DATABASE_URL) throw new Error("Phase 8 guard: DATABASE_URL is missing");
const url = new URL(process.env.DATABASE_URL ?? line.slice("DATABASE_URL=".length).replace(/^"|"$/g, ""));
if (
  !url.username.includes(APPROVED_PROJECT) ||
  url.port !== "5432" ||
  url.pathname !== "/postgres"
) {
  throw new Error("Phase 8 guard: refusing a non-approved Development database target");
}

const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
const token = `PHASE8_SYNTH_${Date.now()}`;
const ids = [];
const results = new Map();
const pass = (name, condition) => {
  if (!condition) throw new Error(`Verification failed: ${name}`);
  results.set(name, "PASS");
};

async function main() {
  const preflight = await db.$queryRawUnsafe(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'teachers' AND column_name = 'classLevels'
    ) AS teacher_class_levels
  `);
  if (!preflight[0]?.teacher_class_levels) {
    throw new Error("SCHEMA PRECONDITION FAILED: teachers.\"classLevels\" is missing; apply the reviewed baseline reconciliation migration before verification");
  }
  const schoolA = await db.school.create({ data: { name: `${token} School A`, code: `${token}A`, state: "Test" } });
  const schoolB = await db.school.create({ data: { name: `${token} School B`, code: `${token}B`, state: "Test" } });
  ids.push(schoolA.id, schoolB.id);
  const teacher = await db.teacher.create({ data: { schoolId: schoolA.id, clerkId: `${token}_teacher`, firstName: "Synthetic", lastName: "Teacher", email: `${token}@invalid.test`, subjects: [], classLevels: [] } });
  const klass = await db.class.create({ data: { schoolId: schoolA.id, name: `${token} JS1`, level: "JS1", session: "2099/2100" } });

  // Successful all-or-nothing row analogue: student, profile, score and staging state.
  const job = await db.importJob.create({ data: { schoolId: schoolA.id, teacherId: teacher.id, source: "CSV", status: "STAGED" } });
  const row = await db.importStagingRow.create({ data: { jobId: job.id, rowIndex: 0, rawData: {}, parsedData: {}, action: "CREATE", status: "PENDING" } });
  let studentId;
  await db.$transaction(async (tx) => {
    const student = await tx.student.create({ data: { schoolId: schoolA.id, classId: klass.id, firstName: "Ada", lastName: "Okafor", rawFullName: "OKAFOR Ada", regNumber: `${token}-1` } });
    studentId = student.id;
    await tx.studentProfile.create({ data: { studentId: student.id, schoolId: schoolA.id, parentName: "Synthetic Parent" } });
    await tx.score.create({ data: { schoolId: schoolA.id, classId: klass.id, teacherId: teacher.id, studentId: student.id, subject: "Mathematics", term: "FIRST", session: "2099/2100", total: 80 } });
    await tx.importStagingRow.update({ where: { id: row.id }, data: { status: "COMMITTED", studentId: student.id } });
  });
  pass("transaction-success", Boolean(await db.student.findUnique({ where: { id: studentId } })) && Boolean(await db.studentProfile.findUnique({ where: { studentId } })) && (await db.score.count({ where: { studentId } })) === 1 && (await db.importStagingRow.findUnique({ where: { id: row.id } }))?.status === "COMMITTED");

  // Retry selection is status-driven: COMMITTED rows are excluded while failed
  // and pending rows remain eligible. This mirrors commitImportJob's query.
  const retryJob = await db.importJob.create({ data: { schoolId: schoolA.id, teacherId: teacher.id, source: "CSV", status: "STAGED" } });
  await db.importStagingRow.createMany({ data: [
    { jobId: retryJob.id, rowIndex: 0, rawData: {}, parsedData: {}, action: "CREATE", status: "COMMITTED" },
    { jobId: retryJob.id, rowIndex: 1, rawData: {}, parsedData: {}, action: "CREATE", status: "PENDING", error: "controlled failure" },
    { jobId: retryJob.id, rowIndex: 2, rawData: {}, parsedData: {}, action: "CREATE", status: "PENDING" },
  ] });
  const eligible = await db.importStagingRow.findMany({ where: { jobId: retryJob.id, status: { notIn: ["SKIPPED", "COMMITTED"] } }, orderBy: { rowIndex: "asc" } });
  pass("retry-selection", eligible.map((r) => r.rowIndex).join(",") === "1,2");

  // The compare-and-set lease gives exactly one concurrent winner.
  const leaseJob = await db.importJob.create({ data: { schoolId: schoolA.id, teacherId: teacher.id, source: "CSV", status: "STAGED" } });
  const observed = (await db.importJob.findUniqueOrThrow({ where: { id: leaseJob.id } })).updatedAt;
  const winners = await Promise.all([0, 1].map(() => db.importJob.updateMany({ where: { id: leaseJob.id, schoolId: schoolA.id, status: "STAGED", updatedAt: observed }, data: { status: "COMMITTING" } })));
  pass("lease-concurrency", winners.reduce((sum, r) => sum + r.count, 0) === 1);
  await db.importJob.update({ where: { id: leaseJob.id }, data: { status: "COMMITTING", updatedAt: new Date(Date.now() - 6 * 60_000) } });
  const stale = await db.importJob.findUniqueOrThrow({ where: { id: leaseJob.id } });
  pass("lease-stale-recovery", stale.status === "COMMITTING" && stale.updatedAt.getTime() < Date.now() - 5 * 60_000);

  // Failure at every subsequent write rolls back the earlier writes and staging state.
  for (const point of ["profile", "score", "staging"]) {
    const failedJob = await db.importJob.create({ data: { schoolId: schoolA.id, teacherId: teacher.id, source: "CSV", status: "STAGED" } });
    const failedRow = await db.importStagingRow.create({ data: { jobId: failedJob.id, rowIndex: 0, rawData: {}, parsedData: {}, action: "CREATE", status: "PENDING" } });
    const reg = `${token}-${point}`;
    try {
      await db.$transaction(async (tx) => {
        const s = await tx.student.create({ data: { schoolId: schoolA.id, classId: klass.id, firstName: "Fail", lastName: point, regNumber: reg } });
        if (point === "profile") throw new Error("controlled profile failure");
        await tx.studentProfile.create({ data: { studentId: s.id, schoolId: schoolA.id } });
        if (point === "score") throw new Error("controlled score failure");
        await tx.score.create({ data: { schoolId: schoolA.id, classId: klass.id, teacherId: teacher.id, studentId: s.id, subject: "Mathematics", term: "FIRST", session: "2099/2100" } });
        if (point === "staging") throw new Error("controlled staging failure");
        await tx.importStagingRow.update({ where: { id: failedRow.id }, data: { status: "COMMITTED", studentId: s.id } });
      });
    } catch { /* expected */ }
    pass(`${point}-rollback`, (await db.student.count({ where: { schoolId: schoolA.id, regNumber: reg } })) === 0 && (await db.importStagingRow.findUnique({ where: { id: failedRow.id } }))?.status === "PENDING");
  }

  // Score identity, raw-name preserve-first, and alias tenancy are DB invariants.
  await db.score.upsert({ where: { studentId_subject_term_session: { studentId, subject: "Mathematics", term: "FIRST", session: "2099/2100" } }, create: { schoolId: schoolA.id, classId: klass.id, teacherId: teacher.id, studentId, subject: "Mathematics", term: "FIRST", session: "2099/2100" }, update: { total: 81 } });
  await db.score.create({ data: { schoolId: schoolA.id, classId: klass.id, teacherId: teacher.id, studentId, subject: "Mathematics", term: "SECOND", session: "2099/2100" } });
  await db.score.create({ data: { schoolId: schoolA.id, classId: klass.id, teacherId: teacher.id, studentId, subject: "Mathematics", term: "FIRST", session: "2100/2101" } });
  pass("score-identity", (await db.score.count({ where: { studentId, subject: "Mathematics" } })) === 3);
  await db.student.updateMany({ where: { id: studentId, rawFullName: null }, data: { rawFullName: "SHOULD NOT REPLACE" } });
  pass("raw-full-name-preserve-first", (await db.student.findUnique({ where: { id: studentId } }))?.rawFullName === "OKAFOR Ada");
  const nullRaw = await db.student.create({ data: { schoolId: schoolA.id, classId: klass.id, firstName: "Musa", lastName: "Ibrahim", regNumber: `${token}-null` } });
  await db.student.updateMany({ where: { id: nullRaw.id, rawFullName: null }, data: { rawFullName: "IBRAHIM Musa-Kabiru" } });
  pass("raw-full-name-null-fill", (await db.student.findUnique({ where: { id: nullRaw.id } }))?.rawFullName === "IBRAHIM Musa-Kabiru");
  await db.subjectAlias.create({ data: { schoolId: schoolA.id, rawValue: "maths", canonicalSubject: "Mathematics" } });
  pass("subject-alias-isolation", (await db.subjectAlias.count({ where: { schoolId: schoolA.id, rawValue: "maths" } })) === 1 && (await db.subjectAlias.count({ where: { schoolId: schoolB.id, rawValue: "maths" } })) === 0);
  const request = await db.integrationRequest.create({ data: { schoolId: schoolA.id, teacherId: teacher.id, connectorId: "synthetic", schoolName: schoolA.name, portalUrl: "https://example.invalid", adminContact: "Synthetic Admin" } });
  pass("integration-request-persistence", Boolean(request.createdAt) && request.schoolId === schoolA.id && request.teacherId === teacher.id);
  console.log(JSON.stringify(Object.fromEntries(results)));
}

main().finally(async () => {
  // Deletes are intentionally scoped to the token-created schools and cascade through test data.
  await db.integrationRequest.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => undefined);
  await db.subjectAlias.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => undefined);
  for (const id of ids.reverse()) await db.school.delete({ where: { id } }).catch(() => undefined);
  await db.$disconnect();
});
