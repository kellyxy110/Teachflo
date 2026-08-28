import { requireSchool } from "@/lib/auth";
import { approveQuestionCandidate, reviewQuestionCandidate } from "@/lib/services/question-import/workflow";

export async function PATCH(request: Request) {
  try {
    const { teacher, schoolId } = await requireSchool();
    const body = await request.json() as { rowId?: string; expectedRevision?: number; approve?: boolean; patch?: Record<string, unknown> };
    if (!body.rowId || !Number.isInteger(body.expectedRevision)) return Response.json({ error: "rowId and expectedRevision are required." }, { status: 400 });
    const actor = { teacherId: teacher.id, schoolId };
    const revision = Number(body.expectedRevision);
    const rowId = body.rowId;
    const result = body.approve ? await approveQuestionCandidate(actor, rowId, revision) : await reviewQuestionCandidate(actor, rowId, body.patch ?? {}, revision);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Question review failed." }, { status: 409 });
  }
}
