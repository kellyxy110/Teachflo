import { requireSchool } from "@/lib/auth";
import { stageQuestionImport } from "@/lib/services/question-import/workflow";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const { teacher, schoolId } = await requireSchool();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "A question file is required." }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await stageQuestionImport({ teacherId: teacher.id, schoolId }, file.name, buffer, file.type);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Question import staging failed." }, { status: 400 });
  }
}
