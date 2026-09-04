import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  Prisma,
  PrismaClient,
  QuestionType,
  type Question,
} from "@prisma/client";

const APPROVED_PROJECT = "wxgnufdacfncwxbedzap";
const PROTECTED_PROJECT = "cnodlvmgdueykdriiati";
const EXPECTED_QUESTION_TYPES = [
  "MCQ",
  "SHORT_ANSWER",
  "ESSAY",
  "STRUCTURED",
  "CALCULATION",
] as const;

if (process.env.NODE_ENV !== "test") {
  throw new Error("F6B harness requires NODE_ENV=test");
}

const envLine = readFileSync(new URL("../../../packages/database/.env", import.meta.url), "utf8")
  .split(/\r?\n/)
  .find((line) => line.startsWith("DATABASE_URL="));
const rawUrl = process.env.DATABASE_URL?.trim() || envLine?.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, "") || "";
const databaseUrl = new URL(rawUrl);
if (
  !databaseUrl.username.includes(APPROVED_PROJECT) ||
  databaseUrl.href.includes(PROTECTED_PROJECT) ||
  databaseUrl.port !== "5432" ||
  databaseUrl.pathname !== "/postgres"
) {
  throw new Error("F6B harness refuses non-Development target");
}
process.env.DATABASE_URL = rawUrl;

const db = new PrismaClient();
const MARKER_PREFIX = "F6B1_SYNTH_";
const token = `F6B1_SYNTH_${Date.now()}_${randomUUID().slice(0, 8)}`;
const results = new Map<string, "PASS" | "FAIL">();

type VersionPayload = {
  type: string;
  stem: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  optionE: string | null;
  correctOption: string | null;
  solution: string;
  explanation: string;
  markScheme: string | null;
};

function pass(name: string, condition: boolean, detail?: string): void {
  results.set(name, condition ? "PASS" : "FAIL");
  if (!condition) throw new Error(`${name}:FAIL${detail ? ` (${detail})` : ""}`);
}

function payloadFor(question: Question, overrides: Partial<VersionPayload> = {}): VersionPayload {
  return {
    type: question.type,
    stem: question.stem,
    optionA: question.optionA,
    optionB: question.optionB,
    optionC: question.optionC,
    optionD: question.optionD,
    optionE: question.optionE,
    correctOption: question.correctOption,
    solution: question.solution,
    explanation: question.explanation,
    markScheme: question.markScheme,
    ...overrides,
  };
}

