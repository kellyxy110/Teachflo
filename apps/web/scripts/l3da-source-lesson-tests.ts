import assert from "node:assert/strict";
import { createWorkspaceLessonEnvelope } from "../lib/lessons/content-envelope";
import { reconstructLessonSourceReference } from "../lib/documents/source-reference";

const metadata = { provenance: { sourceDocumentId: "doc-1", exactExcerpt: "x² + H₂O", sourceHash: "hash-1", sourceLocation: { page: 84 }, extractionMethod: "pdf-parse", extractionVersion: "l3b-extraction-v1" } };
const reference = reconstructLessonSourceReference({ documentId: "doc-1", exactExcerpt: "x² + H₂O", metadata });
assert.equal(reference.referenceVersion, "TEACHNEXIS_SOURCE_REFERENCE_V1");
assert.equal(reference.origin, "EXTRACTED_FROM_SOURCE");
assert.equal(reference.exactExcerpt, "x² + H₂O");
assert.equal(reference.sourceLocation?.page, 84);
assert.throws(() => reconstructLessonSourceReference({ documentId: "doc-1", exactExcerpt: "tampered", metadata }), /stale|match/);
assert.throws(() => reconstructLessonSourceReference({ documentId: "doc-2", exactExcerpt: "x² + H₂O", metadata }), /invalid/);
const envelope = createWorkspaceLessonEnvelope({ markdown: "Teacher explanation", origin: "DOCUMENT_IMPORT", sourceReferences: [reference] });
assert.equal(envelope.review.state, "DRAFT");
assert.equal(envelope.sourceReferences?.[0]?.exactExcerpt, "x² + H₂O");
assert.equal(envelope.sourceReferences?.[0]?.sourceHash, "hash-1");
console.log("L3D-A source lesson tests passed");
