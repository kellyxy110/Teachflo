import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { findSimilarLessons } from "@/lib/vector-search";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  let userId: string | null = null;
  try {
    const auth = await safeAuth();
    userId = auth.userId;
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { ok } = await rateLimit(`search:${userId}`);
  if (!ok) return Response.json({ error: "Too many requests" }, { status: 429 });

  const teacher = await db.teacher.findUnique({
    where: { clerkId: userId },
    select: { schoolId: true },
  });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 404 });

  const body = await request.json();
  const { query, limit } = body as { query: string; limit?: number };

  if (!query || query.length > 5000) {
    return Response.json({ error: "query is required (max 5000 chars)" }, { status: 400 });
  }

  const clampedLimit = Math.min(Math.max(1, limit ?? 5), 20);

  try {
    const results = await findSimilarLessons(query, teacher.schoolId, clampedLimit);
    return Response.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
