import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/student-hub/sync-history
export async function GET(request: Request) {
  const auth = await safeAuth();
  if (!auth.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const teacher = await db.teacher.findUnique({ where: { clerkId: auth.userId } });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 403 });

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "30"), 100);

  const logs = await db.syncLog.findMany({
    where: { schoolId: teacher.schoolId },
    orderBy: { startedAt: "desc" },
    take: limit,
  });

  return Response.json({ logs });
}
