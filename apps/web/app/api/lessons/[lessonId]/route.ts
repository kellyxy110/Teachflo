import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  let userId: string | null = null;
  try {
    const auth = await safeAuth();
    userId = auth.userId;
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId } = await params;

  let body: { markdown?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const markdown = body.markdown;
  if (typeof markdown !== "string" || !markdown.trim()) {
    return Response.json({ error: "markdown is required" }, { status: 400 });
  }

  // Resolve schoolId from teacher profile — avoids exposing schoolId in client request
  const teacher = await db.teacher.findFirst({
    where: { clerkId: userId },
    select: { schoolId: true },
  });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 403 });

  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, schoolId: teacher.schoolId },
    select: { id: true },
  });
  if (!lesson) return Response.json({ error: "Lesson not found" }, { status: 404 });

  await db.lesson.update({
    where: { id: lessonId },
    data: { content: { markdown: markdown.slice(0, 200000) } },
  });

  return Response.json({ ok: true });
}
