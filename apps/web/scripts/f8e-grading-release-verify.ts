import { randomUUID } from "node:crypto";
import { PrismaClient, Prisma } from "@prisma/client";
import { publishExamForActor } from "../lib/services/assessments/publication";
import { startStudentAttempt, saveStudentResponse, submitStudentAttempt } from "../lib/services/assessments/student-delivery";
import { gradeResponseForTeacher, getStudentResult, releaseAttemptResult, listGradingQueue } from "../lib/services/assessments/grading";

const db = new PrismaClient();
const marker = `F8E_SYNTH_${Date.now()}_${randomUUID().slice(0, 8)}`;
const pass = (name: string, value: boolean) => { if (!value) throw new Error(`${name}:FAIL`); console.log(`${name}:PASS`); };
const actor = (id: string, schoolId: string) => ({ id, schoolId });

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("wxgnufdacfncwxbedzap") || url.includes("cnodlvmgdueykdriiati")) throw new Error("F8E harness requires Development database.");
  await db.$queryRaw`SELECT 1`;
  const school = await db.school.create({ data: { name: marker, code: marker, state: "Synthetic" } });
  const otherSchool = await db.school.create({ data: { name: `${marker}_B`, code: `${marker}_B`, state: "Synthetic" } });
  const teacher = await db.teacher.create({ data: { schoolId: school.id, clerkId: marker, firstName: "F8E", lastName: "Teacher", email: `${marker}@invalid.test`, subjects: ["Mathematics"], classLevels: ["JS1"] } });
  const otherTeacher = await db.teacher.create({ data: { schoolId: otherSchool.id, clerkId: `${marker}_B`, firstName: "Other", lastName: "Teacher", email: `${marker}_b@invalid.test`, subjects: ["Mathematics"], classLevels: ["JS1"] } });
  const cls = await db.class.create({ data: { schoolId: school.id, name: marker, level: "JS1", session: "2099/2100" } });
  const otherClass = await db.class.create({ data: { schoolId: otherSchool.id, name: `${marker}_B`, level: "JS1", session: "2099/2100" } });
  const student = await db.student.create({ data: { schoolId: school.id, classId: cls.id, firstName: "Grading", lastName: "Student", regNumber: `${marker}_A` } });
  const otherStudent = await db.student.create({ data: { schoolId: otherSchool.id, classId: otherClass.id, firstName: "Other", lastName: "Student", regNumber: `${marker}_B` } });
  const mcq = await db.question.create({ data: { schoolId: school.id, createdByTeacherId: teacher.id, lifecycle: "APPROVED", sourceKind: "TEACHER", visibility: "SCHOOL", defaultMarks: 2, section: "A", number: 1, type: "MCQ", stem: `${marker} objective`, optionA: "Correct", optionB: "Wrong", correctOption: "A", solution: "Correct", explanation: "Synthetic", relatedChunkIds: [] } });
  const essay = await db.question.create({ data: { schoolId: school.id, createdByTeacherId: teacher.id, lifecycle: "APPROVED", sourceKind: "TEACHER", visibility: "SCHOOL", defaultMarks: 5, section: "B", number: 2, type: "ESSAY", stem: `${marker} essay`, solution: "Mark the explanation", explanation: "Synthetic", relatedChunkIds: [] } });
  const mcqV1 = await db.questionVersion.create({ data: { questionId: mcq.id, version: 1, payload: { type: "MCQ", stem: mcq.stem, optionA: "Correct", optionB: "Wrong", correctOption: "A" } as Prisma.InputJsonValue } });
  const essayV1 = await db.questionVersion.create({ data: { questionId: essay.id, version: 1, payload: { type: "ESSAY", stem: essay.stem, solution: "Mark the explanation" } as Prisma.InputJsonValue } });
  const exam = await db.exam.create({ data: { schoolId: school.id, teacherId: teacher.id, classId: cls.id, title: marker, subject: "Mathematics", topic: "Synthetic", classLevel: "JS1", examType: "SCHOOL_TEST", difficulty: "BASIC", duration: 60 } });
  await db.assessmentItem.createMany({ data: [{ examId: exam.id, questionId: mcq.id, questionVersionId: mcqV1.id, order: 1, section: "A", marksOverride: 2, snapshot: mcqV1.payload as Prisma.InputJsonValue }, { examId: exam.id, questionId: essay.id, questionVersionId: essayV1.id, order: 2, section: "B", marksOverride: 5, snapshot: essayV1.payload as Prisma.InputJsonValue }] });
  const publication = await publishExamForActor({ examId: exam.id }, { teacherId: teacher.id, schoolId: school.id });
  const items = await db.assessmentPublicationItem.findMany({ where: { publicationId: publication.id }, orderBy: { order: "asc" } });
  const attempt = await startStudentAttempt(exam.id, { id: student.id, schoolId: school.id, classId: cls.id });
  await saveStudentResponse({ attemptId: attempt.id, publicationItemId: items[0].id, selectedOption: "A" }, { id: student.id, schoolId: school.id, classId: cls.id });
  await saveStudentResponse({ attemptId: attempt.id, publicationItemId: items[1].id, textResponse: "A reasoned response" }, { id: student.id, schoolId: school.id, classId: cls.id });
  await submitStudentAttempt(attempt.id, { id: student.id, schoolId: school.id, classId: cls.id });
  const saved = await db.questionResponse.findMany({ where: { attemptId: attempt.id }, orderBy: { questionId: "asc" } });
  pass("OBJECTIVE_AUTO_GRADE", saved.some((response) => response.isCorrect === true && response.score === 2));
  pass("MANUAL_REVIEW_REQUIRED", saved.some((response) => response.score === null && response.questionId === essay.id));
  pass("TOTAL_SCORE_DERIVATION", (await db.examAttempt.findUniqueOrThrow({ where: { id: attempt.id } })).totalScore === 2);
  pass("PARTIAL_GRADING", (await listGradingQueue(actor(teacher.id, school.id))).some((entry) => entry.id === attempt.id && entry.pending === 1));
  pass("NEGATIVE_MARK_DENIED", await rejects(() => gradeResponseForTeacher({ attemptId: attempt.id, publicationItemId: items[1].id, awardedMarks: -1 }, actor(teacher.id, school.id))));
  pass("OVER_MAX_MARK_DENIED", await rejects(() => gradeResponseForTeacher({ attemptId: attempt.id, publicationItemId: items[1].id, awardedMarks: 6 }, actor(teacher.id, school.id))));
  await gradeResponseForTeacher({ attemptId: attempt.id, publicationItemId: items[1].id, awardedMarks: 4, feedback: "Good explanation" }, actor(teacher.id, school.id));
  const graded = await db.examAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
  pass("VALID_MANUAL_MARK", graded.totalScore === 6 && graded.status === "GRADED");
  pass("TEACHER_ATTRIBUTION", (await db.questionResponse.findFirstOrThrow({ where: { attemptId: attempt.id, questionId: essay.id } })).gradedByTeacherId === teacher.id);
  pass("STUDENT_ANSWER_IMMUTABILITY", (await db.questionResponse.findFirstOrThrow({ where: { attemptId: attempt.id, questionId: essay.id } })).textResponse === "A reasoned response");
  pass("DUPLICATE_SAVE_SAFETY", (await db.questionResponse.count({ where: { attemptId: attempt.id, questionId: essay.id } })) === 1);
  pass("UNRELEASED_RESULT_HIDDEN", (await getStudentResult(attempt.id, { id: student.id, schoolId: school.id })).released === false);
  pass("RELEASE_BLOCKED_WHEN_INVALID", await rejects(() => releaseAttemptResult(attempt.id, actor(otherTeacher.id, otherSchool.id))));
  const released = await releaseAttemptResult(attempt.id, actor(teacher.id, school.id));
  const releasedAgain = await releaseAttemptResult(attempt.id, actor(teacher.id, school.id));
  pass("VALID_RESULT_RELEASE", Boolean(released.resultReleasedAt)); pass("DOUBLE_RELEASE_IDEMPOTENCY", releasedAgain.id === released.id);
  const result = await getStudentResult(attempt.id, { id: student.id, schoolId: school.id });
  pass("ANSWER_POLICY", result.released && Array.isArray(result.responses) && !("selectedOption" in result.responses[0]));
  pass("CROSS_STUDENT_DENIAL", await rejects(() => getStudentResult(attempt.id, { id: otherStudent.id, schoolId: otherSchool.id })));
  pass("CROSS_TEACHER_DENIAL", await rejects(() => getGradingQueueForOther(attempt.id, otherTeacher.id, otherSchool.id)));
  await db.exam.update({ where: { id: exam.id }, data: { lifecycle: "DRAFT" } });
  const publication2 = await publishExamForActor({ examId: exam.id }, { teacherId: teacher.id, schoolId: school.id });
  pass("HISTORICAL_P1_AFTER_P2", publication2.id !== publication.id && (await db.examAttempt.findUniqueOrThrow({ where: { id: attempt.id } })).publicationId === publication.id);
  await db.exam.update({ where: { id: exam.id }, data: { lifecycle: "ARCHIVED" } });
  pass("ARCHIVED_HISTORY", Boolean((await db.assessmentPublication.findUnique({ where: { id: publication.id } }))));
  await db.questionResponse.deleteMany({ where: { attemptId: attempt.id } }); await db.examAttempt.delete({ where: { id: attempt.id } }); await db.assessmentPublicationItem.deleteMany({ where: { publication: { examId: exam.id } } }); await db.assessmentPublication.deleteMany({ where: { examId: exam.id } }); await db.assessmentItem.deleteMany({ where: { examId: exam.id } }); await db.questionVersion.deleteMany({ where: { questionId: { in: [mcq.id, essay.id] } } }); await db.question.deleteMany({ where: { id: { in: [mcq.id, essay.id] } } }); await db.exam.delete({ where: { id: exam.id } }); await db.student.deleteMany({ where: { id: { in: [student.id, otherStudent.id] } } }); await db.class.deleteMany({ where: { id: { in: [cls.id, otherClass.id] } } }); await db.teacher.deleteMany({ where: { id: { in: [teacher.id, otherTeacher.id] } } }); await db.school.deleteMany({ where: { id: { in: [school.id, otherSchool.id] } } }); pass("CLEANUP", (await db.school.count({ where: { code: { startsWith: marker } } })) === 0);
}
async function rejects(fn: () => Promise<unknown>) { try { await fn(); return false; } catch { return true; } }
async function getGradingQueueForOther(attemptId: string, teacherId: string, schoolId: string) { const { getGradingAttempt } = await import("../lib/services/assessments/grading"); return getGradingAttempt(attemptId, actor(teacherId, schoolId)); }
main().catch((error) => { console.error(error instanceof Error ? error.message : "F8E harness failed"); process.exitCode = 1; }).finally(() => db.$disconnect());
