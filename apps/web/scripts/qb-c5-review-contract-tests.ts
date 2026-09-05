import assert from "node:assert/strict";
import { validateCanonicalQuestionMetadata } from "../lib/questions/corpus-contract";

const rejectionReasons = ["incorrect answer", "poor wording", "duplicate", "wrong curriculum alignment", "inappropriate difficulty", "weak distractors", "poor solution", "unsuitable question"];
assert.equal(new Set(rejectionReasons).size, rejectionReasons.length);
assert.equal(rejectionReasons.includes("duplicate"), true);
assert.equal(rejectionReasons.includes("verified past question"), false);
assert.equal(validateCanonicalQuestionMetadata({ origin: "VERIFIED_PAST_QUESTION", provenance: { origin: "VERIFIED_PAST_QUESTION", verification: "UNVERIFIED" } }).valid, false);
assert.equal(validateCanonicalQuestionMetadata({ origin: "DETERMINISTIC_GENERATED", provenance: { origin: "DETERMINISTIC_GENERATED", verification: "NOT_REQUIRED" }, generationMethod: "DETERMINISTIC", reviewStatus: "DRAFT", subject: "Mathematics", classLevel: "SS1", topic: "Algebra", questionType: "CALCULATION", difficulty: "STANDARD", cognitiveSkills: ["APPLICATION"], assessmentProfiles: ["SCHOOL_STANDARD"], estimatedTimeSeconds: 60, marks: 1, calculatorPolicy: "NOT_APPLICABLE", curriculumNodeIds: ["node"], objectiveNodeIds: [], curriculumAlignments: [{ curriculumVersionId: "version", nodeId: "node", authority: "INTERNAL_UNVERIFIED" }], version: 1 }).valid, true);
console.log("QB-C5 review contract tests passed");
