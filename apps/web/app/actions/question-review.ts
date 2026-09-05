"use server";
import { revalidatePath } from "next/cache";
import { requireSchool } from "@/lib/auth";
import { approveQuestionForReview, editQuestionForReview, findAuthorizedDuplicate, getQuestionReviewQueue, rejectQuestionForReview, reviewBatch, returnQuestionToDraft, type ReviewFilters } from "@/lib/services/questions/review-workspace";
async function actor() { const { schoolId, teacher } = await requireSchool(); return { schoolId, teacherId: teacher.id }; }
export async function getReviewQueue(filters: ReviewFilters = {}) { return getQuestionReviewQueue(await actor(), filters); }
export async function editReviewQuestion(input: Parameters<typeof editQuestionForReview>[1]) { const result = await editQuestionForReview(await actor(), input); revalidatePath("/question-bank/review"); return result; }
export async function approveReviewQuestion(questionId: string) { const result = await approveQuestionForReview(await actor(), questionId); revalidatePath("/question-bank"); revalidatePath("/question-bank/review"); return result; }
export async function rejectReviewQuestion(input: Parameters<typeof rejectQuestionForReview>[1]) { const result = await rejectQuestionForReview(await actor(), input); revalidatePath("/question-bank/review"); return result; }
export async function draftReviewQuestion(questionId: string) { const result = await returnQuestionToDraft(await actor(), questionId); revalidatePath("/question-bank/review"); return result; }
export async function batchReviewQuestions(input: Parameters<typeof reviewBatch>[1]) { const result = await reviewBatch(await actor(), input); revalidatePath("/question-bank/review"); revalidatePath("/question-bank"); return result; }
export async function compareReviewDuplicate(input: { questionId: string; fingerprint: string }) { return findAuthorizedDuplicate(await actor(), input.questionId, input.fingerprint); }
