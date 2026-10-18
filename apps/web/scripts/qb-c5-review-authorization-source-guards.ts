import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Source-level guard only. Integration tests must still exercise two teachers and two schools.
const source = readFileSync(join(process.cwd(), "lib/services/questions/review-workspace.ts"), "utf8");
assert.match(source, /function writeAccess\(actor: ReviewActor\): Prisma\.QuestionWhereInput \{ return \{ schoolId: actor\.schoolId, createdByTeacherId: actor\.teacherId \}; \}/);
const ownerLoader = source.match(/async function ownedQuestion\([\s\S]*?\n\}/)?.[0] ?? source.slice(source.indexOf("async function ownedQuestion"), source.indexOf("export async function editQuestionForReview"));
assert.match(ownerLoader, /\.\.\.writeAccess\(actor\)/);
const draftHandler = source.slice(source.indexOf("export async function returnQuestionToDraft"));
assert.match(draftHandler, /\.\.\.writeAccess\(actor\)/);
assert.doesNotMatch(ownerLoader, /\.\.\.access\(actor\)/);
assert.doesNotMatch(draftHandler, /\.\.\.access\(actor\)/);
console.log("Question review authorization source guards passed; DB integration tests still required.");
