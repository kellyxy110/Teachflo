"use server";

import { revalidatePath } from "next/cache";
import { requireSchool } from "@/lib/auth";
import { getAssessmentAnalytics, getScoreTransferPreview, transferAssessmentToComponent } from "@/lib/services/assessments/analytics";

export async function getAssessmentAnalyticsView(examId: string) {
  const { teacher, schoolId } = await requireSchool();
  return getAssessmentAnalytics(examId, { id: teacher.id, schoolId });
}

export async function getAssessmentScoreTransferPreview(examId: string, componentId: string) {
  const { teacher, schoolId } = await requireSchool();
  return getScoreTransferPreview(examId, componentId, { id: teacher.id, schoolId });
}

export async function transferAssessmentScoreComponent(input: { examId: string; componentId: string; conflict: "SKIP" | "REPLACE" }) {
  const { teacher, schoolId } = await requireSchool();
  const result = await transferAssessmentToComponent(input, { id: teacher.id, schoolId });
  revalidatePath("/scores");
  revalidatePath(`/analytics/assessments/${input.examId}`);
  return result;
}
