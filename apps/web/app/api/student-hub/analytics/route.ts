import { safeAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { computeClassAnalytics } from "@/lib/services/analytics/calculator";

export const maxDuration = 30;

// GET /api/student-hub/analytics?classId=&term=&session=
export async function GET(request: Request) {
  const auth = await safeAuth();
  if (!auth.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { ok } = await rateLimit(`analytics:${auth.userId}`);
  if (!ok) return Response.json({ error: "Too many requests" }, { status: 429 });

  const teacher = await db.teacher.findUnique({ where: { clerkId: auth.userId } });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 403 });

  const url = new URL(request.url);
  const classId = url.searchParams.get("classId");
  const term = url.searchParams.get("term") ?? undefined;
  const session = url.searchParams.get("session") ?? undefined;

  if (!classId) return Response.json({ error: "classId is required" }, { status: 400 });

  const cls = await db.class.findFirst({ where: { id: classId, schoolId: teacher.schoolId } });
  if (!cls) return Response.json({ error: "Class not found" }, { status: 404 });

  const analytics = await computeClassAnalytics(classId, teacher.schoolId, term, session);
  return Response.json(analytics);
}
