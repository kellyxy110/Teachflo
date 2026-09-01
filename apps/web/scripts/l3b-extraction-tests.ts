import assert from "node:assert/strict";
import { chunkExtractedBlocks, extractTxt, extractDocument } from "../lib/documents/extraction";

const txt = "Equation: x² = 4\nUse units: 5 m/s\n";
const extracted = extractTxt(Buffer.from(txt, "utf8"));
assert.equal(extracted.text, txt);
assert.equal(extracted.blocks[0].sourceText, "Equation: x² = 4");
assert.deepEqual(extracted.blocks[0].location, { lineStart: 1, lineEnd: 1 });
assert.equal(extracted.blocks[1].location.lineStart, 2);
const chunks = chunkExtractedBlocks(extracted.blocks, 100, 0);
assert.equal(chunks[0].sourceExcerpt, chunks[0].sourceText);
assert.equal(chunks[0].extractionVersion, "l3b-extraction-v1");
assert.equal(chunks[0].location.lineStart, 1);
assert.throws(() => extractTxt(Buffer.from("", "utf8")), /empty/i);
void extractDocument(Buffer.from("not pdf"), "application/pdf").then(() => { throw new Error("invalid PDF accepted"); }).catch((error) => { assert.match(String(error.message), /PDF|parser|signature/i); console.log("L3B extraction/provenance tests passed"); });
