import { readFileSync } from "node:fs";

async function main() {

const line = readFileSync(new URL("../../../packages/database/.env", import.meta.url), "utf8").split(/\r?\n/).find((v) => v.startsWith("DATABASE_URL="));
if (!line && !process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
const url = new URL(process.env.DATABASE_URL ?? line!.slice(13).replace(/^"|"$/g, ""));
if (!url.username.includes("wxgnufdacfncwxbedzap")) throw new Error("Refusing non-Development database");
process.env.DATABASE_URL = url.toString();

const { db } = await import("@/lib/db");
const { commitImportJob } = await import("@/lib/services/import/commit");
const token = `COMMIT_SYNTH_${Date.now()}`;
let schoolId: string | undefined;

try {
  const school = await db.school.create({ data: { name: token, code: token, state: "Test" } }); schoolId = school.id;
  const teacher = await db.teacher.create({ data: { schoolId, clerkId: `${token}_t`, firstName: "Synthetic", lastName: "Teacher", email: `${token}@invalid.test`, subjects: [], classLevels: [] } });
  const klass = await db.class.create({ data: { schoolId, name: token, level: "JS1", session: "2099/2100" } });
  const existing = await db.student.create({ data: { schoolId, classId: klass.id, firstName: "Done", lastName: "Student", regNumber: `${token}-done` } });
  const job = await db.importJob.create({ data: { schoolId, teacherId: teacher.id, source: "CSV", status: "STAGED" } });
  await db.importStagingRow.createMany({ data: [
    { jobId: job.id, rowIndex: 0, rawData: {}, parsedData: { firstName: "Done", lastName: "Student" }, action: "CREATE", status: "COMMITTED", studentId: existing.id },
    { jobId: job.id, rowIndex: 1, rawData: {}, parsedData: { firstName: "Ada", lastName: "Okafor", rawFullName: "OKAFOR Ada", regNumber: `${token}-retry`, subject: "Mathematics", ca1Parsed: 10 }, action: "CREATE", status: "PENDING", error: "previous failure" },
    { jobId: job.id, rowIndex: 2, rawData: {}, parsedData: { firstName: "Musa", lastName: "Ibrahim", regNumber: `${token}-pending`, subject: "Mathematics", ca1Parsed: 12 }, action: "CREATE", status: "PENDING" },
  ] });
  await commitImportJob({ jobId: job.id, schoolId, teacherId: teacher.id, classId: klass.id, term: "FIRST", session: "2099/2100" });
  const rows = await db.importStagingRow.findMany({ where: { jobId: job.id }, orderBy: { rowIndex: "asc" } });
  const scores = await db.score.count({ where: { schoolId } });
  if (rows.map((r) => r.status).join(",") !== "COMMITTED,COMMITTED,COMMITTED" || scores !== 2) throw new Error("mixed-job retry assertion failed");
  const again = await commitImportJob({ jobId: job.id, schoolId, teacherId: teacher.id, classId: klass.id, term: "FIRST", session: "2099/2100" }).catch(() => null);
  if (again !== null || (await db.score.count({ where: { schoolId } })) !== 2) throw new Error("completed retry was not idempotent");
  const linked = await db.importJob.create({ data: { schoolId, teacherId: teacher.id, source: "CSV", status: "STAGED" } });
  const owner = await db.importStagingRow.create({ data: { jobId: linked.id, rowIndex: 0, rawData: {}, parsedData: { lastName: "Broken", regNumber: `${token}-owner` }, action: "CREATE", status: "PENDING" } });
  await db.importStagingRow.create({ data: { jobId: linked.id, rowIndex: 1, rawData: {}, parsedData: { linkedRowIndex: 0, subject: "Mathematics", ca1Parsed: 8 }, action: "UPDATE", status: "PENDING" } });
  await commitImportJob({ jobId: linked.id, schoolId, teacherId: teacher.id, classId: klass.id, term: "FIRST", session: "2099/2100" });
  const failed = await db.importStagingRow.findMany({ where: { jobId: linked.id }, orderBy: { rowIndex: "asc" } });
  if (failed[0].studentId || failed[1].studentId || failed.some((r) => r.status === "COMMITTED")) throw new Error("owner rollback leaked to sibling");
  await db.importStagingRow.update({ where: { id: owner.id }, data: { parsedData: { firstName: "Owner", lastName: "Recovered", regNumber: `${token}-owner`, subject: "Mathematics", ca1Parsed: 9 } } });
  await commitImportJob({ jobId: linked.id, schoolId, teacherId: teacher.id, classId: klass.id, term: "FIRST", session: "2099/2100" });
  const recovered = await db.importStagingRow.findMany({ where: { jobId: linked.id }, orderBy: { rowIndex: "asc" } });
  if (recovered.some((r) => r.status !== "COMMITTED") || recovered[0].studentId !== recovered[1].studentId) throw new Error("owner/sibling retry did not converge");
  console.log("OWNER_SIBLING:PASS");
  const stranded = await db.importJob.create({ data: { schoolId, teacherId: teacher.id, source: "CSV", status: "COMMITTING" } });
  await db.importStagingRow.create({ data: { jobId: stranded.id, rowIndex: 0, rawData: {}, parsedData: { firstName: "Lease", lastName: "Recovered", regNumber: `${token}-lease`, subject: "Mathematics", ca1Parsed: 7 }, action: "CREATE", status: "PENDING" } });
  const healthy = await commitImportJob({ jobId: stranded.id, schoolId, teacherId: teacher.id, classId: klass.id, term: "FIRST", session: "2099/2100" }).then(() => false).catch(() => true);
  if (!healthy) throw new Error("healthy COMMITTING lease was stolen");
  await db.importJob.update({ where: { id: stranded.id }, data: { updatedAt: new Date(Date.now() - 6 * 60_000) } });
  await commitImportJob({ jobId: stranded.id, schoolId, teacherId: teacher.id, classId: klass.id, term: "FIRST", session: "2099/2100" });
  const resumed = await db.importJob.findUniqueOrThrow({ where: { id: stranded.id }, include: { stagingRows: true } });
  if (resumed.status !== "COMMITTED" || resumed.stagingRows.some((r) => r.status !== "COMMITTED") || resumed.newStudents !== 1 || resumed.newScores !== 1) throw new Error("stale worker did not recover correctly");
  console.log("STALE_WORKER_RECOVERY:PASS");
  console.log("COMMIT_HARNESS:PASS");
} finally {
  if (schoolId) await db.syncLog.deleteMany({ where: { schoolId } }).catch(() => undefined);
  if (schoolId) await db.score.deleteMany({ where: { schoolId } }).catch(() => undefined);
  if (schoolId) await db.student.deleteMany({ where: { schoolId } }).catch(() => undefined);
  if (schoolId) await db.importJob.deleteMany({ where: { schoolId } }).catch(() => undefined);
  if (schoolId) await db.class.deleteMany({ where: { schoolId } }).catch(() => undefined);
  if (schoolId) await db.teacher.deleteMany({ where: { schoolId } }).catch(() => undefined);
  if (schoolId) await db.school.delete({ where: { id: schoolId } }).catch(() => undefined);
  await db.$disconnect();
}
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
