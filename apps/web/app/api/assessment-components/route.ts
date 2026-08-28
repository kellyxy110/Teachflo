import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const auth = await safeAuth();
  if (!auth.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { ok } = await rateLimit(`assessment-components:${auth.userId}`);
  if (!ok) return Response.json({ error: "Too many requests" }, { status: 429 });

  const teacher = await db.teacher.findUnique({ where: { clerkId: auth.userId }, select: { schoolId: true } });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 403 });

  const components = await db.assessmentComponent.findMany({
    where: { schoolId: teacher.schoolId, isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, normalizedName: true, maxScore: true, order: true },
  });
  return Response.json({ components });
}
