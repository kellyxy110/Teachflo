import { randomUUID } from "node:crypto";
import { PrismaClient, Prisma } from "@prisma/client";
import { publishExamForActor } from "../lib/services/assessments/publication";
import { getStudentAssessment, getStudentAttemptDelivery, saveStudentResponse, startStudentAttempt, submitStudentAttempt } from "../lib/services/assessments/student-delivery";

const db = new PrismaClient();
const marker = `F8D_SYNTH_${Date.now()}_${randomUUID().slice(0, 8)}`;
const pass = (name: string, value: boolean) => { if (!value) throw new Error(`${name}:FAIL`); console.log(`${name}:PASS`); };

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("wxgnufdacfncwxbedzap") || url.includes("cnodlvmgdueykdriiati")) throw new Error("F8D harness requires Development database.");
  await db.$queryRaw`SELECT 1`;
  const schoolA = await db.school.create({ data: { name: marker, code: marker, state: "Synthetic" } });
  const schoolB = await db.school.create({ data: { name: `${marker}_B`, code: `${marker}_B`, state: "Synthetic" } });
  const teacher = await db.teacher.create({ data: { schoolId: schoolA.id, clerkId: marker, firstName: "F8D", lastName: "Teacher", email: `${marker}@invalid.test`, subjects: ["Mathematics"], classLevels: ["JS1"] } });
  const cls = await db.class.create({ data: { schoolId: schoolA.id, name: marker, level: "JS1", session: "2099/2100" } });
  const clsB = await db.class.create({ data: { schoolId: schoolB.id, name: `${marker}_B`, level: "JS1", session: "2099/2100" } });
  const student = await db.student.create({ data: { schoolId: schoolA.id, classId: cls.id, firstName: "A", lastName: "Student", regNumber: `${marker}_A` } });
  const student2 = await db.student.create({ data: { schoolId: schoolA.id, classId: cls.id, firstName: "A2", lastName: "Student", regNumber: `${marker}_A2` } });
  const studentB = await db.student.create({ data: { schoolId: schoolB.id, classId: clsB.id, firstName: "B", lastName: "Student", regNumber: `${marker}_B` } });
  const question = await db.question.create({ data: { schoolId: schoolA.id, createdByTeacherId: teacher.id, lifecycle: "APPROVED", sourceKind: "TEACHER", visibility: "SCHOOL", defaultMarks: 2, section: "A", number: 1, type: "MCQ", stem: `${marker} question`, optionA: "4", optionB: "5", correctOption: "A", solution: "4", explanation: "Synthetic", relatedChunkIds: [] } });
  const version = await db.questionVersion.create({ data: { questionId: question.id, version: 1, payload: { stem: question.stem, type: "MCQ", optionA: "4", optionB: "5", correctOption: "A" } as Prisma.InputJsonValue } });
  const exam = await db.exam.create({ data: { schoolId: schoolA.id, teacherId: teacher.id, classId: cls.id, title: marker, subject: "Mathematics", topic: "Synthetic", classLevel: "JS1", examType: "SCHOOL_TEST", difficulty: "BASIC", duration: 60 } });
  await db.assessmentItem.create({ data: { examId: exam.id, questionId: question.id, questionVersionId: version.id, order: 1, section: "A", marksOverride: 2, snapshot: { stem: question.stem, type: "MCQ", optionA: "4", optionB: "5", correctOption: "A" } } });
  pass("UNPUBLISHED_DENIED", await expectReject(() => getStudentAssessment(exam.id, { id: student.id, schoolId: schoolA.id, classId: cls.id })));
  const publication = await publishExamForActor({ examId: exam.id }, { teacherId: teacher.id, schoolId: schoolA.id });
  const assessment = await getStudentAssessment(exam.id, { id: student.id, schoolId: schoolA.id, classId: cls.id });
  pass("ELIGIBLE_STUDENT_ACCESS", assessment.publication.id === publication.id);
  pass("AVAILABLE_ACCESS", assessment.state === "ACTIVE");
  const attempt = await startStudentAttempt(exam.id, { id: student.id, schoolId: schoolA.id, classId: cls.id }, new Date());
  const retry = await startStudentAttempt(exam.id, { id: student.id, schoolId: schoolA.id, classId: cls.id }, new Date());
  pass("START_ATTEMPT", attempt.publicationId === publication.id);
  pass("START_RETRY_IDEMPOTENCY", retry.id === attempt.id);
  const item = await db.assessmentPublicationItem.findFirstOrThrow({ where: { publicationId: publication.id } });
  const response = await saveStudentResponse({ attemptId: attempt.id, publicationItemId: item.id, selectedOption: "A" }, { id: student.id, schoolId: schoolA.id, classId: cls.id });
  pass("ANSWER_SAVE", response.publicationItemId === item.id && response.isCorrect === true);
  const updated = await saveStudentResponse({ attemptId: attempt.id, publicationItemId: item.id, selectedOption: "B" }, { id: student.id, schoolId: schoolA.id, classId: cls.id });
  pass("ANSWER_UPDATE", updated.selectedOption === "B");
  pass("CROSS_STUDENT_RESPONSE_DENIAL", await expectReject(() => saveStudentResponse({ attemptId: attempt.id, publicationItemId: item.id, selectedOption: "A" }, { id: student2.id, schoolId: schoolA.id, classId: cls.id })));
  pass("CROSS_SCHOOL_DENIAL", await expectReject(() => getStudentAssessment(exam.id, { id: studentB.id, schoolId: schoolB.id, classId: clsB.id })));
  const resumed = await getStudentAttemptDelivery(attempt.id, { id: student.id, schoolId: schoolA.id, classId: cls.id });
  pass("RESUME", resumed.attempt.id === attempt.id && resumed.publication.id === publication.id && resumed.items[0].response?.selectedOption === "B");
  pass("DEADLINE_PERSISTENCE", Boolean(attempt.deadlineAt));
  const submitted = await submitStudentAttempt(attempt.id, { id: student.id, schoolId: schoolA.id, classId: cls.id });
  const submittedAgain = await submitStudentAttempt(attempt.id, { id: student.id, schoolId: schoolA.id, classId: cls.id });
  pass("SUBMIT", submitted.status === "SUBMITTED");
  pass("DOUBLE_SUBMIT_SAFETY", submittedAgain.id === submitted.id);
  pass("POST_SUBMIT_MUTATION_DENIED", await expectReject(() => saveStudentResponse({ attemptId: attempt.id, publicationItemId: item.id, selectedOption: "A" }, { id: student.id, schoolId: schoolA.id, classId: cls.id })));
  pass("HISTORICAL_PUBLICATION_RENDERING", (await getStudentAttemptDelivery(attempt.id, { id: student.id, schoolId: schoolA.id, classId: cls.id })).publication.id === publication.id);
  await db.questionResponse.deleteMany({ where: { attemptId: attempt.id } }); await db.examAttempt.delete({ where: { id: attempt.id } }); await db.assessmentPublicationItem.deleteMany({ where: { publicationId: publication.id } }); await db.assessmentPublication.delete({ where: { id: publication.id } }); await db.assessmentItem.deleteMany({ where: { examId: exam.id } }); await db.questionVersion.delete({ where: { id: version.id } }); await db.question.delete({ where: { id: question.id } }); await db.exam.delete({ where: { id: exam.id } }); await db.student.deleteMany({ where: { id: { in: [student.id, student2.id, studentB.id] } } }); await db.class.deleteMany({ where: { id: { in: [cls.id, clsB.id] } } }); await db.teacher.delete({ where: { id: teacher.id } }); await db.school.deleteMany({ where: { id: { in: [schoolA.id, schoolB.id] } } });
  pass("CLEANUP", (await db.school.count({ where: { code: { startsWith: marker } } })) === 0);
}
async function expectReject(fn: () => Promise<unknown>) { try { await fn(); return false; } catch { return true; } }
main().catch((error) => { console.error(error instanceof Error ? error.message : "F8D harness failed"); process.exitCode = 1; }).finally(() => db.$disconnect());
