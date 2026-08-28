import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboard = readFileSync(new URL("../app/(dashboard)/dashboard/page.tsx", import.meta.url), "utf8");

for (const section of ["Attention needed", "Today", "Continue working", "Upcoming", "Quick create", "Teaching pulse"]) {
  assert.equal(dashboard.includes(section), true, `missing dashboard section: ${section}`);
}

for (const unsupported of ["At-Risk Students", "School Average", "ProfileCompletionCard", "WorkflowSetupCard"]) {
  assert.equal(dashboard.includes(unsupported), false, `unsupported dashboard signal remains: ${unsupported}`);
}

assert.equal(dashboard.includes('listGradingQueue({ id: teacher.id, schoolId: teacher.schoolId })'), true);
assert.equal(dashboard.includes('db.homework.findMany({ where: { teacherId: teacher.id'), true);
assert.equal(dashboard.includes('db.exam.findMany({ where: { teacherId: teacher.id'), true);
assert.equal(dashboard.includes('db.lesson.findMany({ where: { teacherId: teacher.id'), true);
assert.equal(dashboard.includes('db.importJob.findMany({ where: { teacherId: teacher.id, schoolId: teacher.schoolId }'), true);
assert.equal(dashboard.includes("No timetable, mastery, risk, or performance estimate is inferred."), true);

console.log("TX-3 dashboard evidence contract: PASS");
