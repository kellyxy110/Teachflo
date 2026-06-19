import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkDuplicateQuestion } from "@/lib/vector-search";

export async function POST(request: Request) {
  let userId: string | null = null;
  try {
    const auth = await safeAuth();
    userId = auth.userId;
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const teacher = await db.teacher.findUnique({
    where: { clerkId: userId },
    select: { schoolId: true },
  });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 404 });

  const body = await request.json();
  const { questionText, threshold } = body as {
    questionText: string;
    threshold?: number;
  };

  if (!questionText) {
    return Response.json({ error: "questionText is required" }, { status: 400 });
  }

  try {
    const result = await checkDuplicateQuestion(
      questionText,
      teacher.schoolId,
      threshold ?? 0.85
    );
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Duplicate check failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
