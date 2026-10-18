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
const editHandler = source.slice(source.indexOf("export async function editQuestionForReview"), source.indexOf("export async function approveQuestionForReview"));
const approvalHandler = source.slice(source.indexOf("export async function approveQuestionForReview"), source.indexOf("export async function rejectQuestionForReview"));
assert.match(editHandler, /previousMetadata/);
assert.match(editHandler, /estimatedTimeSeconds: input\.estimatedTime/);
assert.match(editHandler, /version: \(previous\?\.version \?\? 0\) \+ 1/);
assert.match(approvalHandler, /if \(!latest\) throw new Error/);
assert.match(approvalHandler, /if \(!metadata\) throw new Error/);
assert.match(approvalHandler, /validateCanonicalQuestionMetadata\(metadata\)/);
assert.match(approvalHandler, /questionCorpusMetadata\.findUnique/);
assert.match(approvalHandler, /if \(!relationalMetadata\) throw new Error/);
assert.match(approvalHandler, /questionCorpusMetadata\.update\(/);
assert.doesNotMatch(approvalHandler, /questionCorpusMetadata\.updateMany\(/);
console.log("Question review authorization and metadata source guards passed; DB integration tests still required.");
