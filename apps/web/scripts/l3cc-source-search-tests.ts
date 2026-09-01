import assert from "node:assert/strict";
import { searchSourceChunks, selectionProvenance, sourceLocation } from "../lib/documents/source-reader";

const chunks = [
  { id: "pdf-1", content: "Solve H₂O and x² on page 42.", chunkIndex: 0, metadata: { provenance: { sourceDocumentId: "doc-1", exactExcerpt: "Solve H₂O and x² on page 42.", sourceHash: "hash", sourceLocation: { page: 42 }, extractionMethod: "pdf-parse", extractionVersion: "v1" } } },
  { id: "docx-1", content: "Photosynthesis occurs in chloroplasts.", chunkIndex: 1, metadata: { provenance: { sourceLocation: { paragraph: 18 }, exactExcerpt: "Photosynthesis occurs in chloroplasts." } } },
  { id: "txt-1", content: "7(a)(ii) Refraction question", chunkIndex: 2, metadata: { sourceLocation: { lineStart: 74, lineEnd: 75 } } },
];
assert.equal(searchSourceChunks(chunks, "h₂o", "PDF")[0]?.id, "pdf-1");
assert.equal(searchSourceChunks(chunks, "PHOTOSYNTHESIS", "DOCX")[0]?.id, "docx-1");
assert.equal(searchSourceChunks(chunks, "7(a)(ii)", "TXT")[0]?.excerpt, "7(a)(ii) Refraction question");
assert.equal(searchSourceChunks(chunks, "missing", "PDF").length, 0);
assert.equal(sourceLocation(chunks[0].metadata, "PDF"), "Page 42");
assert.equal(selectionProvenance(chunks[0]).exactExcerpt, "Solve H₂O and x² on page 42.");
assert.equal(selectionProvenance(chunks[0]).origin, "EXTRACTED_FROM_SOURCE");
console.log("L3C-C source search tests passed");
