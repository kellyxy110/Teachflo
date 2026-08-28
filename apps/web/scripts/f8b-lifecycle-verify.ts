import { randomUUID } from "node:crypto";
import { PrismaClient, Prisma } from "@prisma/client";
import { publishExamForActor, derivePublicationState, attemptDeadline, saveExamDraftForActor, updatePublicationForActor, deleteDraftExamForActor, archiveExamForActor } from "../lib/services/assessments/publication";

const db = new PrismaClient();
const marker = `F8B0_SYNTH_${Date.now()}_${randomUUID().slice(0, 8)}`;
const pass = (name: string, value: boolean) => { if (!value) throw new Error(`${name}:FAIL`); console.log(`${name}:PASS`); };

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("wxgnufdacfncwxbedzap") || url.includes("cnodlvmgdueykdriiati")) throw new Error("F8B harness requires Development database.");
  await db.$queryRaw`SELECT 1`;
  const school = await db.school.create({ data: { name: marker, code: marker, state: "Synthetic" } });
  const teacher = await db.teacher.create({ data: { schoolId: school.id, clerkId: marker, firstName: "F8B", lastName: "Teacher", email: `${marker}@invalid.test`, subjects: ["Mathematics"], classLevels: ["JS1"] } });
  const cls = await db.class.create({ data: { schoolId: school.id, name: marker, level: "JS1", session: "2099/2100" } });
  const student = await db.student.create({ data: { schoolId: school.id, classId: cls.id, firstName: "F8B", lastName: "Student", regNumber: marker } });
  const question = await db.question.create({ data: { schoolId: school.id, createdByTeacherId: teacher.id, lifecycle: "APPROVED", sourceKind: "TEACHER", visibility: "SCHOOL", defaultMarks: 2, section: "A", number: 1, type: "MCQ", stem: `${marker} question`, optionA: "4", optionB: "5", correctOption: "A", solution: "4", explanation: "Synthetic", relatedChunkIds: [] } });
  const version = await db.questionVersion.create({ data: { questionId: question.id, version: 1, payload: { stem: question.stem, correctOption: "A", marks: 2 } as Prisma.InputJsonValue } });
  const exam = await db.exam.create({ data: { schoolId: school.id, teacherId: teacher.id, classId: cls.id, title: marker, subject: "Mathematics", topic: "Synthetic", classLevel: "JS1", examType: "SCHOOL_TEST", difficulty: "BASIC", duration: 60, instructions: "Read carefully", opensAt: new Date("2099-01-01T10:00:00Z"), closesAt: new Date("2099-01-01T12:00:00Z") } });
  const item = await db.assessmentItem.create({ data: { examId: exam.id, questionId: question.id, questionVersionId: version.id, order: 1, section: "A", marksOverride: 5, snapshot: { stem: question.stem } } });
  pass("DRAFT_CREATE", exam.lifecycle === "DRAFT");
  await saveExamDraftForActor({ examId: exam.id, expectedDraftRevision: 1, title: `${marker} edited` }, { teacherId: teacher.id, schoolId: school.id });
  let staleRejected = false;
  try { await saveExamDraftForActor({ examId: exam.id, expectedDraftRevision: 1, title: `${marker} stale` }, { teacherId: teacher.id, schoolId: school.id }); } catch { staleRejected = true; }
  pass("STALE_DRAFT_REJECTION", staleRejected);
  await db.exam.update({ where: { id: exam.id }, data: { title: marker, draftRevision: 2 } });
  const publication = await publishExamForActor({ examId: exam.id, expectedDraftRevision: 2 }, { teacherId: teacher.id, schoolId: school.id });
  pass("VALID_PUBLISH", Boolean(publication.id));
  pass("PUBLICATION_REVISION_1", publication.version === 1);
  const publishedItem = await db.assessmentPublicationItem.findFirstOrThrow({ where: { publicationId: publication.id } });
  pass("PUBLICATION_ITEM_ORDER", publishedItem.order === 1);
  pass("VERSION_PINNING", publishedItem.questionVersionId === version.id);
  pass("MARKS_SNAPSHOT", publishedItem.marks === 5);
  pass("INSTRUCTIONS_SNAPSHOT", publication.instructions === "Read carefully");
  pass("DURATION_SNAPSHOT", publication.duration === 60);
  pass("SCHEDULE_SNAPSHOT", publication.opensAt?.toISOString() === "2099-01-01T10:00:00.000Z");
  pass("RESULT_POLICY_SNAPSHOT", publication.resultReleasePolicy === "AFTER_TEACHER_RELEASE");
  pass("ANSWER_POLICY_SNAPSHOT", publication.answerReleasePolicy === "NEVER");
  pass("DERIVED_SCHEDULE_STATE", derivePublicationState({ opensAt: publication.opensAt, closesAt: publication.closesAt }, new Date("2099-01-01T09:00:00Z")) === "SCHEDULED");
  pass("ATTEMPT_DEADLINE", attemptDeadline(new Date("2099-01-01T10:00:00Z"), 60, publication.closesAt)?.toISOString() === "2099-01-01T11:00:00.000Z");
  const attempt = await db.examAttempt.create({ data: { studentId: student.id, examId: exam.id, schoolId: school.id, publicationId: publication.id, deadlineAt: new Date("2099-01-01T11:00:00Z"), deliverySnapshot: { publicationId: publication.id, version: publication.version } } });
  pass("FIRST_ATTEMPT_BINDING", attempt.publicationId === publication.id);
  const immutableBefore = await db.assessmentPublication.findUniqueOrThrow({ where: { id: publication.id } });
  pass("PUBLICATION_IMMUTABILITY", immutableBefore.contentHash === publication.contentHash);
  pass("TEACHER_ATTRIBUTION", publication.publishedByTeacherId === teacher.id);
  await db.examAttempt.delete({ where: { id: attempt.id } });
  await db.assessmentPublicationItem.deleteMany({ where: { publicationId: publication.id } });
  await db.assessmentPublication.delete({ where: { id: publication.id } });
  await db.assessmentItem.delete({ where: { id: item.id } });
  await db.questionVersion.delete({ where: { id: version.id } });
  await db.question.delete({ where: { id: question.id } });
  await db.exam.delete({ where: { id: exam.id } });
  await db.student.delete({ where: { id: student.id } });
  await db.class.delete({ where: { id: cls.id } });
  await db.teacher.delete({ where: { id: teacher.id } });
  await db.school.delete({ where: { id: school.id } });
  pass("CLEANUP", (await db.school.count({ where: { code: marker } })) === 0);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "F8B harness failed"); process.exitCode = 1; }).finally(() => db.$disconnect());
