import { AttemptStatus, ExamType } from "@prisma/client";
import { db } from "@/lib/db";

type TeacherActor = { id: string; schoolId: string };

async function ownedExam(examId: string, actor: TeacherActor) {
  const exam = await db.exam.findFirst({ where: { id: examId, schoolId: actor.schoolId, teacherId: actor.id }, include: { class: true, publications: { orderBy: { version: "desc" }, take: 1, include: { items: true } } } });
  if (!exam) throw new Error("Assessment not found.");
  return exam;
}

export async function getAssessmentAnalytics(examId: string, actor: TeacherActor) {
  const exam = await ownedExam(examId, actor);
  const publication = exam.publications[0];
  if (!publication) throw new Error("No published assessment is available.");
  const attempts = await db.examAttempt.findMany({ where: { examId, publicationId: publication.id }, include: { student: true, responses: true }, orderBy: { submittedAt: "asc" } });
  const submitted = attempts.filter((attempt) => attempt.status !== "IN_PROGRESS");
  const graded = attempts.filter((attempt) => attempt.status === AttemptStatus.GRADED);
  const percentages = graded.map((attempt) => attempt.percentage).filter((value): value is number => value !== null).sort((a, b) => a - b);
  const totalMarks = publication.items.reduce((sum, item) => sum + item.marks, 0);
  const unanswered = publication.items.length * submitted.length - submitted.reduce((sum, attempt) => sum + attempt.responses.length, 0);
  const questionAnalytics = publication.items.map((item) => {
    const responses = submitted.map((attempt) => attempt.responses.find((response) => response.publicationItemId === item.id || response.questionId === item.questionId)).filter(Boolean);
    const objective = (item.snapshot && typeof item.snapshot === "object" && !Array.isArray(item.snapshot) ? (item.snapshot as Record<string, unknown>).type : null) === "MCQ";
    const correct = objective ? responses.filter((response) => response?.isCorrect === true).length : null;
    const awarded = responses.reduce((sum, response) => sum + (response?.score ?? 0), 0);
    return { id: item.id, order: item.order, marks: item.marks, responseCount: responses.length, correctCount: correct, incorrectCount: objective ? responses.filter((response) => response?.isCorrect === false).length : null, unansweredCount: submitted.length - responses.length, averageAwarded: responses.length ? Math.round((awarded / responses.length) * 100) / 100 : null, correctnessRate: objective && responses.length ? Math.round(((correct ?? 0) / responses.length) * 1000) / 10 : null };
  });
  return { exam: { id: exam.id, title: publication.title, subject: publication.subject, classLevel: publication.classLevel, className: exam.class?.name ?? null, publicationVersion: publication.version }, summary: { eligibleStudents: exam.class ? await db.student.count({ where: { classId: exam.class.id, schoolId: actor.schoolId } }) : 0, attemptsStarted: attempts.length, attemptsSubmitted: submitted.length, gradingComplete: graded.length, resultsReleased: attempts.filter((attempt) => Boolean(attempt.resultReleasedAt)).length, average: percentages.length ? Math.round((percentages.reduce((sum, value) => sum + value, 0) / percentages.length) * 10) / 10 : null, median: percentages.length ? percentages[Math.floor((percentages.length - 1) / 2)] : null, highest: percentages.length ? percentages[percentages.length - 1] : null, lowest: percentages.length ? percentages[0] : null, unansweredRate: submitted.length && publication.items.length ? Math.round((unanswered / (submitted.length * publication.items.length)) * 1000) / 10 : null, totalMarks, questionCount: publication.items.length }, students: attempts.map((attempt) => ({ attemptId: attempt.id, studentId: attempt.studentId, name: `${attempt.student.firstName} ${attempt.student.lastName}`, status: attempt.status, percentage: attempt.percentage, totalScore: attempt.totalScore, maxScore: attempt.maxScore, answered: attempt.responses.length, unanswered: publication.items.length - attempt.responses.length, released: Boolean(attempt.resultReleasedAt) })), questions: questionAnalytics };
}

