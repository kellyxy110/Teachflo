import assert from "node:assert/strict";
import { detectLessonContent } from "../lib/lessons/v2-contract";
import { createShadowMockTransport } from "../lib/lessons/v2-shadow-mock";
import { runLessonV2Shadow } from "../lib/lessons/v2-shadow";
import { mergeStage5Substages, validateLessonContract, validateStage5A, validateStage5B, validateStage5Generated } from "../lib/lessons/v2-validation";

const metadata = { subject: "Mathematics", classLevel: "SS1", topic: "Quadratic Equations", term: "FIRST", week: 3, periods: 1, durationMinutes: 45, curriculumLabels: [] };
async function main() {
  const canonicalStage5 = { classExercise: ["Synthetic exercise"], boardSummary: ["Synthetic summary"], comingNext: "Synthetic next", homework: "Synthetic homework", studentSummary: "Synthetic revision" };
  assert.equal(validateStage5Generated(canonicalStage5).status, "PASS");
  assert.equal(validateStage5Generated({ ...canonicalStage5, classExercise: "not-an-array" }).status, "BLOCKED");
  assert.equal(validateStage5Generated({ ...canonicalStage5, boardSummary: "not-an-array" }).status, "BLOCKED");
  assert.equal(validateStage5Generated({ ...canonicalStage5, homework: ["not-a-string"] }).status, "BLOCKED");
  assert.equal(validateStage5Generated({ ...canonicalStage5, homework: undefined }).status, "BLOCKED");
  assert.equal(validateStage5Generated({ ...canonicalStage5, teacherReflection: { template: true, completed: false, prompts: ["model supplied"] } }).status, "BLOCKED");
  const syntheticBase = { metadata, provenance: { origin: "AI_GENERATED" as const, sourceLocations: [], extracted: false, generated: true, aiTransformedSource: false, teacherEditState: "NOT_REVIEWED" as const, provider: "test", requestedModel: "test", actualModel: "test", templateVersion: "TEACHNEXIS_LESSON_V2", curriculumContextUsed: false, textbookContextUsed: false, stages: {} } };
  const merged = mergeStage5Substages({ ...syntheticBase, stage: "5A" as const, classExercise: ["Exercise"], boardSummary: ["Summary"] }, { ...syntheticBase, stage: "5B" as const, comingNext: "Next", homework: "Homework", studentSummary: "Revision" });
  assert.equal(validateStage5A({ classExercise: ["Exercise"], boardSummary: ["Summary"] }).status, "PASS");
  assert.equal(validateStage5B({ comingNext: "Next", homework: "Homework", studentSummary: "Revision" }).status, "PASS");
  assert.equal(validateStage5Generated(merged).status, "PASS");
  const generated = await runLessonV2Shadow({ metadata }, { transport: createShadowMockTransport() });
  assert.ok(generated.contract); const reflection = generated.contract.assessment.teacherReflection;
  assert.equal(reflection.template, true); assert.equal(reflection.completed, false); assert.ok(reflection.prompts.length > 0);
  const attemptedOverride = await runLessonV2Shadow({ metadata }, { transport: createShadowMockTransport({ "5A": () => ({ classExercise: ["Synthetic"], boardSummary: ["Synthetic"], teacherReflection: { template: true, completed: true, prompts: ["Fabricated observation"] } }) }) });
  assert.equal(attemptedOverride.assembled, false); assert.equal(attemptedOverride.stopStage, "5A");
  const invalid = structuredClone(generated.contract); (invalid.assessment.teacherReflection as unknown as { completed: boolean }).completed = true;
  assert.equal(validateLessonContract(invalid, metadata).status, "BLOCKED");
  assert.equal(detectLessonContent({ markdown: "Legacy synthetic lesson" }), "LEGACY_UNSTRUCTURED");
  console.log("v2 reflection authority tests passed");
}
void main();
