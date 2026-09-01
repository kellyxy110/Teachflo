import assert from "node:assert/strict";
import { reconstructLessonSourceReference } from "../lib/documents/source-reference";
import { buildSourceBackedQuestionVersionPayload, sourceEvidenceForViewer, QUESTION_DERIVED_ORIGIN } from "../lib/questions/source-question";

const metadata = { provenance: { sourceDocumentId: "doc-1", exactExcerpt: "Refraction x²", sourceHash: "hash-1", sourceLocation: { page: 84 }, extractionMethod: "pdf-parse", extractionVersion: "l3b-v1" } };
const sourceReference = reconstructLessonSourceReference({ documentId: "doc-1", exactExcerpt: "Refraction x²", metadata });
const payload = buildSourceBackedQuestionVersionPayload({ stem: "Explain refraction.", type: "SHORT_ANSWER", solution: "A valid solution", explanation: "Teacher explanation", sourceReference });
assert.equal(payload.derivedOrigin, QUESTION_DERIVED_ORIGIN);
assert.equal(payload.sourceReference.origin, "EXTRACTED_FROM_SOURCE");
assert.equal(payload.sourceReference.exactExcerpt, "Refraction x²");
assert.equal(sourceEvidenceForViewer({ visibility: "PRIVATE", ownerTeacherId: "teacher-a", viewerTeacherId: "teacher-a", payload }), sourceReference);
assert.equal(sourceEvidenceForViewer({ visibility: "PRIVATE", ownerTeacherId: "teacher-a", viewerTeacherId: "teacher-b", payload }), null);
assert.equal(sourceEvidenceForViewer({ visibility: "SCHOOL", ownerTeacherId: "teacher-a", viewerTeacherId: "teacher-b", payload }), null);
assert.throws(() => reconstructLessonSourceReference({ documentId: "doc-1", exactExcerpt: "tampered", metadata }), /stale|match/);
console.log("L3D-B source question tests passed");
