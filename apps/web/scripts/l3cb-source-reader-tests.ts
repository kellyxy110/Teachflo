import assert from "node:assert/strict";
import { readerChunks, readerFormat, sourceLocation } from "../lib/documents/source-reader";

assert.equal(readerFormat("application/pdf", "notes.pdf"), "PDF");
assert.equal(readerFormat("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "notes.docx"), "DOCX");
assert.equal(readerFormat("text/plain", "notes.txt"), "TXT");
assert.equal(sourceLocation({ provenance: true }, "PDF"), "Location unavailable");
assert.equal(sourceLocation({ sourceLocation: { page: 14, pageEnd: 15 } }, "PDF"), "Page 14–15");
assert.equal(sourceLocation({ provenance: { sourceLocation: { page: 9 } } }, "PDF"), "Page 9");
assert.equal(sourceLocation({ sourceLocation: { paragraph: 12 } }, "DOCX"), "Paragraph 12");
assert.equal(sourceLocation({ sourceLocation: { lineStart: 18, lineEnd: 24 } }, "TXT"), "Lines 18–24");
assert.equal(sourceLocation(null, "TXT"), "Location unavailable");
assert.equal(readerChunks([{ id: "1", content: "x²", chunkIndex: 0, metadata: { sourceLocation: { page: 2 } } }], "PDF")[0]?.locationLabel, "Page 2");
console.log("L3C-B source reader tests passed");
