import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { findSimilarLessons } from "@/lib/vector-search";

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
  const { query, limit } = body as { query: string; limit?: number };

  if (!query) {
    return Response.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const results = await findSimilarLessons(query, teacher.schoolId, limit ?? 5);
    return Response.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
