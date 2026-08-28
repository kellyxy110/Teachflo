import { readFileSync } from "node:fs";

async function main() {
const envLine = readFileSync(new URL("../../../packages/database/.env", import.meta.url), "utf8")
  .split(/\r?\n/)
  .find((line) => line.startsWith("DATABASE_URL="));
if (!envLine && !process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
const databaseUrl = new URL(
  process.env.DATABASE_URL ?? envLine!.slice("DATABASE_URL=".length).replace(/^"|"$/g, "")
);
if (
  process.env.NODE_ENV !== "test" ||
  !databaseUrl.username.includes("wxgnufdacfncwxbedzap") ||
  databaseUrl.username.includes("cnodlvmgdueykdriiati") ||
  databaseUrl.pathname !== "/postgres"
) {
  throw new Error("Refusing assessment verification outside approved Development database test mode");
}
process.env.DATABASE_URL = databaseUrl.toString();

const { db } = await import("@/lib/db");
const { stageImportJob } = await import("@/lib/services/import/stage");
const { commitImportJob } = await import("@/lib/services/import/commit");
const { stageRequestSchema } = await import("@/lib/services/import/validation");

const token = `ASSESSMENT_SYNTH_${Date.now()}`;
const schoolIds: string[] = [];

async function createScope(suffix: string) {
  const school = await db.school.create({ data: { name: `${token}_${suffix}`, code: `${token}_${suffix}`, state: "Synthetic" } });
  schoolIds.push(school.id);
  const teacher = await db.teacher.create({
    data: {
      schoolId: school.id,
      clerkId: `${token}_${suffix}_teacher`,
      firstName: "Synthetic",
      lastName: "Teacher",
      email: `${token}_${suffix}@invalid.test`,
      subjects: [],
      classLevels: [],
    },
  });
  const klass = await db.class.create({ data: { schoolId: school.id, name: `${token}_${suffix}`, level: "SS1", session: "2099/2100" } });
  return { school, teacher, klass };
}

async function createJob(schoolId: string, teacherId: string) {
  return db.importJob.create({ data: { schoolId, teacherId, source: "CSV", status: "PENDING" } });
}

const mappings = [
  { sourceColumn: "CA1", componentName: "CA1", normalizedName: "ca1", maxScore: 15, order: 0, createConfirmed: true },
  { sourceColumn: "CL.WK.1", componentName: "Classwork 1", normalizedName: "classwork 1", maxScore: 2.5, order: 1, createConfirmed: true },
];

try {
  const physicalIndexes = await db.$queryRawUnsafe<Array<{ indexname: string; indexdef: string }>>(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('assessment_components', 'score_assessment_component_values')
  `);
  const indexNames = new Set(physicalIndexes.map((index) => index.indexname));
  for (const requiredIndex of [
    "assessment_components_schoolId_normalizedName_key",
    "assessment_components_schoolId_order_idx",
    "score_assessment_component_values_assessmentComponentId_idx",
  ]) {
    if (!indexNames.has(requiredIndex)) throw new Error(`missing assessment index: ${requiredIndex}`);
  }
  if (!physicalIndexes.some((index) =>
    index.indexdef.includes("UNIQUE") &&
    index.indexdef.includes("(\"scoreId\", \"assessmentComponentId\")")
  )) throw new Error("missing component-value score/component uniqueness");

  const contractPayload = {
    rows: [{ rowIndex: 0, rawData: { CA1: "12" }, parsedData: { firstName: "Ada", lastName: "Okafor" } }],
    classId: "synthetic-class",
    term: "THIRD",
    session: "2099/2100",
    assessmentComponentMappings: mappings,
    assessmentComponentsConfirmed: true,
  };
  if (!stageRequestSchema.safeParse(contractPayload).success) throw new Error("valid component mapping contract was rejected");
  if (stageRequestSchema.safeParse({
    ...contractPayload,
    assessmentComponentMappings: [{ ...mappings[0], existingComponentId: "cmt8fakeexistingcomponent", createConfirmed: true }],
  }).success) throw new Error("ambiguous component mapping contract was accepted");

  const a = await createScope("A");
  const job = await createJob(a.school.id, a.teacher.id);
  await stageImportJob(
    job.id,
    a.school.id,
    [{ rowIndex: 0, rawData: { CA1: "12", "CL.WK.1": "2" }, parsedData: { firstName: "Ada", lastName: "Okafor", regNumber: `${token}_A`, subject: "Mathematics", total: "81", grade: "A" } }],
    { classId: a.klass.id, term: "THIRD", session: "2099/2100", assessmentComponentMappings: mappings }
  );

  const staged = await db.importStagingRow.findFirstOrThrow({ where: { jobId: job.id } });
  const stagedData = staged.parsedData as { assessmentComponents?: unknown[]; totalParsed?: number };
  if (stagedData.assessmentComponents?.length !== 2 || stagedData.totalParsed !== 81) throw new Error("component staging assertion failed");

  await commitImportJob({ jobId: job.id, schoolId: a.school.id, teacherId: a.teacher.id, classId: a.klass.id, subject: "Mathematics", term: "THIRD", session: "2099/2100" });
  const score = await db.score.findFirstOrThrow({ where: { schoolId: a.school.id }, include: { componentValues: { include: { assessmentComponent: true } } } });
  if (score.total !== 81 || score.componentValues.length !== 2) throw new Error("component persistence or supplied total assertion failed");
  if (new Set(score.componentValues.map((value) => value.assessmentComponent.normalizedName)).size !== 2) throw new Error("component identities collapsed");

  await commitImportJob({ jobId: job.id, schoolId: a.school.id, teacherId: a.teacher.id, classId: a.klass.id, subject: "Mathematics", term: "THIRD", session: "2099/2100" }).catch(() => undefined);
  if ((await db.scoreAssessmentComponentValue.count({ where: { scoreId: score.id } })) !== 2) throw new Error("component retry created duplicates");

  const b = await createScope("B");
  const jobB = await createJob(b.school.id, b.teacher.id);
  await stageImportJob(
    jobB.id,
    b.school.id,
    [{ rowIndex: 0, rawData: { CA1: "11" }, parsedData: { firstName: "Bola", lastName: "Ade", regNumber: `${token}_B`, subject: "Mathematics", total: "70" } }],
    { classId: b.klass.id, term: "THIRD", session: "2099/2100", assessmentComponentMappings: [mappings[0]] }
  );
  await commitImportJob({ jobId: jobB.id, schoolId: b.school.id, teacherId: b.teacher.id, classId: b.klass.id, subject: "Mathematics", term: "THIRD", session: "2099/2100" });
  const ca1Components = await db.assessmentComponent.findMany({ where: { normalizedName: "ca1", schoolId: { in: [a.school.id, b.school.id] } } });
  if (ca1Components.length !== 2 || new Set(ca1Components.map((component) => component.schoolId)).size !== 2) throw new Error("school component isolation failed");

  const beforeRollback = {
    students: await db.student.count({ where: { schoolId: a.school.id } }),
    profiles: await db.studentProfile.count({ where: { schoolId: a.school.id } }),
    scores: await db.score.count({ where: { schoolId: a.school.id } }),
    values: await db.scoreAssessmentComponentValue.count({ where: { score: { schoolId: a.school.id } } }),
  };
  const rollbackJob = await createJob(a.school.id, a.teacher.id);
  await stageImportJob(
    rollbackJob.id,
    a.school.id,
    [{ rowIndex: 0, rawData: { CA1: "10" }, parsedData: { firstName: "Rollback", lastName: "Student", regNumber: `${token}_ROLLBACK`, parentName: "Synthetic Parent", subject: "Mathematics", total: "65" } }],
    {
      classId: a.klass.id,
      term: "THIRD",
      session: "2099/2100",
      assessmentComponentMappings: [{ ...mappings[0], existingComponentId: ca1Components.find((component) => component.schoolId === b.school.id)!.id, createConfirmed: false }],
    }
  );
  await commitImportJob({ jobId: rollbackJob.id, schoolId: a.school.id, teacherId: a.teacher.id, classId: a.klass.id, subject: "Mathematics", term: "THIRD", session: "2099/2100" });
  const rollbackRow = await db.importStagingRow.findFirstOrThrow({ where: { jobId: rollbackJob.id } });
  const rollbackStudent = await db.student.findFirst({ where: { schoolId: a.school.id, regNumber: `${token}_ROLLBACK` } });
  const afterRollback = {
    students: await db.student.count({ where: { schoolId: a.school.id } }),
    profiles: await db.studentProfile.count({ where: { schoolId: a.school.id } }),
    scores: await db.score.count({ where: { schoolId: a.school.id } }),
    values: await db.scoreAssessmentComponentValue.count({ where: { score: { schoolId: a.school.id } } }),
  };
  if (
    rollbackRow.status === "COMMITTED" ||
    rollbackStudent ||
    JSON.stringify(afterRollback) !== JSON.stringify(beforeRollback)
  ) throw new Error("component failure did not roll back the complete row");

  console.log("COMPONENT_MAPPING_PAYLOAD:PASS");
  console.log("COMPONENT_STAGING:PASS");
  console.log("COMPONENT_PERSISTENCE:PASS");
  console.log("COMPONENT_ROLLBACK:PASS");
  console.log("COMPONENT_RETRY_IDEMPOTENCY:PASS");
  console.log("COMPONENT_SCHOOL_ISOLATION:PASS");
  console.log("SUPPLIED_TOTAL_PRESERVED:PASS");
} finally {
  for (const schoolId of schoolIds) {
    await db.syncLog.deleteMany({ where: { schoolId } }).catch(() => undefined);
    await db.scoreAssessmentComponentValue.deleteMany({ where: { score: { schoolId } } }).catch(() => undefined);
    await db.score.deleteMany({ where: { schoolId } }).catch(() => undefined);
    await db.assessmentComponent.deleteMany({ where: { schoolId } }).catch(() => undefined);
    await db.studentProfile.deleteMany({ where: { schoolId } }).catch(() => undefined);
    await db.student.deleteMany({ where: { schoolId } }).catch(() => undefined);
    await db.importJob.deleteMany({ where: { schoolId } }).catch(() => undefined);
    await db.class.deleteMany({ where: { schoolId } }).catch(() => undefined);
    await db.teacher.deleteMany({ where: { schoolId } }).catch(() => undefined);
    await db.school.delete({ where: { id: schoolId } }).catch(() => undefined);
  }
  await db.$disconnect();
}
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Assessment component verification failed");
  process.exitCode = 1;
});
