import { loadEnvConfig } from "@next/env";
import path from "node:path";
import fs from "node:fs";

// Use Next's server-side environment loader, matching local route development.
const appDirectory = fs.existsSync(path.join(process.cwd(), "apps", "web")) ? path.join(process.cwd(), "apps", "web") : process.cwd();
if (!process.env.OPENROUTER_API_KEY?.trim()) delete process.env.OPENROUTER_API_KEY;
loadEnvConfig(appDirectory, true);

import { assertShadowRunResult, runLessonV2Shadow, serializeShadowStageResults } from "../lib/lessons/v2-shadow";
import { createShadowMockTransport } from "../lib/lessons/v2-shadow-mock";

const metadata = { subject: "Mathematics", classLevel: "SS1", topic: "Quadratic Equations", term: "FIRST", week: 3, periods: 1, durationMinutes: 45, curriculumLabels: [] };
async function main() { const debug = process.env.LESSON_V2_SHADOW_DEBUG === "1"; const transport = process.env.LESSON_V2_SHADOW_PROVIDER === "mock" ? createShadowMockTransport() : undefined; try { if (debug) console.error(JSON.stringify({ event: "RUNNER_CALL_STARTED", module: "../lib/lessons/v2-shadow", runner: runLessonV2Shadow.name, runnerType: typeof runLessonV2Shadow })); const result = await runLessonV2Shadow({ metadata }, { transport }); if (debug) console.error(JSON.stringify({ event: "RUNNER_CALL_COMPLETED", resultType: typeof result, resultIsNull: result === null, resultIsUndefined: result === undefined, resultKeys: result && typeof result === "object" ? Object.keys(result) : [] })); assertShadowRunResult(result); console.log(JSON.stringify({ stages: serializeShadowStageResults(result.results), assembled: result.assembled, finalValidation: result.finalValidation, wordCount: result.wordCount, totalProviderCalls: result.totalProviderCalls, totalRetries: result.totalRetries, retryStages: result.retryStages, stopReason: result.stopReason, stopStage: result.stopStage, validationErrors: result.validationErrors })); } catch (error) { const value = error instanceof Error ? { name: error.name, message: error.message, ...(debug ? { stack: error.stack } : {}) } : { message: "Shadow generation failed" }; console.error(JSON.stringify({ errorClass: "LOCAL_ORCHESTRATION_FAILURE", ...value })); process.exitCode = 1; } }
void main();
