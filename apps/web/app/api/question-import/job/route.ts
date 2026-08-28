import { requireSchool } from "@/lib/auth";
import { getQuestionImportJob } from "@/lib/services/question-import/workflow";

export async function GET(request: Request) {
  try {
    const { teacher, schoolId } = await requireSchool();
    const jobId = new URL(request.url).searchParams.get("jobId");
    if (!jobId) return Response.json({ error: "jobId is required." }, { status: 400 });
    return Response.json(await getQuestionImportJob({ teacherId: teacher.id, schoolId }, jobId));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Question import job unavailable." }, { status: 404 });
  }
}
