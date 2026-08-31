import assert from "node:assert/strict";
import { assertShadowRunResult, runLessonV2Shadow } from "../lib/lessons/v2-shadow";
import { createShadowMockTransport } from "../lib/lessons/v2-shadow-mock";

const metadata = { subject: "Mathematics", classLevel: "SS1", topic: "Quadratic Equations", term: "FIRST", week: 3, periods: 1, durationMinutes: 45, curriculumLabels: [] };
const validRoadmap = { roadmap: [{ title: "Synthetic roadmap step", status: "COVERED" }] };
const run = (overrides: Parameters<typeof createShadowMockTransport>[0] = {}) => runLessonV2Shadow({ metadata }, { transport: createShadowMockTransport(overrides) });
async function main() {
const success = await run(); assertShadowRunResult(success); assert.equal(success.assembled, true); assert.ok(success.stages[1]);
const contractRetry = await run({ "1C": (attempt) => attempt === 1 ? '{"roadmap":[]}\n{"roadmap":[]}' : validRoadmap }); assertShadowRunResult(contractRetry); assert.equal(contractRetry.totalRetries, 1); assert.equal(contractRetry.results.filter((x) => x.stage === "1A").length, 1); assert.equal(contractRetry.results.filter((x) => x.stage === "1B").length, 1); assert.ok(contractRetry.stages[1]);
const networkRetry = await run({ "1C": (attempt) => attempt === 1 ? new Error("connection reset") : validRoadmap }); assertShadowRunResult(networkRetry); assert.equal(networkRetry.totalRetries, 1); assert.ok(networkRetry.stages[1]);
const networkBlocked = await run({ "1C": () => new Error("connection reset") }); assertShadowRunResult(networkBlocked); assert.equal(networkBlocked.assembled, false); assert.equal(networkBlocked.totalRetries, 1); assert.ok(networkBlocked.stages);
const quotaBlocked = await run({ "1C": () => ({ status: 429, message: "quota exhausted" }) }); assertShadowRunResult(quotaBlocked); assert.equal(quotaBlocked.totalRetries, 0); assert.ok(quotaBlocked.stages);
const deterministicBlocked = await run({ "4B": () => ({ examinationItems: [{ sourceStatus: "VERIFIED_RETRIEVED_SOURCE", examStyle: "WAEC", question: "Synthetic", answer: "Synthetic" }] }) }); assertShadowRunResult(deterministicBlocked); assert.equal(deterministicBlocked.totalRetries, 0); assert.equal(deterministicBlocked.assembled, false); assert.ok(deterministicBlocked.stages);
assert.throws(() => assertShadowRunResult(undefined), /undefined/);
console.log("v2 real-runner orchestration tests passed");
}
void main();
