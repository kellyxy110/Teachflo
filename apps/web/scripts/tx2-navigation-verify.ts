import assert from "node:assert/strict";
import {
  teacherMobilePrimaryItems,
  teacherNavGroups,
  teacherRouteMap,
  teacherRouteTitle,
  visibleTeacherNavGroups,
} from "../lib/navigation/teacher";

const expectedGroups = ["Today", "Teaching", "Students & records", "Assessment", "Content", "Tools"];
assert.deepEqual(teacherNavGroups.map((group) => group.label), expectedGroups);

assert.deepEqual(
  teacherMobilePrimaryItems.map((navItem) => navItem.shortLabel ?? navItem.label),
  ["Today", "Classes", "Students", "Assessments"],
);

const primaryPaths = new Set(teacherNavGroups.flatMap((group) => group.items.map((navItem) => navItem.href)));
for (const hiddenPath of ["/question-bank/import", "/exams/import", "/student-hub/import", "/beta"]) {
  assert.equal(primaryPaths.has(hiddenPath), false, `${hiddenPath} must remain contextual`);
  assert.equal(
    teacherRouteMap.find((route) => route.href === hiddenPath)?.status,
    "HIDDEN_FROM_PRIMARY_NAV",
  );
}

assert.equal(teacherRouteMap.find((route) => route.href === "/import")?.status, "LEGACY_ALIAS");
assert.equal(teacherRouteTitle("/question-bank/import"), "Import Questions");
assert.equal(teacherRouteTitle("/exams/import"), "Legacy Exam Import");
assert.equal(teacherRouteTitle("/grading/attempt-1"), "Grading");
assert.equal(teacherRouteTitle("/curriculum/version-1"), "Curriculum");

const teacherTools = visibleTeacherNavGroups("teacher").find((group) => group.id === "tools");
assert.equal(teacherTools?.items.some((navItem) => navItem.href === "/analytics"), true);
const studentTools = visibleTeacherNavGroups("student").find((group) => group.id === "tools");
assert.equal(studentTools?.items.some((navItem) => navItem.href === "/analytics"), false);

console.log("TX-2 navigation contract: PASS");
