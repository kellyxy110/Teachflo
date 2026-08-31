import assert from "node:assert/strict";
import { mergeStage4Substages, validateStage4A, validateStage4B, validateStageOutput } from "../lib/lessons/v2-validation";

const context = { metadata: {} as never, provenance: {} as never };
const a = { ...context, stage: "4A" as const, applications: "Apply the concept.", examinationGuidance: "Read each question carefully." };
const b = { ...context, stage: "4B" as const, examinationItems: [{ sourceStatus: "GENERATED_EXAM_STYLE" as const, examStyle: "WAEC" as const, question: "Solve 2 + 2.", answer: "4" }] };
assert.equal(validateStage4A(a).status, "PASS");
assert.equal(validateStage4B(b).status, "PASS");
assert.equal(validateStage4A({ applications: "ok" }).status, "BLOCKED");
assert.equal(validateStage4B({ examinationItems: "not-an-array" }).status, "BLOCKED");
const merged = mergeStage4Substages(a, b);
assert.equal(merged.examinationItems.length, 1);
assert.equal(validateStageOutput(4, merged).status, "PASS");
assert.equal(validateStage4B({ examinationItems: [{ sourceStatus: "VERIFIED_RETRIEVED_SOURCE", question: "q", answer: "a" }] }).status, "BLOCKED");
console.log("v2 stage 4 deterministic tests passed");