export async function getScoreTransferPreview(examId: string, componentId: string, actor: TeacherActor) {
  const exam = await ownedExam(examId, actor);
  if (exam.examType !== ExamType.SCHOOL_TEST && exam.examType !== ExamType.SCHOOL_EXAM) throw new Error("This assessment type is not eligible for official score transfer.");
  if (!exam.classId || !exam.class) throw new Error("Assessment class context is required.");
  const component = await db.assessmentComponent.findFirst({ where: { id: componentId, schoolId: actor.schoolId, isActive: true } });
  if (!component) throw new Error("Assessment component not found.");
  const publication = exam.publications[0]; if (!publication) throw new Error("No published assessment is available.");
  const attempts = await db.examAttempt.findMany({ where: { examId, publicationId: publication.id, status: AttemptStatus.GRADED }, include: { student: true } });
  const scores = await db.score.findMany({ where: { schoolId: actor.schoolId, subject: exam.subject, classId: exam.classId, session: exam.class.session, term: exam.class.term }, include: { componentValues: { where: { assessmentComponentId: component.id } } } });
  const scoreByStudent = new Map(scores.map((score) => [score.studentId, score]));
  const assessmentTotal = publication.items.reduce((sum, item) => sum + item.marks, 0);
  return { exam: { id: exam.id, title: publication.title, subject: exam.subject, className: exam.class.name, publicationVersion: publication.version }, component: { id: component.id, name: component.name, maxScore: component.maxScore }, assessmentTotal, rows: attempts.map((attempt) => { const score = scoreByStudent.get(attempt.studentId); const existing = score?.componentValues[0]?.obtainedScore ?? null; const raw = attempt.totalScore ?? 0; const normalized = component.maxScore && assessmentTotal ? Math.round((raw / assessmentTotal) * component.maxScore * 100) / 100 : raw; return { studentId: attempt.studentId, name: `${attempt.student.firstName} ${attempt.student.lastName}`, rawScore: raw, normalizedScore: normalized, existingScore: existing, conflict: existing === null ? "NO_EXISTING_VALUE" : existing === normalized ? "SAME_VALUE" : "DIFFERENT_VALUE" }; }) };
}

export async function transferAssessmentToComponent(input: { examId: string; componentId: string; conflict: "SKIP" | "REPLACE" }, actor: TeacherActor) {
  const preview = await getScoreTransferPreview(input.examId, input.componentId, actor);
  const exam = await ownedExam(input.examId, actor);
  if (!exam.classId || !exam.class) throw new Error("Assessment class context is required.");
  let transferred = 0; let skipped = 0; let conflicts = 0;
  for (const row of preview.rows) {
    if (row.conflict === "DIFFERENT_VALUE" && input.conflict === "SKIP") { conflicts++; skipped++; continue; }
    const score = await db.score.findUnique({ where: { studentId_subject_term_session: { studentId: row.studentId, subject: exam.subject, term: exam.class.term, session: exam.class.session } } });
    if (!score) { skipped++; continue; }
    await db.$transaction(async (tx) => {
      await tx.scoreAssessmentComponentValue.upsert({ where: { scoreId_assessmentComponentId: { scoreId: score.id, assessmentComponentId: input.componentId } }, create: { scoreId: score.id, assessmentComponentId: input.componentId, obtainedScore: row.normalizedScore, sourceLabel: `Assessment ${preview.exam.title} · Publication ${preview.exam.publicationVersion} · raw ${row.rawScore}/${preview.assessmentTotal}`, sourceMaxScore: preview.component.maxScore }, update: { ...(row.conflict === "DIFFERENT_VALUE" && input.conflict === "REPLACE" ? { obtainedScore: row.normalizedScore, sourceLabel: `Assessment ${preview.exam.title} · Publication ${preview.exam.publicationVersion} · raw ${row.rawScore}/${preview.assessmentTotal}`, sourceMaxScore: preview.component.maxScore } : {}) } });
    });
    transferred++;
  }
  return { transferred, skipped, conflicts, total: preview.rows.length };
}
