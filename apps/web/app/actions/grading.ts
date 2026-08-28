"use server";

import { revalidatePath } from "next/cache";
import { requireSchool, requireStudent } from "@/lib/auth";
import { getGradingAttempt, gradeResponseForTeacher, listGradingQueue, releaseAttemptResult } from "@/lib/services/assessments/grading";
import { getStudentResult } from "@/lib/services/assessments/grading";

export async function getTeacherGradingQueue(examId?: string) {
  const { teacher, schoolId } = await requireSchool();
  return listGradingQueue({ id: teacher.id, schoolId }, examId);
}

export async function getTeacherGradingAttempt(attemptId: string) {
  const { teacher, schoolId } = await requireSchool();
  return getGradingAttempt(attemptId, { id: teacher.id, schoolId });
}

export async function saveTeacherGrade(input: { attemptId: string; publicationItemId: string; awardedMarks: number; feedback?: string | null }) {
  const { teacher, schoolId } = await requireSchool();
  const result = await gradeResponseForTeacher(input, { id: teacher.id, schoolId });
  revalidatePath(`/grading/${input.attemptId}`);
  return { saved: true, status: result.status };
}

export async function releaseTeacherResult(attemptId: string) {
  const { teacher, schoolId } = await requireSchool();
  const result = await releaseAttemptResult(attemptId, { id: teacher.id, schoolId });
  revalidatePath(`/grading/${attemptId}`);
  revalidatePath(`/s/exams`);
  return { released: Boolean(result.resultReleasedAt) };
}

export async function getStudentResultView(attemptId: string) {
  const student = await requireStudent();
  return getStudentResult(attemptId, { id: student.id, schoolId: student.schoolId });
}
