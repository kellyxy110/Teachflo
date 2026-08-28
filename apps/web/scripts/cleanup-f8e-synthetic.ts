import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const schools = await db.school.findMany({ where: { code: { startsWith: "F8E_SYNTH_" } }, select: { id: true } });
  const schoolIds = schools.map((row) => row.id);
  if (!schoolIds.length) return;
  const exams = await db.exam.findMany({ where: { schoolId: { in: schoolIds } }, select: { id: true } });
  const examIds = exams.map((row) => row.id);
  const attempts = await db.examAttempt.findMany({ where: { schoolId: { in: schoolIds } }, select: { id: true } });
  const attemptIds = attempts.map((row) => row.id);
  await db.questionResponse.deleteMany({ where: { attemptId: { in: attemptIds } } });
  await db.examAttempt.deleteMany({ where: { id: { in: attemptIds } } });
  await db.assessmentPublicationItem.deleteMany({ where: { publication: { examId: { in: examIds } } } });
  await db.assessmentPublication.deleteMany({ where: { examId: { in: examIds } } });
  await db.assessmentItem.deleteMany({ where: { examId: { in: examIds } } });
  await db.score.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await db.assessmentComponent.deleteMany({ where: { schoolId: { in: schoolIds } } });
  const teachers = await db.teacher.findMany({ where: { schoolId: { in: schoolIds } }, select: { id: true } });
  const teacherIds = teachers.map((row) => row.id);
  await db.questionVersion.deleteMany({ where: { question: { schoolId: { in: schoolIds } } } });
  await db.question.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await db.exam.deleteMany({ where: { id: { in: examIds } } });
  await db.student.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await db.class.deleteMany({ where: { schoolId: { in: schoolIds } } });
  await db.teacher.deleteMany({ where: { id: { in: teacherIds } } });
  await db.school.deleteMany({ where: { id: { in: schoolIds } } });
  console.log("F8E_SYNTHETIC_CLEANUP:PASS");
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "cleanup failed"); process.exitCode = 1; }).finally(() => db.$disconnect());
