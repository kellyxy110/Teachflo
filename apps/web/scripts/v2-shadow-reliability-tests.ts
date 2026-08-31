import assert from "node:assert/strict";
import { classifyFailure } from "../lib/lessons/v2-shadow";

assert.equal(classifyFailure({ status: 503 }), "PROVIDER_RETRYABLE");
assert.equal(classifyFailure(new Error("connection reset")), "PROVIDER_RETRYABLE");
assert.equal(classifyFailure({ status: 429 }), "PROVIDER_NON_RETRYABLE");
assert.equal(classifyFailure({ status: 401 }), "PROVIDER_NON_RETRYABLE");
assert.equal(classifyFailure(new Error("JSON fence must contain exactly one object")), "MODEL_CONTRACT_RETRYABLE");
assert.equal(classifyFailure({ message: "roadmap identity mismatch" }), "DETERMINISTIC_BLOCK");
assert.equal(classifyFailure({ message: "contract field missing" }, true), "MODEL_CONTRACT_RETRYABLE");
console.log("v2 shadow reliability classification tests passed");
