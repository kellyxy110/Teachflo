import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient, type Question } from "@prisma/client";

const APPROVED_PROJECT = "wxgnufdacfncwxbedzap";
const PROTECTED_PROJECT = "cnodlvmgdueykdriiati";
const rawUrl = process.env.DATABASE_URL ?? "";
const databaseUrl = new URL(rawUrl);

if (process.env.NODE_ENV !== "test") throw new Error("F6C harness requires NODE_ENV=test");
if (
  !databaseUrl.username.includes(APPROVED_PROJECT) ||
  databaseUrl.href.includes(PROTECTED_PROJECT) ||
  databaseUrl.port !== "5432" ||
  databaseUrl.pathname !== "/postgres"
) {
  throw new Error("F6C harness refuses non-Development target");
}

const db = new PrismaClient();
const marker = `F6C_SYNTH_${Date.now()}_${randomUUID().slice(0, 8)}`;
const results = new Map<string, "PASS" | "FAIL">();

function pass(name: string, condition: boolean): void {
  results.set(name, condition ? "PASS" : "FAIL");
  if (!condition) throw new Error(`${name}:FAIL`);
}

function versionPayload(question: Question, stem = question.stem) {
  return {
    type: question.type,
    stem,
    optionA: question.optionA,
    optionB: question.optionB,
    optionC: question.optionC,
    optionD: question.optionD,
    optionE: question.optionE,
    correctOption: question.correctOption,
    solution: question.solution,
    explanation: question.explanation,
    markScheme: question.markScheme,
  };
}

async function connectWithRetry() {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await db.$connect();
      await db.$queryRaw`SELECT 1`;
      return;
    } catch (error) {
      lastError = error;
      await db.$disconnect().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw lastError;
}

async function cleanup() {
  const schools = await db.school.findMany({ where: { code: { startsWith: marker } }, select: { id: true } });
  const schoolIds = schools.map(({ id }) => id);
  const exams = await db.exam.findMany({ where: { title: { startsWith: marker } }, select: { id: true } });
  const examIds = exams.map(({ id }) => id);
  const questions = await db.question.findMany({ where: { stem: { startsWith: marker } }, select: { id: true } });
  const questionIds = questions.map(({ id }) => id);
  const attempts = await db.examAttempt.findMany({ where: { examId: { in: examIds } }, select: { id: true } });
  const attemptIds = attempts.map(({ id }) => id);

  await db.$transaction([
    db.questionResponse.deleteMany({ where: { attemptId: { in: attemptIds } } }),
    db.assessmentItem.deleteMany({ where: { OR: [{ examId: { in: examIds } }, { questionId: { in: questionIds } }] } }),
    db.examAttempt.deleteMany({ where: { id: { in: attemptIds } } }),
    db.questionVersion.deleteMany({ where: { questionId: { in: questionIds } } }),
    db.question.deleteMany({ where: { id: { in: questionIds } } }),
    db.exam.deleteMany({ where: { id: { in: examIds } } }),
    db.student.deleteMany({ where: { schoolId: { in: schoolIds } } }),
    db.class.deleteMany({ where: { schoolId: { in: schoolIds } } }),
    db.teacher.deleteMany({ where: { schoolId: { in: schoolIds } } }),
    db.school.deleteMany({ where: { id: { in: schoolIds } } }),
  ]);

  const remaining = await Promise.all([
    db.school.count({ where: { code: { startsWith: marker } } }),
    db.teacher.count({ where: { clerkId: { startsWith: marker } } }),
    db.exam.count({ where: { title: { startsWith: marker } } }),
    db.question.count({ where: { stem: { startsWith: marker } } }),
    db.questionVersion.count({ where: { questionId: { in: questionIds } } }),
    db.assessmentItem.count({ where: { OR: [{ examId: { in: examIds } }, { questionId: { in: questionIds } }] } }),
    db.questionResponse.count({ where: { attemptId: { in: attemptIds } } }),
  ]);
  return remaining.every((count) => count === 0);
}

