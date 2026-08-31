import assert from "node:assert/strict";
import { stageFixtures } from "../lib/lessons/v2-qualification-fixtures";
import { validateStage3A, validateStage3B1A, validateStage3B1B, validateStage3B1C, validateStage3B2, validateStage4A, validateStage4B, validateStageOutput } from "../lib/lessons/v2-validation";

assert.equal(validateStage3A(stageFixtures["3A"]).status, "PASS");
assert.equal(validateStage3B1A(stageFixtures["3B1A"]).status, "PASS");
assert.equal(validateStage3B1B(stageFixtures["3B1B"]).status, "PASS");
assert.equal(validateStage3B1C(stageFixtures["3B1C"]).status, "PASS");
assert.equal(validateStage3B2(stageFixtures["3B2"]).status, "PASS");
assert.equal(validateStage4A(stageFixtures["4A"]).status, "PASS");
assert.equal(validateStage4B(stageFixtures["4B"]).status, "PASS");
assert.equal(validateStageOutput(5, stageFixtures["5"]).status, "PASS");
console.log("v2 qualification fixtures passed");
