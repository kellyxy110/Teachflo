import { readFileSync } from "node:fs";

async function main() {
if (process.env.NODE_ENV !== "test") throw new Error("Route harness requires NODE_ENV=test");
const line = readFileSync(new URL("../../../packages/database/.env", import.meta.url), "utf8")
  .split(/\r?\n/).find((v) => v.startsWith("DATABASE_URL="));
if (!line) throw new Error("Route harness guard: DATABASE_URL missing");
const url = new URL(line.slice("DATABASE_URL=".length).replace(/^"|"$/g, ""));
if (!url.username.includes("wxgnufdacfncwxbedzap") || url.pathname !== "/postgres") {
  throw new Error("Route harness guard: refusing non-approved Development database");
}
process.env.DATABASE_URL = url.toString();

const { db } = await import("@/lib/db");
const { setAuthServiceForTests } = await import("@/lib/auth/service");
const { setRateLimiterForTests } = await import("@/lib/rate-limit");
const { POST } = await import("@/app/api/student-hub/integration-request/route");
const { POST: importExecute } = await import("@/app/api/import/execute/route");

const token = `ROUTE_SYNTH_${Date.now()}`;
let schoolId: string | undefined;
let teacherId: string | undefined;
let teacherBId: string | undefined;
let authUser: string | null = null;
let calls = 0;
setAuthServiceForTests({
  getSession: async () => ({ userId: authUser, sessionId: null, sessionClaims: {} }),
  getCurrentUser: async () => null,
  setUserMetadata: async () => undefined,
});
setRateLimiterForTests(async () => ({ ok: ++calls <= 3, remaining: Math.max(0, 3 - calls) }));

try {
  const school = await db.school.create({ data: { name: token, code: token, state: "Test" } });
  schoolId = school.id;
  const teacher = await db.teacher.create({ data: { schoolId, clerkId: `${token}_teacher`, firstName: "Synthetic", lastName: "Teacher", email: `${token}@invalid.test`, subjects: [], classLevels: [] } });
  teacherId = teacher.id;
  const teacherB = await db.teacher.create({ data: { schoolId, clerkId: `${token}_teacher_b`, firstName: "Other", lastName: "Teacher", email: `${token}-b@invalid.test`, subjects: [], classLevels: [] } });
  teacherBId = teacherB.id;
  const klass = await db.class.create({ data: { schoolId, name: `${token} JS1`, level: "JS1", session: "2099/2100" } });
  const post = (body: unknown) => POST(new Request("http://test.local/api/student-hub/integration-request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  const unauth = await post({ schoolName: "Test School", portalUrl: "https://example.invalid", adminContact: "Admin" });
  if (unauth.status !== 401) throw new Error("unauthenticated request was not rejected");
  authUser = teacher.clerkId;
  const invalid = await post({ schoolName: "x", portalUrl: "not-url", adminContact: "x" });
  if (invalid.status !== 400) throw new Error("invalid payload was not rejected");
  const override = await post({ schoolName: "Synthetic School", portalUrl: "https://example.invalid", adminContact: "Synthetic Admin", schoolId: "attacker", teacherId: "attacker" });
  if (override.status !== 400) throw new Error("client scope fields were not rejected");
  const ok = await post({ schoolName: "Synthetic School", portalUrl: "https://example.invalid", adminContact: "Synthetic Admin" });
  if (ok.status !== 200) throw new Error(`authenticated request was not accepted: ${ok.status} ${await ok.text()}`);
  const saved = await db.integrationRequest.findFirstOrThrow({ where: { schoolId, teacherId: teacher.id } });
  if (saved.schoolId !== schoolId || saved.teacherId !== teacher.id) throw new Error("server scope was overridden");
  const limited = await post({ schoolName: "Synthetic School", portalUrl: "https://example.invalid", adminContact: "Synthetic Admin" });
  if (limited.status !== 429) throw new Error("deterministic rate limit was not enforced");

  // Legacy import attribution: payload teacherId has no server authority.
  calls = 0;
  setRateLimiterForTests(async () => ({ ok: true, remaining: 99 }));
  authUser = null;
  const importBody = { rows: [{ firstName: "Import", lastName: "Student", regNumber: `${token}-student`, ca1: "10" }], classId: klass.id, subject: "Mathematics", term: "FIRST", session: "2099/2100", schoolId, teacherId: teacherB.id };
  const importRequest = (body: unknown) => importExecute(new Request("http://test.local/api/import/execute", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  const importUnauth = await importRequest(importBody);
  if (importUnauth.status !== 401) throw new Error("unauthenticated import was not rejected");
  authUser = teacher.clerkId;
  const manipulated = await importRequest(importBody);
  if (manipulated.status !== 400) throw new Error("legacy client teacherId was not rejected");
  const { teacherId: _ignored, ...trustedImportBody } = importBody;
  const importResponse = await importRequest(trustedImportBody);
  if (importResponse.status !== 200) throw new Error(`authenticated import failed: ${importResponse.status} ${await importResponse.text()}`);
  const score = await db.score.findFirstOrThrow({ where: { schoolId, subject: "Mathematics", session: "2099/2100" } });
  if (score.teacherId !== teacher.id || score.teacherId === teacherB.id) throw new Error("client teacher identity controlled score attribution");
  console.log("ROUTE_HARNESS:PASS");
} finally {
  if (schoolId) await db.integrationRequest.deleteMany({ where: { schoolId } }).catch(() => undefined);
  if (schoolId) await db.score.deleteMany({ where: { schoolId } }).catch(() => undefined);
  if (schoolId) await db.student.deleteMany({ where: { schoolId } }).catch(() => undefined);
  if (schoolId) await db.class.deleteMany({ where: { schoolId } }).catch(() => undefined);
  if (teacherId) await db.teacher.delete({ where: { id: teacherId } }).catch(() => undefined);
  if (teacherBId) await db.teacher.delete({ where: { id: teacherBId } }).catch(() => undefined);
  if (schoolId) await db.school.delete({ where: { id: schoolId } }).catch(() => undefined);
  setRateLimiterForTests(null);
  setAuthServiceForTests(null);
  await db.$disconnect();
}

}

main().catch((error) => { console.error(error); process.exitCode = 1; });
