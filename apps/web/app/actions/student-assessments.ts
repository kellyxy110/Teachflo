"use server";

import { requireStudent } from "@/lib/auth";
import { getStudentAssessment, getStudentAttemptDelivery, listStudentAssessments, saveStudentResponse, startStudentAttempt, submitStudentAttempt } from "@/lib/services/assessments/student-delivery";

export async function getAvailableStudentAssessments() {
  const student = await requireStudent();
  return listStudentAssessments({ id: student.id, schoolId: student.schoolId, classId: student.classId });
}

export async function getStudentAssessmentInstructions(examId: string) {
  const student = await requireStudent();
  return getStudentAssessment(examId, { id: student.id, schoolId: student.schoolId, classId: student.classId });
}

export async function startPublishedAssessment(examId: string) {
  const student = await requireStudent();
  const attempt = await startStudentAttempt(examId, { id: student.id, schoolId: student.schoolId, classId: student.classId });
  return { attemptId: attempt.id };
}

export async function getPublishedAttempt(attemptId: string) {
  const student = await requireStudent();
  return getStudentAttemptDelivery(attemptId, { id: student.id, schoolId: student.schoolId, classId: student.classId });
}

export async function savePublishedResponse(input: { attemptId: string; publicationItemId: string; selectedOption?: string | null; textResponse?: string | null }) {
  const student = await requireStudent();
  await saveStudentResponse(input, { id: student.id, schoolId: student.schoolId, classId: student.classId });
  return { saved: true };
}

export async function submitPublishedAssessment(attemptId: string) {
  const student = await requireStudent();
  const attempt = await submitStudentAttempt(attemptId, { id: student.id, schoolId: student.schoolId, classId: student.classId });
  return { status: attempt.status, submittedAt: attempt.submittedAt };
}
