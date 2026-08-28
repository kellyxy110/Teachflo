import { readFileSync } from "node:fs";

async function main() {
  const line = readFileSync(new URL("../../../packages/database/.env", import.meta.url), "utf8").split(/\r?\n/).find((v) => v.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL missing");
  const url = new URL(line.slice(13).replace(/^"|"$/g, ""));
  if (!url.username.includes("wxgnufdacfncwxbedzap")) throw new Error("Refusing non-Development database");
  process.env.DATABASE_URL = url.toString();
  const { db } = await import("@/lib/db");
  const { commitImportJob } = await import("@/lib/services/import/commit");
  const token = `STALE_SYNTH_${Date.now()}`;
  let schoolId: string | undefined;
  let stage = "fixture-start";
  const watchdog = setTimeout(() => { console.error(`STALE_WORKER: watchdog last-stage=${stage}`); process.exitCode = 1; }, 25_000);
  try {
    console.log("STALE_WORKER: fixture-start");
    const school = await db.school.create({ data: { name: token, code: token, state: "Test" } }); schoolId = school.id;
    const teacher = await db.teacher.create({ data: { schoolId, clerkId: `${token}_t`, firstName: "Synthetic", lastName: "Teacher", email: `${token}@invalid.test`, subjects: [], classLevels: [] } });
    const klass = await db.class.create({ data: { schoolId, name: token, level: "JS1", session: "2099/2100" } });
    const job = await db.importJob.create({ data: { schoolId, teacherId: teacher.id, source: "CSV", status: "COMMITTING" } });
    await db.importStagingRow.create({ data: { jobId: job.id, rowIndex: 0, rawData: {}, parsedData: { firstName: "Lease", lastName: "Recovered", regNumber: `${token}-student`, subject: "Mathematics", ca1Parsed: 7 }, action: "CREATE", status: "PENDING" } });
    console.log("STALE_WORKER: job-created"); console.log("STALE_WORKER: initial-status=COMMITTING");
    stage = "healthy-lease"; console.log("STALE_WORKER: healthy-lease-check-start");
    const start = Date.now(); const rejected = await commitImportJob({ jobId: job.id, schoolId, teacherId: teacher.id, classId: klass.id, term: "FIRST", session: "2099/2100" }).then(() => false).catch(() => true);
    console.log(`STALE_WORKER: healthy-lease-check-end elapsed=${Date.now()-start}ms`); console.log(`STALE_WORKER: healthy-lease-result=${rejected ? "rejected" : "stolen"}`);
    if (!rejected) throw new Error("healthy lease stolen");
    stage = "age-lease"; console.log("STALE_WORKER: age-lease-start"); await db.importJob.update({ where: { id: job.id }, data: { updatedAt: new Date(Date.now() - 6 * 60_000) } }); console.log("STALE_WORKER: age-lease-end");
    console.log("STALE_WORKER: stale-status-read=COMMITTING"); stage = "recovery-call"; console.log("STALE_WORKER: recovery-call-start");
    const recoveryStart = Date.now(); await commitImportJob({ jobId: job.id, schoolId, teacherId: teacher.id, classId: klass.id, term: "FIRST", session: "2099/2100" }); console.log(`STALE_WORKER: recovery-call-returned elapsed=${Date.now()-recoveryStart}ms`);
    stage = "post-recovery"; console.log("STALE_WORKER: post-recovery-job-read"); const final = await db.importJob.findUniqueOrThrow({ where: { id: job.id }, include: { stagingRows: true } }); console.log("STALE_WORKER: post-recovery-row-read"); console.log("STALE_WORKER: assertions-start");
    if (final.status !== "COMMITTED" || final.stagingRows.some((r) => r.status !== "COMMITTED") || final.newStudents !== 1 || final.newScores !== 1) throw new Error("recovery assertions failed"); console.log("STALE_WORKER: assertions-pass");
  } finally {
    stage = "cleanup"; console.log("STALE_WORKER: cleanup-start");
    if (schoolId) await db.syncLog.deleteMany({ where: { schoolId } }).catch(() => undefined); if (schoolId) await db.score.deleteMany({ where: { schoolId } }).catch(() => undefined); if (schoolId) await db.student.deleteMany({ where: { schoolId } }).catch(() => undefined); if (schoolId) await db.importJob.deleteMany({ where: { schoolId } }).catch(() => undefined); if (schoolId) await db.class.deleteMany({ where: { schoolId } }).catch(() => undefined); if (schoolId) await db.teacher.deleteMany({ where: { schoolId } }).catch(() => undefined); if (schoolId) await db.school.delete({ where: { id: schoolId } }).catch(() => undefined); await db.$disconnect(); clearTimeout(watchdog); console.log("STALE_WORKER: cleanup-end");
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