async function main() {
  await connectWithRetry();
  const { setAuthServiceForTests } = await import("@/lib/auth/service");
  const { addQuestionsToAssessment, getQuestionBankWorkspace } = await import("@/app/actions/question-bank");
  let authUser: string | null = null;
  setAuthServiceForTests({
    getSession: async () => ({ userId: authUser, sessionId: null, sessionClaims: {} }),
    getCurrentUser: async () => null,
    setUserMetadata: async () => undefined,
  });

  try {
    const schoolA = await db.school.create({ data: { name: `${marker} School A`, code: `${marker}_A`, state: "Synthetic" } });
    const schoolB = await db.school.create({ data: { name: `${marker} School B`, code: `${marker}_B`, state: "Synthetic" } });
    const teacherA = await db.teacher.create({ data: { schoolId: schoolA.id, clerkId: `${marker}_teacher_a`, firstName: "Synthetic", lastName: "Teacher A", email: `${marker.toLowerCase()}_a@invalid.test`, subjects: ["Mathematics"], classLevels: ["JS1"] } });
    const teacherB = await db.teacher.create({ data: { schoolId: schoolB.id, clerkId: `${marker}_teacher_b`, firstName: "Synthetic", lastName: "Teacher B", email: `${marker.toLowerCase()}_b@invalid.test`, subjects: ["Mathematics"], classLevels: ["JS1"] } });
    const classA = await db.class.create({ data: { schoolId: schoolA.id, name: `${marker} JS1 A`, level: "JS1", session: "2099/2100" } });
    const classB = await db.class.create({ data: { schoolId: schoolB.id, name: `${marker} JS1 B`, level: "JS1", session: "2099/2100" } });
    const studentA = await db.student.create({ data: { schoolId: schoolA.id, classId: classA.id, firstName: "Synthetic", lastName: "Student", regNumber: `${marker}_student` } });
    const examBaseA = { schoolId: schoolA.id, teacherId: teacherA.id, classId: classA.id, subject: "Mathematics", topic: "Reusable questions", classLevel: "JS1" as const, examType: "SCHOOL_TEST" as const, difficulty: "BASIC" as const };
    const examA = await db.exam.create({ data: { ...examBaseA, title: `${marker} Assessment A` } });
    const examA2 = await db.exam.create({ data: { ...examBaseA, title: `${marker} Assessment B` } });
    const examA3 = await db.exam.create({ data: { ...examBaseA, title: `${marker} Assessment C` } });
    const completedExam = await db.exam.create({ data: { ...examBaseA, title: `${marker} Completed Assessment` } });
    const examB = await db.exam.create({ data: { schoolId: schoolB.id, teacherId: teacherB.id, classId: classB.id, title: `${marker} School B Assessment`, subject: "Mathematics", topic: "Private", classLevel: "JS1", examType: "SCHOOL_TEST", difficulty: "BASIC" } });
    await db.examAttempt.create({ data: { studentId: studentA.id, examId: completedExam.id, schoolId: schoolA.id, status: "GRADED", totalScore: 0, maxScore: 1, percentage: 0, grade: "F", submittedAt: new Date(), gradedAt: new Date() } });

    async function createQuestion(index: number, schoolId: string, teacherId: string, visibility: "PRIVATE" | "SCHOOL" = "SCHOOL") {
      const question = await db.question.create({
        data: {
          schoolId,
          createdByTeacherId: teacherId,
          lifecycle: "APPROVED",
          sourceKind: "TEACHER",
          visibility,
          defaultMarks: index + 1,
          section: "A",
          number: index,
          type: "MCQ",
          stem: `${marker} Question ${index}`,
          optionA: "Correct",
          optionB: "Incorrect",
          correctOption: "A",
          solution: "Correct",
          explanation: "Synthetic reusable question",
          relatedChunkIds: [],
        },
      });
      const version = await db.questionVersion.create({ data: { questionId: question.id, version: 1, payload: versionPayload(question) as Prisma.InputJsonValue } });
      return { question, version };
    }

    const q1 = await createQuestion(1, schoolA.id, teacherA.id);
    const q2 = await createQuestion(2, schoolA.id, teacherA.id, "PRIVATE");
    const q3 = await createQuestion(3, schoolA.id, teacherA.id);
    const qB = await createQuestion(4, schoolB.id, teacherB.id, "PRIVATE");

    authUser = teacherA.clerkId;
    const workspace = await getQuestionBankWorkspace();
    const readableIds = new Set(workspace.questions.map(({ id }) => id));
    pass("QUESTION_BANK_READ", readableIds.has(q1.question.id) && readableIds.has(q2.question.id) && readableIds.has(q3.question.id) && !readableIds.has(qB.question.id));
    pass("SELECT_QUESTION", workspace.questions.find(({ id }) => id === q1.question.id)?.selectable === true);
    pass("ASSESSMENT_CHOOSER", workspace.assessments.some(({ id }) => id === examA.id) && !workspace.assessments.some(({ id }) => id === completedExam.id || id === examB.id));

    const addOne = await addQuestionsToAssessment({ assessmentId: examA.id, questions: [{ questionId: q1.question.id }] });
    pass("ADD_ONE_QUESTION", addOne.ok && addOne.added === 1 && addOne.skipped === 0);
    const firstItem = await db.assessmentItem.findFirstOrThrow({ where: { examId: examA.id, questionId: q1.question.id } });
    pass("DEFAULT_MARKS", firstItem.marksOverride === q1.question.defaultMarks);

    const addMultiple = await addQuestionsToAssessment({ assessmentId: examA.id, questions: [{ questionId: q2.question.id }, { questionId: q3.question.id }] });
    pass("ADD_MULTIPLE_QUESTIONS", addMultiple.ok && addMultiple.added === 2);
    const orderedItems = await db.assessmentItem.findMany({ where: { examId: examA.id }, orderBy: { order: "asc" } });
    pass("ORDER", orderedItems.map(({ questionId }) => questionId).join(",") === [q1.question.id, q2.question.id, q3.question.id].join(","));

    const override = await addQuestionsToAssessment({ assessmentId: examA2.id, questions: [{ questionId: q1.question.id, marks: 5 }] });
    const overrideItem = await db.assessmentItem.findFirstOrThrow({ where: { examId: examA2.id, questionId: q1.question.id } });
    pass("QUESTION_REUSE", override.ok && override.added === 1 && (await db.question.count({ where: { id: q1.question.id } })) === 1);
    pass("MARKS_OVERRIDE", overrideItem.marksOverride === 5 && q1.question.defaultMarks !== 5);

    const duplicateSubmission = await addQuestionsToAssessment({ assessmentId: examA.id, questions: [{ questionId: q1.question.id }] });
    pass("DUPLICATE_SUBMISSION", duplicateSubmission.ok && duplicateSubmission.added === 0 && duplicateSubmission.skipped === 1);
    const duplicateQuestion = await addQuestionsToAssessment({ assessmentId: examA.id, questions: [{ questionId: q2.question.id }, { questionId: q2.question.id }] });
    pass("DUPLICATE_QUESTION", duplicateQuestion.ok && duplicateQuestion.added === 0 && duplicateQuestion.skipped === 1);
    pass("RETRY_IDEMPOTENCY", (await db.assessmentItem.count({ where: { examId: examA.id } })) === 3);

    const versionTwo = await db.questionVersion.create({ data: { questionId: q1.question.id, version: 2, payload: versionPayload(q1.question, `${marker} Question 1 version 2`) as Prisma.InputJsonValue } });
    const addVersionTwo = await addQuestionsToAssessment({ assessmentId: examA3.id, questions: [{ questionId: q1.question.id }] });
    const itemV1 = await db.assessmentItem.findFirstOrThrow({ where: { examId: examA.id, questionId: q1.question.id }, include: { questionVersion: true } });
    const itemV2 = await db.assessmentItem.findFirstOrThrow({ where: { examId: examA3.id, questionId: q1.question.id }, include: { questionVersion: true } });
    pass("VERSION_PINNING", addVersionTwo.ok && itemV1.questionVersionId === q1.version.id && itemV2.questionVersionId === versionTwo.id);
    pass("HISTORICAL_IMMUTABILITY", (itemV1.questionVersion.payload as { stem: string }).stem === q1.question.stem && itemV1.marksOverride === q1.question.defaultMarks);

    const unauthorizedQuestion = await addQuestionsToAssessment({ assessmentId: examA.id, questions: [{ questionId: qB.question.id }] });
    pass("UNAUTHORIZED_QUESTION", !unauthorizedQuestion.ok);
    const unauthorizedAssessment = await addQuestionsToAssessment({ assessmentId: examB.id, questions: [{ questionId: q1.question.id }] });
    pass("UNAUTHORIZED_ASSESSMENT", !unauthorizedAssessment.ok);
    pass("CROSS_SCHOOL_QUESTION", !unauthorizedQuestion.ok && (await db.assessmentItem.count({ where: { examId: examA.id, questionId: qB.question.id } })) === 0);
    pass("CROSS_SCHOOL_ASSESSMENT", !unauthorizedAssessment.ok && (await db.assessmentItem.count({ where: { examId: examB.id } })) === 0);
    const immutable = await addQuestionsToAssessment({ assessmentId: completedExam.id, questions: [{ questionId: q1.question.id }] });
    pass("COMPLETED_ASSESSMENT_MUTATION", !immutable.ok && immutable.code === "ASSESSMENT_IMMUTABLE");
    const tampered = await addQuestionsToAssessment({ assessmentId: examA.id, teacherId: teacherB.id, schoolId: schoolB.id, questions: [{ questionId: q1.question.id }] });
    pass("TEACHER_ATTRIBUTION", !tampered.ok && (await db.assessmentItem.count({ where: { examId: examA.id } })) === 3);
  } finally {
    setAuthServiceForTests(null);
  }
}

async function run() {
  let executionError: unknown;
  try {
    await main();
  } catch (error) {
    executionError = error;
    console.error(error);
  } finally {
    try {
      const cleaned = await cleanup();
      results.set("CLEANUP", cleaned ? "PASS" : "FAIL");
      console.log(`F6C_CLEANUP:${cleaned ? "PASS" : "FAIL"}`);
    } catch (error) {
      executionError ??= error;
      results.set("CLEANUP", "FAIL");
      console.error("F6C cleanup failed", error);
    }
    await db.$disconnect();
  }
  console.log(JSON.stringify(Object.fromEntries(results), null, 2));
  if (executionError || [...results.values()].includes("FAIL")) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
