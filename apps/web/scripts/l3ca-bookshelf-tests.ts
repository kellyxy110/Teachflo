import assert from "node:assert/strict";
import { documentAccessWhere, privateBookshelfWhere } from "../lib/documents/access";
import { filterBookshelfDocuments, bookshelfFileType } from "../lib/documents/bookshelf";

const docs = [
  { id: "a", title: "Physics notes", subject: "Physics", classLevel: "SS2", fileName: "notes.pdf", mimeType: "application/pdf", fileSize: 1, pageCount: 2, status: "READY", error: null, createdAt: "2026-01-01" },
  { id: "b", title: "Biology handout", subject: "Biology", classLevel: "SS2", fileName: "heart.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileSize: 1, pageCount: null, status: "PROCESSING", error: null, createdAt: "2026-01-02" },
  { id: "c", title: "Failed scan", subject: "History", classLevel: null, fileName: "scan.pdf", mimeType: "application/pdf", fileSize: 1, pageCount: null, status: "FAILED", error: "OCR is required", createdAt: "2026-01-03" },
];

assert.deepEqual(documentAccessWhere("school-a", "teacher-a"), { schoolId: "school-a", OR: [{ visibility: "SCHOOL" }, { visibility: "PRIVATE", teacherId: "teacher-a" }] });
assert.deepEqual(privateBookshelfWhere("school-a", "teacher-a"), { schoolId: "school-a", teacherId: "teacher-a", visibility: "PRIVATE" });
assert.notDeepEqual(privateBookshelfWhere("school-a", "teacher-a"), privateBookshelfWhere("school-a", "teacher-b"));
assert.equal(filterBookshelfDocuments(docs, {}).length, 3);
assert.equal(filterBookshelfDocuments(docs, { query: "physics" })[0]?.id, "a");
assert.equal(filterBookshelfDocuments(docs, { fileType: "DOCX" })[0]?.id, "b");
assert.equal(filterBookshelfDocuments(docs, { status: "FAILED" })[0]?.id, "c");
assert.equal(filterBookshelfDocuments(docs, { classLevel: "SS1" }).length, 0);
assert.equal(bookshelfFileType("text/plain", "notes.txt"), "TXT");
assert.equal(bookshelfFileType("application/pdf", "scan.pdf"), "PDF");
console.log("L3C-A bookshelf tests passed");