async function connectWithRetry(): Promise<void> {
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

async function backfillLegacyQuestion(questionId: string) {
  return db.$transaction(async (tx) => {
    const question = await tx.question.findUniqueOrThrow({ where: { id: questionId } });
    if (!question.examId) throw new Error("Legacy backfill fixture has no examId");

    const version = await tx.questionVersion.upsert({
      where: { questionId_version: { questionId, version: 1 } },
      update: {},
      create: {
        id: `f6v_${question.id}`,
        questionId,
        version: 1,
        payload: payloadFor(question) as Prisma.InputJsonValue,
      },
    });

    const existingItem = await tx.assessmentItem.findFirst({
      where: { examId: question.examId, questionId },
    });
    const item =
      existingItem ??
      (await tx.assessmentItem.create({
        data: {
          id: `f6i_${question.id}`,
          examId: question.examId,
          questionId,
          questionVersionId: version.id,
          order: question.number,
          section: question.section,
          marksOverride: question.defaultMarks,
          snapshot: payloadFor(question) as Prisma.InputJsonValue,
        },
      }));

    return { question, version, item };
  }, { maxWait: 30_000, timeout: 30_000 });
}

async function cleanupSynthetic(marker = token): Promise<Record<string, number>> {
  const schools = await db.school.findMany({
    where: { code: { startsWith: marker } },
    select: { id: true },
  });
  const schoolIds = schools.map(({ id }) => id);
  const exams = await db.exam.findMany({
    where: { title: { startsWith: marker } },
    select: { id: true },
  });
  const examIds = exams.map(({ id }) => id);
  const questions = await db.question.findMany({
    where: { stem: { startsWith: marker } },
    select: { id: true },
  });
  const questionIds = questions.map(({ id }) => id);
  const attempts = await db.examAttempt.findMany({
    where: { examId: { in: examIds } },
    select: { id: true },
  });
  const attemptIds = attempts.map(({ id }) => id);

  await db.$transaction([
    db.questionResponse.deleteMany({ where: { attemptId: { in: attemptIds } } }),
    db.assessmentItem.deleteMany({ where: { OR: [{ examId: { in: examIds } }, { questionId: { in: questionIds } }] } }),
    db.examAttempt.deleteMany({ where: { id: { in: attemptIds } } }),
    db.questionTag.deleteMany({ where: { questionId: { in: questionIds } } }),
    db.questionVersion.deleteMany({ where: { questionId: { in: questionIds } } }),
    db.question.deleteMany({ where: { id: { in: questionIds } } }),
    db.exam.deleteMany({ where: { id: { in: examIds } } }),
    db.studentProfile.deleteMany({ where: { schoolId: { in: schoolIds } } }),
    db.student.deleteMany({ where: { schoolId: { in: schoolIds } } }),
    db.class.deleteMany({ where: { schoolId: { in: schoolIds } } }),
    db.teacher.deleteMany({ where: { schoolId: { in: schoolIds } } }),
    db.school.deleteMany({ where: { id: { in: schoolIds } } }),
  ]);

  const [schoolCount, teacherCount, examCount, questionCount, versionCount, itemCount, responseCount] =
    await Promise.all([
      db.school.count({ where: { code: { startsWith: marker } } }),
      db.teacher.count({ where: { clerkId: { startsWith: marker } } }),
      db.exam.count({ where: { title: { startsWith: marker } } }),
      db.question.count({ where: { stem: { startsWith: marker } } }),
      db.questionVersion.count({ where: { questionId: { in: questionIds } } }),
      db.assessmentItem.count({ where: { OR: [{ examId: { in: examIds } }, { questionId: { in: questionIds } }] } }),
      db.questionResponse.count({ where: { attemptId: { in: attemptIds } } }),
    ]);

  return { schoolCount, teacherCount, examCount, questionCount, versionCount, itemCount, responseCount };
}

async function main(): Promise<void> {
  await connectWithRetry();
  const staleCleanup = await cleanupSynthetic(MARKER_PREFIX);
  pass("STALE_SYNTHETIC_CLEANUP", Object.values(staleCleanup).every((count) => count === 0));
  pass("SYNTHETIC_SCOPE_EMPTY", (await db.school.count({ where: { code: { startsWith: token } } })) === 0);

  const schoolA = await db.school.create({
    data: { name: `${token} School A`, code: `${token}_A`, state: "Synthetic" },
  });
  const schoolB = await db.school.create({
    data: { name: `${token} School B`, code: `${token}_B`, state: "Synthetic" },
  });
  const teacherA = await db.teacher.create({
    data: {
      schoolId: schoolA.id,
      clerkId: `${token}_teacher_a`,
      firstName: "Synthetic",
      lastName: "Teacher A",
      email: `${token.toLowerCase()}_a@invalid.test`,
      subjects: ["Mathematics"],
      classLevels: ["JS1"],
    },
  });
  const teacherB = await db.teacher.create({
    data: {
      schoolId: schoolB.id,
      clerkId: `${token}_teacher_b`,
      firstName: "Synthetic",
      lastName: "Teacher B",
      email: `${token.toLowerCase()}_b@invalid.test`,
      subjects: ["Mathematics"],
      classLevels: ["JS1"],
    },
  });
  const classA = await db.class.create({
    data: { schoolId: schoolA.id, name: `${token} JS1`, level: "JS1", session: "2099/2100" },
  });
  const studentA = await db.student.create({
    data: {
      schoolId: schoolA.id,
      classId: classA.id,
      firstName: "Synthetic",
      lastName: "Student",
      regNumber: `${token}_student`,
    },
  });

  const examData = {
    schoolId: schoolA.id,
    teacherId: teacherA.id,
    classId: classA.id,
    subject: "Mathematics",
    topic: "Synthetic reusable questions",
    classLevel: "JS1" as const,
    examType: "SCHOOL_TEST" as const,
    difficulty: "BASIC" as const,
  };
  const examA = await db.exam.create({ data: { ...examData, title: `${token} Assessment A` } });
  const examB = await db.exam.create({ data: { ...examData, title: `${token} Assessment B` } });
  const legacyExam = await db.exam.create({ data: { ...examData, title: `${token} Legacy Assessment` } });

  // Resolve the trusted actor first and deliberately ignore a forged Teacher B value.
  const untrustedCreatedByTeacherId = teacherB.id;
  const authenticatedActor = await db.teacher.findFirstOrThrow({
    where: { id: teacherA.id, schoolId: schoolA.id },
  });
  const reusableQuestion = await db.question.create({
    data: {
      schoolId: authenticatedActor.schoolId,
      createdByTeacherId: authenticatedActor.id,
      lifecycle: "APPROVED",
      sourceKind: "TEACHER",
      visibility: "SCHOOL",
      defaultMarks: 2,
      section: "A",
      number: 1,
      type: "MCQ",
      stem: `${token} Version 1: What is 2 + 2?`,
      optionA: "4",
      optionB: "5",
      optionC: "6",
      optionD: "7",
      correctOption: "A",
      solution: "2 + 2 = 4",
      explanation: "Addition gives four.",
      relatedChunkIds: [],
    },
  });
  pass("QUESTION_CREATE", Boolean(reusableQuestion.id));
  pass(
    "QUESTION_TEACHER_ATTRIBUTION",
    untrustedCreatedByTeacherId !== authenticatedActor.id &&
      reusableQuestion.createdByTeacherId === authenticatedActor.id,
  );

  const versionOnePayload = payloadFor(reusableQuestion);
  const versionOne = await db.questionVersion.create({
    data: {
      questionId: reusableQuestion.id,
      version: 1,
      payload: versionOnePayload as Prisma.InputJsonValue,
    },
  });
  pass("INITIAL_VERSION", versionOne.questionId === reusableQuestion.id && versionOne.version === 1);

  const itemA = await db.assessmentItem.create({
    data: {
      examId: examA.id,
      questionId: reusableQuestion.id,
      questionVersionId: versionOne.id,
      order: 1,
      section: "A",
      marksOverride: 2,
      snapshot: versionOnePayload as Prisma.InputJsonValue,
    },
  });
  const versionTwoPayload: VersionPayload = {
    ...versionOnePayload,
    stem: `${token} Version 2: What is 3 + 3?`,
    optionA: "5",
    optionB: "6",
    optionC: "7",
    optionD: "8",
    correctOption: "B",
    solution: "3 + 3 = 6",
    explanation: "The edited version sums to six.",
  };
  const versionTwo = await db.questionVersion.create({
    data: {
      questionId: reusableQuestion.id,
      version: 2,
      payload: versionTwoPayload as Prisma.InputJsonValue,
    },
  });
  const itemB = await db.assessmentItem.create({
    data: {
      examId: examB.id,
      questionId: reusableQuestion.id,
      questionVersionId: versionTwo.id,
      order: 1,
      section: "A",
      marksOverride: 5,
      snapshot: versionTwoPayload as Prisma.InputJsonValue,
    },
  });

  const reuseItems = await db.assessmentItem.findMany({
    where: { questionId: reusableQuestion.id },
    orderBy: { marksOverride: "asc" },
  });
  pass(
    "QUESTION_REUSE",
    reuseItems.length === 2 && new Set(reuseItems.map(({ questionId }) => questionId)).size === 1,
  );
  pass(
    "ASSESSMENT_SPECIFIC_MARKS",
    reuseItems[0]?.marksOverride === 2 && reuseItems[1]?.marksOverride === 5 && reusableQuestion.defaultMarks === 2,
  );
  pass(
    "VERSION_PINNING",
    itemA.questionVersionId === versionOne.id && itemB.questionVersionId === versionTwo.id,
  );

  const attempt = await db.examAttempt.create({
    data: {
      studentId: studentA.id,
      examId: examA.id,
      schoolId: schoolA.id,
      status: "GRADED",
      totalScore: 2,
      maxScore: 2,
      percentage: 100,
      grade: "A",
      questionsAnswered: 1,
      submittedAt: new Date(),
      gradedAt: new Date(),
    },
  });
  const response = await db.questionResponse.create({
    data: {
      attemptId: attempt.id,
      questionId: reusableQuestion.id,
      selectedOption: "A",
      isCorrect: true,
      score: 2,
      maxScore: 2,
    },
  });
  const historicalItem = await db.assessmentItem.findUniqueOrThrow({
    where: { id: itemA.id },
    include: { questionVersion: true },
  });
  const historicalPayload = historicalItem.questionVersion.payload as VersionPayload;
  pass(
    "HISTORICAL_IMMUTABILITY",
    historicalPayload.stem === versionOnePayload.stem &&
      historicalPayload.correctOption === "A" &&
      historicalItem.marksOverride === 2 &&
      response.isCorrect === true &&
      response.score === 2,
  );

  await db.question.update({ where: { id: reusableQuestion.id }, data: { lifecycle: "ARCHIVED" } });
  const readableResponse = await db.questionResponse.findUnique({
    where: { attemptId_questionId: { attemptId: attempt.id, questionId: reusableQuestion.id } },
    include: { question: true },
  });
  pass(
    "RESPONSE_FK_INTEGRITY",
    readableResponse?.questionId === reusableQuestion.id && readableResponse.question.lifecycle === "ARCHIVED",
  );
  pass(
    "ARCHIVE_USED",
    (await db.question.findUnique({ where: { id: reusableQuestion.id } }))?.lifecycle === "ARCHIVED",
  );

  const unusedQuestion = await db.question.create({
    data: {
      schoolId: schoolA.id,
      createdByTeacherId: teacherA.id,
      lifecycle: "DRAFT",
      sourceKind: "TEACHER",
      visibility: "PRIVATE",
      section: "A",
      number: 2,
      type: "SHORT_ANSWER",
      stem: `${token} Unused question`,
      solution: "Synthetic",
      explanation: "Synthetic",
      relatedChunkIds: [],
    },
  });
  await db.question.update({ where: { id: unusedQuestion.id }, data: { lifecycle: "ARCHIVED" } });
  pass(
    "ARCHIVE_UNUSED",
    (await db.question.findUnique({ where: { id: unusedQuestion.id } }))?.lifecycle === "ARCHIVED",
  );

  let deleteRestricted = false;
  try {
    await db.question.delete({ where: { id: reusableQuestion.id } });
  } catch (error) {
    deleteRestricted =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2003" || error.code === "P2014");
  }
  pass(
    "DELETE_RESTRICTION",
    deleteRestricted && Boolean(await db.question.findUnique({ where: { id: reusableQuestion.id } })),
  );

  const schoolAView = await db.question.findFirst({
    where: { id: reusableQuestion.id, OR: [{ schoolId: schoolA.id }, { visibility: "SYSTEM" }] },
  });
  const schoolBView = await db.question.findFirst({
    where: { id: reusableQuestion.id, OR: [{ schoolId: schoolB.id }, { visibility: "SYSTEM" }] },
  });
  pass("QUESTION_SCHOOL_ISOLATION", Boolean(schoolAView) && schoolBView === null);

  let duplicateRejected = false;
  try {
    await db.assessmentItem.create({
      data: {
        examId: examA.id,
        questionId: reusableQuestion.id,
        questionVersionId: versionOne.id,
        order: itemA.order,
        section: "A",
        marksOverride: 2,
      },
    });
  } catch (error) {
    duplicateRejected = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
  pass(
    "ASSESSMENT_ITEM_DUPLICATE_SAFETY",
    duplicateRejected &&
      (await db.assessmentItem.count({
        where: { examId: examA.id, questionId: reusableQuestion.id, questionVersionId: versionOne.id },
      })) === 1,
  );

  const legacyQuestion = await db.question.create({
    data: {
      examId: legacyExam.id,
      schoolId: schoolA.id,
      createdByTeacherId: teacherA.id,
      defaultMarks: 3,
      section: "B",
      number: 7,
      type: "MCQ",
      stem: `${token} Legacy question`,
      optionA: "Legacy A",
      optionB: "Legacy B",
      optionC: "Legacy C",
      optionD: "Legacy D",
      correctOption: "B",
      solution: "Legacy B",
      explanation: "Legacy explanation",
      relatedChunkIds: [],
    },
  });
  const firstBackfill = await backfillLegacyQuestion(legacyQuestion.id);
  const secondBackfill = await backfillLegacyQuestion(legacyQuestion.id);
  const legacyVersions = await db.questionVersion.findMany({ where: { questionId: legacyQuestion.id } });
  const legacyItems = await db.assessmentItem.findMany({
    where: { examId: legacyExam.id, questionId: legacyQuestion.id },
  });
  const legacyPayload = firstBackfill.version.payload as VersionPayload;
  pass(
    "LEGACY_BACKFILL",
    firstBackfill.question.id === legacyQuestion.id &&
      firstBackfill.item.order === 7 &&
      firstBackfill.item.section === "B" &&
      firstBackfill.item.marksOverride === 3 &&
      legacyPayload.correctOption === "B",
  );
  pass(
    "BACKFILL_IDEMPOTENCY",
    firstBackfill.version.id === secondBackfill.version.id &&
      firstBackfill.item.id === secondBackfill.item.id &&
      legacyVersions.length === 1 &&
      legacyItems.length === 1,
  );

  const actualQuestionTypes = Object.values(QuestionType).sort();
  const expectedQuestionTypes = [...EXPECTED_QUESTION_TYPES].sort();
  const typeContractMatches =
    actualQuestionTypes.length === expectedQuestionTypes.length &&
    actualQuestionTypes.every((value, index) => value === expectedQuestionTypes[index]);
  results.set("QUESTIONTYPE_CONTRACT", typeContractMatches ? "PASS" : "FAIL");
  if (!typeContractMatches) {
    console.error(
      `QUESTIONTYPE_CONTRACT_MISMATCH expected=${expectedQuestionTypes.join(",")} actual=${actualQuestionTypes.join(",")}`,
    );
  }
}

async function run(): Promise<void> {
  let executionError: unknown;
  try {
    await main();
  } catch (error) {
    executionError = error;
    console.error(error);
  } finally {
    try {
      const cleanupCounts = await cleanupSynthetic();
      const cleaned = Object.values(cleanupCounts).every((count) => count === 0);
      results.set("CLEANUP", cleaned ? "PASS" : "FAIL");
      console.log(`F6B_CLEANUP:${cleaned ? "PASS" : "FAIL"} ${JSON.stringify(cleanupCounts)}`);
    } catch (cleanupError) {
      results.set("CLEANUP", "FAIL");
      console.error("F6B cleanup failed", cleanupError);
      executionError ??= cleanupError;
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
