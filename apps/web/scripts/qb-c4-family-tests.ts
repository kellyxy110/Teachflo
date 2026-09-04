import assert from "node:assert/strict";
import { generateQuestionCandidate, getQuestionFamily, QUESTION_FAMILY_REGISTRY, validateQuestionCandidate, verifyQuestionAnswer } from "../lib/questions/family-engine";

const input = { seed: 17, curriculumNodeId: "node-ss1-math", curriculumVersionId: "version-ss1-math" } as const;
assert.equal(QUESTION_FAMILY_REGISTRY.length, 5);
assert.equal(new Set(QUESTION_FAMILY_REGISTRY.map((family) => family.key)).size, 5);
assert.equal(getQuestionFamily("missing-family"), undefined);

for (const family of QUESTION_FAMILY_REGISTRY) {
  const first = generateQuestionCandidate(family.key, input);
  const second = generateQuestionCandidate(family.key, input);
  assert.deepEqual(first, second, `${family.key} must be seed deterministic`);
  assert.equal(validateQuestionCandidate(first).valid, true);
  assert.deepEqual(verifyQuestionAnswer(first), { valid: true, expected: first.answer, actual: first.answer });
  assert.equal(first.metadata.origin, "DETERMINISTIC_GENERATED");
  assert.equal(first.metadata.provenance.verification, "NOT_REQUIRED");
  assert.equal(first.metadata.reviewStatus, "DRAFT");
}

const mcq = generateQuestionCandidate("ss1-mathematics-linear-equation-v1", { ...input, questionType: "MCQ" });
assert.equal(validateQuestionCandidate(mcq).valid, true);
assert.equal(mcq.options?.includes(mcq.answer), true);
assert.equal(verifyQuestionAnswer({ ...mcq, answer: "not-the-answer" }).valid, false);
assert.throws(() => generateQuestionCandidate("ss1-mathematics-algebra-simplification-v1", { ...input, questionType: "MCQ" }), /not supported/);
assert.equal(validateQuestionCandidate({ ...mcq, options: ["1", "1", "2"], correctOptionIndex: 0 }).valid, false);
assert.equal(validateQuestionCandidate({ ...mcq, metadata: { ...mcq.metadata, origin: "VERIFIED_PAST_QUESTION", provenance: { ...mcq.metadata.provenance, origin: "VERIFIED_PAST_QUESTION" } } }).valid, false);
console.log("QB-C4 family tests passed");
