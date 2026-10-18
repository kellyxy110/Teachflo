import assert from "node:assert/strict";
import { db } from "../lib/db";
import { canonicalQuestionFingerprint } from "../lib/questions/corpus-contract";
import { editQuestionForReview, approveQuestionForReview, rejectQuestionForReview, returnQuestionToDraft } from "../lib/services/questions/review-workspace";

const prefix = "qbc5ci";
const schoolA = prefix + "_school_a", schoolB = prefix + "_school_b";
const teacherA = prefix + "_teacher_a", teacherB = prefix + "_teacher_b", otherTeacher = prefix + "_teacher_other";
const questionA = prefix + "_question_a", questionB = prefix + "_question_b";
const actorA = { schoolId: schoolA, teacherId: teacherA };
const actorB = { schoolId: schoolB, teacherId: teacherB };
const actorOther = { schoolId: schoolA, teacherId: otherTeacher };
const metadata = {
  subject: "Mathematics", classLevel: "SS1", topic: "Algebra", questionType: "CALCULATION",
  difficulty: "STANDARD", cognitiveSkills: ["APPLICATION"], assessmentProfiles: ["SCHOOL_STANDARD"],
  estimatedTimeSeconds: 60, marks: 1, calculatorPolicy: "NOT_APPLICABLE",
  curriculumNodeIds: ["node"], objectiveNodeIds: [],
  curriculumAlignments: [{ curriculumVersionId: "version", nodeId: "node", authority: "INTERNAL_UNVERIFIED" }],
  origin: "DETERMINISTIC_GENERATED", provenance: { origin: "DETERMINISTIC_GENERATED", verification: "NOT_REQUIRED" },
  generationMethod: "DETERMINISTIC", reviewStatus: "DRAFT", version: 1,
};
const questionIds = [questionA, questionB];
async function clean() {
  await db.questionCorpusMetadata.deleteMany({ where: { questionVersion: { questionId: { in: questionIds } } } });
  await db.questionVersion.deleteMany({ where: { questionId: { in: questionIds } } });
  await db.question.deleteMany({ where: { id: { in: questionIds } } });
  await db.teacher.deleteMany({ where: { id: { in: [teacherA, teacherB, otherTeacher] } } });
  await db.school.deleteMany({ where: { id: { in: [schoolA, schoolB] } } });
}
async function main() {
  if (process.env.QBC5_ISOLATED_DB !== "true") throw new Error("Refusing to run without QBC5_ISOLATED_DB=true");
  await clean();
  try {
    for (const [id, code] of [[schoolA, "QBC5C1"], [schoolB, "QBC5C2"]]) {
      await db.school.create({ data: { id, code, name: id, state: "Lagos" } });
    }
    for (const [id, schoolId] of [[teacherA, schoolA], [teacherB, schoolB], [otherTeacher, schoolA]]) {
      await db.teacher.create({ data: { id, clerkId: id, schoolId, firstName: "QA", lastName: "Teacher", email: id + "@example.invalid", subjects: ["Mathematics"], classLevels: ["SS1"] } });
    }
    for (const [id, schoolId, createdByTeacherId] of [[questionA, schoolA, teacherA], [questionB, schoolB, teacherB]]) {
      const stem = "Calculate 2 + 2", solution = "4", type = "CALCULATION";
      const fingerprint = canonicalQuestionFingerprint({ stem, type, answer: "", solution });
      await db.question.create({ data: { id, schoolId, createdByTeacherId, section: "A", number: 1, type: "CALCULATION", stem, solution, explanation: "Addition", visibility: "SCHOOL" } });
      const version = await db.questionVersion.create({ data: { questionId: id, version: 1, payload: { metadata: { ...metadata, exactFingerprint: fingerprint, normalizedFingerprint: fingerprint, familyVariantFingerprint: fingerprint } } } });
      await db.questionCorpusMetadata.create({ data: { questionVersionId: version.id, subject: "Mathematics", classLevel: "SS1", topic: "Algebra", questionType: "CALCULATION", difficulty: "STANDARD", cognitiveSkills: ["APPLICATION"], assessmentProfiles: ["SCHOOL_STANDARD"], calculatorPolicy: "NOT_APPLICABLE", estimatedTimeSeconds: 60, marks: 1, prerequisiteNodeIds: [], origin: "DETERMINISTIC_GENERATED", provenanceVerification: "NOT_REQUIRED", generationMethod: "DETERMINISTIC", exactFingerprint: fingerprint, normalizedFingerprint: fingerprint, familyVariantFingerprint: fingerprint } });
    }
    await assert.rejects(() => approveQuestionForReview(actorB, questionA));
    await assert.rejects(() => approveQuestionForReview(actorOther, questionA));
    await assert.rejects(() => editQuestionForReview(actorB, { questionId: questionA, stem: "Wrong", solution: "Wrong", explanation: "Wrong", marks: 1, estimatedTime: 60 }));
    console.log("PASS: cross-school and non-owner service writes denied");

    const edit = await editQuestionForReview(actorA, { questionId: questionA, stem: "Calculate 3 + 3", solution: "6", explanation: "Addition", marks: 2, estimatedTime: 90 });
    assert.equal(edit.version, 2);
    const v2 = await db.questionVersion.findFirstOrThrow({ where: { questionId: questionA, version: 2 }, include: { corpusMetadata: true } });
    assert.ok(v2.corpusMetadata);
    assert.equal((await approveQuestionForReview(actorA, questionA)).lifecycle, "APPROVED");
    assert.equal((await db.questionCorpusMetadata.findUniqueOrThrow({ where: { questionVersionId: v2.id } })).reviewStatus, "APPROVED");
    console.log("PASS: edit, version metadata and approval");

    assert.equal((await rejectQuestionForReview(actorA, { questionId: questionA, reason: "poor wording" })).status, "REJECTED");
    const v3 = await db.questionVersion.findFirstOrThrow({ where: { questionId: questionA, version: 3 }, include: { corpusMetadata: true } });
    assert.equal(v3.corpusMetadata?.reviewStatus, "ARCHIVED");
    assert.equal((await returnQuestionToDraft(actorA, questionA)).lifecycle, "DRAFT");
    assert.equal((await db.questionCorpusMetadata.findUniqueOrThrow({ where: { questionVersionId: v3.id } })).reviewStatus, "DRAFT");
    console.log("PASS: rejection and return to draft");
  } finally {
    await clean();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await db.$disconnect(); });
