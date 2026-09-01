import assert from "node:assert/strict";
import {
  buildPrivateSourceMetadata,
  canDeletePrivateTeacherSource,
  isSafePrivateSourceKey,
  MAX_PRIVATE_SOURCE_BYTES,
  privateSourceMetadataKey,
  privateSourceKey,
  safeSourceFileName,
  sha256Buffer,
  validatePdfUpload,
} from "../lib/documents/private-source";
import { documentAccessSql, documentAccessWhere } from "../lib/documents/access";

const pdf = Buffer.from("%PDF-1.7\nsynthetic lesson source", "utf8");
assert.equal(validatePdfUpload({ mimeType: "application/pdf", size: pdf.length, header: pdf.subarray(0, 5) }), null);
assert.equal(validatePdfUpload({ mimeType: "text/plain", size: pdf.length, header: pdf.subarray(0, 5) }), null);
assert.match(validatePdfUpload({ mimeType: "application/pdf", size: pdf.length, header: Buffer.from("nope!") })!, /Invalid document/);
assert.match(validatePdfUpload({ mimeType: "application/pdf", size: MAX_PRIVATE_SOURCE_BYTES + 1, header: pdf.subarray(0, 5) })!, /under 10 MB/);
assert.equal(safeSourceFileName("../../Quadratic Equations?.pdf"), "Quadratic_Equations_.pdf");
const key = privateSourceKey("school-1", "teacher-1", "doc-1", "../../Quadratic Equations?.pdf");
assert.equal(isSafePrivateSourceKey(key), true);
assert.equal(isSafePrivateSourceKey("/public/../secret"), false);
assert.equal(privateSourceMetadataKey(key).endsWith(".metadata.json"), true);
assert.equal(sha256Buffer(pdf), sha256Buffer(Buffer.from(pdf)));
const metadata = buildPrivateSourceMetadata({ schoolId: "school-1", teacherId: "teacher-1", documentId: "doc-1", fileName: "lesson.pdf", mimeType: "application/pdf", buffer: pdf });
assert.equal(metadata.visibility, "PRIVATE_TEACHER_SOURCE");
assert.equal(metadata.size, pdf.length);
assert.equal(metadata.sha256, sha256Buffer(pdf));
assert.equal(metadata.storageKey, "school-1/teacher-1/doc-1/lesson.pdf");
assert.equal(canDeletePrivateTeacherSource({ documentSchoolId: "school-1", documentTeacherId: "teacher-1", requesterSchoolId: "school-1", requesterTeacherId: "teacher-1" }), true);
assert.equal(canDeletePrivateTeacherSource({ documentSchoolId: "school-1", documentTeacherId: "teacher-1", requesterSchoolId: "school-1", requesterTeacherId: "teacher-2" }), false);
assert.equal(canDeletePrivateTeacherSource({ documentSchoolId: "school-2", documentTeacherId: "teacher-1", requesterSchoolId: "school-1", requesterTeacherId: "teacher-1" }), false);
const access = documentAccessWhere("school-1", "teacher-1");
assert.deepEqual(access, { schoolId: "school-1", OR: [{ visibility: "SCHOOL" }, { visibility: "PRIVATE", teacherId: "teacher-1" }] });
assert.match(documentAccessSql("d", "$1", "$2"), /visibility.*PRIVATE/);
assert.doesNotMatch(documentAccessSql("d", "$1"), /PRIVATE/);
console.log("L3A document foundation tests passed");
