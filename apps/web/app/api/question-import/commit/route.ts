import { requireSchool } from "@/lib/auth";
import { commitApprovedQuestionCandidates } from "@/lib/services/question-import/workflow";

export async function POST(request: Request) {
  try {
    const { teacher, schoolId } = await requireSchool();
    const body = await request.json() as { jobId?: string };
    if (!body.jobId) return Response.json({ error: "jobId is required." }, { status: 400 });
    const questionIds = await commitApprovedQuestionCandidates({ teacherId: teacher.id, schoolId }, body.jobId);
    return Response.json({ questionIds });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Question import commit failed." }, { status: 409 });
  }
}
