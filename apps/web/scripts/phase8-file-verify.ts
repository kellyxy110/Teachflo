import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { readFileSync } from "node:fs";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { parseTabularMatrix } from "@/lib/services/import/assessment-components-shared";

type RawRow = Record<string, string>;

function requireDevelopmentDatabase() {
  if (process.env.NODE_ENV !== "test") throw new Error("File verification requires NODE_ENV=test");
  const line = readFileSync(new URL("../../../packages/database/.env", import.meta.url), "utf8")
    .split(/\r?\n/).find((value) => value.startsWith("DATABASE_URL="));
  if (!line && !process.env.DATABASE_URL) throw new Error("File verification guard: DATABASE_URL missing");
  const url = new URL(process.env.DATABASE_URL ?? line!.slice("DATABASE_URL=".length).replace(/^"|"$/g, ""));
  if (!url.username.includes("wxgnufdacfncwxbedzap") || url.pathname !== "/postgres") {
    throw new Error("File verification guard: refusing non-approved Development database");
  }
  process.env.DATABASE_URL = url.toString();
}

async function parseFixture(file: string): Promise<RawRow[]> {
  const extension = extname(file).toLowerCase();
  if (extension === ".csv") {
    const text = await readFile(file, "utf8");
    const parsed = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true });
    if (parsed.errors.length) throw new Error(`CSV parse failed: ${parsed.errors[0].message}`);
    return parsed.data;
  }
  if (extension === ".xlsx" || extension === ".xls") {
    const workbook = XLSX.read(await readFile(file), { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return parseTabularMatrix(XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" })).rows;
  }
  throw new Error(`Unsupported fixture type: ${extension}`);
}

function mapRow(raw: RawRow) {
  const parsed: RawRow = {};
  for (const [header, value] of Object.entries(raw)) {
    const key = header.trim().toLowerCase();
    if (key === "full name" || key === "name" || key === "student name") parsed.fullName = value;
    else if (key === "surname" || key === "last name") parsed.lastName = value;
    else if (key === "other names" || key === "first name" || key === "given name") parsed.firstName = value;
    else if (/reg|admission/.test(key)) parsed.regNumber = value;
    else if (key === "subject") parsed.subject = value;
    else if (key.startsWith("ca1") || key.startsWith("ca 1")) parsed.ca1 = value;
    else if (key.startsWith("ca2") || key.startsWith("ca 2")) parsed.ca2 = value;
    else if (key.startsWith("exam")) parsed.exam = value;
    else if (key === "total" || key === "aggregate") parsed.total = value;
    else if (key === "grade") parsed.grade = value;
  }
  return parsed;
}

async function main() {
  requireDevelopmentDatabase();
  const schoolCubeOnly = process.argv.includes("--schoolcube-only");
  const { db } = await import("@/lib/db");
  const { setAuthServiceForTests } = await import("@/lib/auth/service");
  const { setRateLimiterForTests } = await import("@/lib/rate-limit");
  const { POST: stage } = await import("@/app/api/student-hub/jobs/[jobId]/stage/route");
  const { POST: commit } = await import("@/app/api/student-hub/jobs/[jobId]/commit/route");

  const token = `FILE_SYNTH_${Date.now()}`;
  const fixtureDir = await mkdtemp(join(tmpdir(), "teachnexis-phase8-files-"));
  let schoolId: string | undefined;
  setAuthServiceForTests({
    getSession: async () => ({ userId: `${token}_teacher`, sessionId: null, sessionClaims: {} }),
    getCurrentUser: async () => null,
    setUserMetadata: async () => undefined,
  });
  setRateLimiterForTests(async () => ({ ok: true, remaining: 99 }));

  try {
    const school = await db.school.create({ data: { name: token, code: token, state: "Test" } });
    schoolId = school.id;
    const teacher = await db.teacher.create({ data: {
      schoolId, clerkId: `${token}_teacher`, firstName: "Synthetic", lastName: "Teacher",
      email: `${token}@invalid.test`, subjects: [], classLevels: [],
    } });
    const klass = await db.class.create({ data: { schoolId, name: `${token} JS1`, level: "JS1", session: "2099/2100" } });

    const stageJob = async (rows: RawRow[], source: "CSV" | "EXCEL", format: "SURNAME_FIRST" | "SURNAME_LAST", map: Record<string, string> = {}, confirmed = true) => {
      const job = await db.importJob.create({ data: { schoolId: school.id, teacherId: teacher.id, source, status: "PENDING", fileName: `${source.toLowerCase()}-fixture` } });
      const response = await stage(new Request("http://test.local/stage", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rows: rows.map((rawData, rowIndex) => ({ rowIndex, rawData, parsedData: mapRow(rawData) })),
          classId: klass.id, term: "FIRST", session: "2099/2100", fullNameFormat: format,
          fullNameFormatConfirmed: true, subjectCanonicalMap: map, subjectMappingsConfirmed: confirmed,
        }),
      }), { params: Promise.resolve({ jobId: job.id }) });
      return { job, response };
    };
    const commitJob = async (jobId: string) => commit(new Request("http://test.local/commit", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ classId: klass.id, term: "FIRST", session: "2099/2100", subject: "Mathematics" }),
    }), { params: Promise.resolve({ jobId }) });

    if (!schoolCubeOnly) {
    const headers = ["Full Name", "Reg No", "Subject", "CA1-test4", "Exam-exam", "Total", "-midTerm"];
    const csvRows = [
      ["OKAFOR Ada", `${token}-001`, "Maths", "10", "70", "80", ""],
      ["OKAFOR Ada", `${token}-001`, "Maths", "10", "70", "80", ""],
      ["IBRAHIM Musa", `${token}-002`, "Maths", "12", "63", "75", ""],
      ["CHUKWU", `${token}-003`, "Maths", "10", "60", "70", ""],
    ];
    const csvPath = join(fixtureDir, "controlled-register.csv");
    await writeFile(csvPath, Papa.unparse({ fields: headers, data: csvRows }), "utf8");
    const csv = await parseFixture(csvPath);
    console.log("FILE_HARNESS:csv-parsed");
    const csvRun = await stageJob(csv, "CSV", "SURNAME_FIRST", { maths: "Mathematics" });
    if (csvRun.response.status !== 200) throw new Error(`CSV staging failed: ${csvRun.response.status}`);
    console.log("FILE_HARNESS:csv-staged");
    const csvCommit = await commitJob(csvRun.job.id);
    if (csvCommit.status !== 200) throw new Error(`CSV commit failed: ${csvCommit.status}`);
    console.log("FILE_HARNESS:csv-committed");
    const csvStaging = await db.importStagingRow.findMany({ where: { jobId: csvRun.job.id }, orderBy: { rowIndex: "asc" } });
    const csvStudents = await db.student.findMany({ where: { schoolId, regNumber: { in: [`${token}-001`, `${token}-002`] } }, include: { scores: true } });
    if (csvStaging[3]?.status !== "SKIPPED" || csvStudents.length !== 2 || csvStudents.flatMap((student) => student.scores).length !== 2) {
      throw new Error("CSV name/duplicate-score assertions failed");
    }
    const ada = csvStudents.find((student) => student.regNumber === `${token}-001`)!;
    if (ada.firstName !== "Ada" || ada.lastName !== "OKAFOR" || ada.rawFullName !== "OKAFOR Ada") throw new Error("surname-first mapping was not preserved");
    const mathAlias = await db.subjectAlias.findUnique({ where: { schoolId_rawValue: { schoolId, rawValue: "maths" } } });
    if (mathAlias?.canonicalSubject !== "Mathematics") throw new Error("confirmed subject alias was not persisted");

    const xlsxPath = join(fixtureDir, "controlled-register.xlsx");
    const xlsxSheet = XLSX.utils.aoa_to_sheet([headers, ["Ada OKAFOR", `${token}-001`, "Mathematics", "15", "70", "85", ""]]);
    const xlsxBook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(xlsxBook, xlsxSheet, "Results");
    await writeFile(xlsxPath, XLSX.write(xlsxBook, { type: "buffer", bookType: "xlsx" }));
    console.log("FILE_HARNESS:xlsx-parsed");
    const xlsxRun = await stageJob(await parseFixture(xlsxPath), "EXCEL", "SURNAME_LAST");
    if (xlsxRun.response.status !== 200 || (await commitJob(xlsxRun.job.id)).status !== 200) throw new Error("XLSX stage/commit failed");
    console.log("FILE_HARNESS:xlsx-committed");
    const afterXlsx = await db.student.findUniqueOrThrow({ where: { id: ada.id }, include: { scores: true } });
    if (afterXlsx.rawFullName !== "OKAFOR Ada" || afterXlsx.scores.length !== 1 || afterXlsx.scores[0].total !== 85) throw new Error("rawFullName preserve-first or score upsert failed");

    const xlsPath = join(fixtureDir, "controlled-register.xls");
    const xlsSheet = XLSX.utils.aoa_to_sheet([headers, ["NWACHUKWU Ngozi", `${token}-004`, "Mathematics", "15", "60", "75", ""]]);
    const xlsBook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(xlsBook, xlsSheet, "Results");
    await writeFile(xlsPath, XLSX.write(xlsBook, { type: "buffer", bookType: "biff8" }));
    console.log("FILE_HARNESS:xls-parsed");
    const xlsRun = await stageJob(await parseFixture(xlsPath), "EXCEL", "SURNAME_FIRST");
    if (xlsRun.response.status !== 200 || (await commitJob(xlsRun.job.id)).status !== 200) throw new Error("XLS stage/commit failed");
    console.log("FILE_HARNESS:xls-committed");
    }

    const schoolCubeComponents = [
      { sourceColumn: "CA1", componentName: "CA1", normalizedName: "ca1", maxScore: 15, order: 0, createConfirmed: true },
      { sourceColumn: "CL.WK.1", componentName: "Classwork 1", normalizedName: "classwork 1", maxScore: 2.5, order: 1, createConfirmed: true },
      { sourceColumn: "CA2", componentName: "CA2", normalizedName: "ca2", maxScore: 10, order: 2, createConfirmed: true },
      { sourceColumn: "CL.WK.2", componentName: "Classwork 2", normalizedName: "classwork 2", maxScore: 2.5, order: 3, createConfirmed: true },
      { sourceColumn: "Notes", componentName: "Notes", normalizedName: "notes", maxScore: 5, order: 4, createConfirmed: true },
      { sourceColumn: "Hol.ASMT", componentName: "Holiday Assessment", normalizedName: "holiday assessment", maxScore: 5, order: 5, createConfirmed: true },
    ];
    const schoolCubePaths = [
      "C:\\Users\\user\\Downloads\\SchoolCube_SSS1A_Mathematics_Third_Term_2025-2026.csv",
      "C:\\Users\\user\\Downloads\\SchoolCube_SSS1A_Mathematics_Third_Term_2025-2026.xlsx",
    ];
    const expectedHeaders = ["#", "Student ID", "Student Name", "CA1", "CL.WK.1", "CA2", "CL.WK.2", "Notes", "Hol.ASMT", "Exam", "TAVG", "Grade"];
    let schoolCubeIds: string[] = [];
    for (const [fixtureIndex, schoolCubePath] of schoolCubePaths.entries()) {
      const schoolCubeRows = await parseFixture(schoolCubePath);
      if (schoolCubeRows.length !== 32 || expectedHeaders.some((header) => !(header in schoolCubeRows[0]))) {
        throw new Error(`SchoolCube-derived ${extname(schoolCubePath)} fixture shape mismatch`);
      }
      schoolCubeIds = schoolCubeRows.map((row) => row["Student ID"]);
      const discrepancyCount = schoolCubeRows.filter((row) => {
        const exam = Number(row.Exam);
        const visible = schoolCubeComponents.reduce((sum, component) => {
          const value = Number(row[component.sourceColumn]);
          return sum + (Number.isFinite(value) ? value : 0);
        }, Number.isFinite(exam) ? exam : 0);
        return Math.abs(visible - Number(row.TAVG)) > 0.000001;
      }).length;
      if (discrepancyCount !== 30) throw new Error("SchoolCube-derived supplied-total discrepancy signal changed unexpectedly");

      const schoolCubeJob = await db.importJob.create({
        data: { schoolId, teacherId: teacher.id, source: fixtureIndex === 0 ? "CSV" : "EXCEL", status: "PENDING", fileName: basename(schoolCubePath) },
      });
      const stageResponse = await stage(new Request("http://test.local/stage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rows: schoolCubeRows.map((rawData, rowIndex) => ({
            rowIndex,
            rawData,
            parsedData: {
              fullName: rawData["Student Name"],
              regNumber: rawData["Student ID"],
              exam: rawData.Exam,
              total: rawData.TAVG,
              grade: rawData.Grade,
            },
          })),
          classId: klass.id,
          term: "THIRD",
          session: "2025/2026",
          fullNameFormat: "SURNAME_FIRST",
          fullNameFormatConfirmed: true,
          assessmentComponentMappings: schoolCubeComponents,
          assessmentComponentsConfirmed: true,
        }),
      }), { params: Promise.resolve({ jobId: schoolCubeJob.id }) });
      if (stageResponse.status !== 200) throw new Error(`SchoolCube-derived ${extname(schoolCubePath)} staging failed`);
      const commitResponse = await commit(new Request("http://test.local/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ classId: klass.id, term: "THIRD", session: "2025/2026", subject: "Mathematics" }),
      }), { params: Promise.resolve({ jobId: schoolCubeJob.id }) });
      if (commitResponse.status !== 200) throw new Error(`SchoolCube-derived ${extname(schoolCubePath)} commit failed`);

      const importedStudents = await db.student.findMany({
        where: { schoolId, regNumber: { in: schoolCubeIds } },
        include: { scores: { where: { term: "THIRD", session: "2025/2026", subject: "Mathematics" }, include: { componentValues: true } } },
      });
      if (importedStudents.length !== 32 || importedStudents.some((student) => student.scores.length !== 1 || student.scores[0].componentValues.length !== 6)) {
        throw new Error(`SchoolCube-derived ${extname(schoolCubePath)} persistence count mismatch`);
      }
      for (const row of schoolCubeRows) {
        const student = importedStudents.find((candidate) => candidate.regNumber === row["Student ID"]);
        const suppliedTotal = Number(row.TAVG);
        if (
          !student ||
          student.rawFullName !== row["Student Name"] ||
          (Number.isFinite(suppliedTotal) && student.scores[0].total !== suppliedTotal)
        ) {
          throw new Error(`SchoolCube-derived ${extname(schoolCubePath)} name or supplied-total mismatch`);
        }
      }
      console.log(`SCHOOLCUBE_PDF_DERIVED_${fixtureIndex === 0 ? "CSV" : "XLSX"}:PASS`);
    }
    if (
      await db.student.count({ where: { schoolId, regNumber: { in: schoolCubeIds } } }) !== 32 ||
      await db.score.count({ where: { schoolId, student: { regNumber: { in: schoolCubeIds } }, term: "THIRD", session: "2025/2026" } }) !== 32 ||
      await db.scoreAssessmentComponentValue.count({ where: { score: { schoolId, student: { regNumber: { in: schoolCubeIds } }, term: "THIRD", session: "2025/2026" } } }) !== 192
    ) throw new Error("SchoolCube-derived CSV/XLSX retry duplicate safety failed");
    console.log("SCHOOLCUBE_COMPONENT_DISCREPANCIES:30_CONFIRMED_WITH_EXAM");
    console.log("SCHOOLCUBE_DUPLICATE_SAFETY:PASS");

    if (!schoolCubeOnly) {
    const unknownJob = await db.importJob.create({ data: { schoolId, teacherId: teacher.id, source: "CSV", status: "PENDING" } });
    const unknownRaw = { "Full Name": "Test User", "Reg No": `${token}-unknown`, Subject: "History-Advanced", Total: "60" };
    const unconfirmed = await stage(new Request("http://test.local/stage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rows: [{ rowIndex: 0, rawData: unknownRaw, parsedData: mapRow(unknownRaw) }], classId: klass.id, term: "FIRST", session: "2099/2100", fullNameFormat: "SURNAME_LAST", fullNameFormatConfirmed: true, subjectCanonicalMap: { "history-advanced": "History" }, subjectMappingsConfirmed: false }) }), { params: Promise.resolve({ jobId: unknownJob.id }) });
    if (unconfirmed.status !== 400 || await db.subjectAlias.findUnique({ where: { schoolId_rawValue: { schoolId, rawValue: "history-advanced" } } })) throw new Error("unconfirmed subject mapping was accepted or learned");
    console.log("FILE_HARNESS:unconfirmed-subject-rejected");
    const confirmed = await stageJob([unknownRaw], "CSV", "SURNAME_LAST", { "history-advanced": "History" });
    if (confirmed.response.status !== 200) throw new Error("confirmed subject mapping was rejected");

    await db.student.createMany({ data: [
      { schoolId, classId: klass.id, firstName: "Chi", lastName: "OKORO" },
      { schoolId, classId: klass.id, firstName: "Chi", lastName: "OKORO" },
    ] });
    const ambiguous = await stageJob([{ "Full Name": "OKORO Chi", "Reg No": "", Subject: "Mathematics", Total: "60" }], "CSV", "SURNAME_FIRST");
    if (ambiguous.response.status !== 200 || (await db.importStagingRow.findFirstOrThrow({ where: { jobId: ambiguous.job.id } })).action !== "CONFLICT") throw new Error("ambiguous name was not surfaced as a conflict");

    const invalidJob = await db.importJob.create({ data: { schoolId, teacherId: teacher.id, source: "CSV", status: "PENDING" } });
    const invalidRaw = { "Full Name": "Bad Score", "Reg No": `${token}-bad`, Subject: "Mathematics", Total: "101" };
    const invalid = await stage(new Request("http://test.local/stage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rows: [{ rowIndex: 0, rawData: invalidRaw, parsedData: mapRow(invalidRaw) }], classId: klass.id, term: "FIRST", session: "2099/2100", fullNameFormat: "SURNAME_LAST", fullNameFormatConfirmed: true }) }), { params: Promise.resolve({ jobId: invalidJob.id }) });
    if (invalid.status !== 400) throw new Error("invalid score was accepted");
    console.log("FILE_HARNESS:invalid-score-rejected");
    }

    console.log("FILE_HARNESS:PASS");
    if (!schoolCubeOnly) console.log("FILE_HARNESS:fixtures=controlled-register.csv,controlled-register.xlsx,controlled-register.xls");
  } finally {
    if (schoolId) await db.subjectAlias.deleteMany({ where: { schoolId } }).catch(() => undefined);
    if (schoolId) await db.syncLog.deleteMany({ where: { schoolId } }).catch(() => undefined);
    if (schoolId) await db.scoreAssessmentComponentValue.deleteMany({ where: { score: { schoolId } } }).catch(() => undefined);
    if (schoolId) await db.score.deleteMany({ where: { schoolId } }).catch(() => undefined);
    if (schoolId) await db.assessmentComponent.deleteMany({ where: { schoolId } }).catch(() => undefined);
    if (schoolId) await db.studentProfile.deleteMany({ where: { schoolId } }).catch(() => undefined);
    if (schoolId) await db.student.deleteMany({ where: { schoolId } }).catch(() => undefined);
    if (schoolId) await db.importJob.deleteMany({ where: { schoolId } }).catch(() => undefined);
    if (schoolId) await db.class.deleteMany({ where: { schoolId } }).catch(() => undefined);
    if (schoolId) await db.teacher.deleteMany({ where: { schoolId } }).catch(() => undefined);
    if (schoolId) await db.school.deleteMany({ where: { id: schoolId } }).catch(() => undefined);
    setRateLimiterForTests(null); setAuthServiceForTests(null);
    await db.$disconnect();
    await rm(fixtureDir, { recursive: true, force: true });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => { console.error(error); process.exit(1); });
