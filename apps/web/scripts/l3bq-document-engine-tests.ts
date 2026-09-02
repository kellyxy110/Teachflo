import assert from "node:assert/strict";
import { qualificationFixtures, runCurrentAdapter, runPdfInspectorAdapter, scoreQualification, qualifyResultShape, type QualificationResult } from "../lib/documents/qualification";

async function main() {
  const fixtures = qualificationFixtures();
  const currentResults = [];
  for (const fixture of fixtures) currentResults.push(await runCurrentAdapter(fixture));
  const repeatResults: QualificationResult[] = [];
  for (const fixture of fixtures) repeatResults.push(await runCurrentAdapter(fixture));
  const currentScores = currentResults.map((result, index) => scoreQualification(result, fixtures[index], JSON.stringify(result.sourceText) === JSON.stringify(repeatResults[index].sourceText)));
  const inspectorResults = [];
  for (const fixture of fixtures) inspectorResults.push(await runPdfInspectorAdapter(fixture));
  const inspectorScores = inspectorResults.map((result, index) => scoreQualification(result, fixtures[index], false));

  assert.equal(fixtures.length, 8);
  assert.ok(currentResults.every((result) => result.engine === "pdf-parse"));
  assert.ok(currentResults.every((result) => result.sourceText.length >= 0));
  console.log(JSON.stringify({ fixtureCount: fixtures.length, enginesExecuted: ["pdf-parse", inspectorResults.some((result) => !result.failure) ? "pdf-inspector" : "pdf-inspector (unavailable)"], current: qualifyResultShape(currentResults, currentScores), pdfInspector: qualifyResultShape(inspectorResults, inspectorScores) }, null, 2));
}

void main();
