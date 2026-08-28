"use server";

import { requireSchool } from "@/lib/auth";
import {
  addQuestionsInputSchema,
  addQuestionsToAssessmentForActor,
  AssessmentBridgeError,
  getQuestionBankWorkspaceForActor,
} from "@/lib/services/questions/assessment-bridge";

export async function getQuestionBankWorkspace(destinationAssessmentId?: string) {
  const { schoolId, teacher } = await requireSchool();
  return getQuestionBankWorkspaceForActor(
    { schoolId, teacherId: teacher.id },
    destinationAssessmentId,
  );
}

export async function addQuestionsToAssessment(input: unknown) {
  const parsed = addQuestionsInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Check the selected assessment, questions, and marks." };
  }

  const { schoolId, teacher } = await requireSchool();
  try {
    const result = await addQuestionsToAssessmentForActor(
      { schoolId, teacherId: teacher.id },
      parsed.data,
    );
    return { ok: true as const, ...result };
  } catch (error) {
    if (error instanceof AssessmentBridgeError) {
      return { ok: false as const, error: error.message, code: error.code };
    }
    console.error("Question Bank assessment bridge failed", error);
    return { ok: false as const, error: "Questions could not be added. Please try again." };
  }
}
