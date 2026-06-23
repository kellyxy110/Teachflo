import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { openRouterCompletion, DOCUMENT_MODELS } from "@/lib/ai";

export const maxDuration = 60;

export async function POST(request: Request) {
  let userId: string | null = null;
  try {
    const auth = await safeAuth();
    userId = auth.userId;
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { ok } = await rateLimit(`ks-analyze:${userId}`);
  if (!ok) {
    return Response.json({ error: "Too many requests." }, { status: 429 });
  }

  const teacher = await db.teacher.findUnique({
    where: { clerkId: userId },
    select: { schoolId: true },
  });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 404 });

  const body = await request.json();
  const { documentId } = body as { documentId: string };

  if (!documentId) return Response.json({ error: "documentId is required" }, { status: 400 });

  const chunks = await db.$queryRawUnsafe<
    Array<{ content: string; chunkIndex: number }>
  >(
    `SELECT content, "chunkIndex"
     FROM document_chunks
     WHERE "documentId" = $1 AND "schoolId" = $2
     ORDER BY "chunkIndex" ASC
     LIMIT 30`,
    documentId,
    teacher.schoolId
  );

  if (chunks.length === 0) {
    return Response.json({ error: "No chunks found" }, { status: 404 });
  }

  const sample = chunks.map((c) => c.content).join("\n\n---\n\n");

  let raw: string;
  try {
    const { completion } = await openRouterCompletion(
      DOCUMENT_MODELS,
      [
        {
          role: "system",
          content:
            "Analyze the following document and return a JSON object with these fields:\n" +
            '- "topics": array of topic strings detected\n' +
            '- "concepts": array of {name, definition} objects for key concepts\n' +
            '- "difficulty": one of "Basic", "Intermediate", "Advanced", "Mixed"\n' +
            '- "subjectArea": detected subject area\n' +
            '- "classLevelEstimate": estimated Nigerian class level (JS1-SS3)\n' +
            '- "examRelevance": array of exam types this aligns with (WAEC/JAMB/JUPEB)\n' +
            '- "coverage": brief description of what the document covers\n' +
            '- "chunkCount": total chunks analyzed\n\n' +
            "Return ONLY valid JSON, no markdown.",
        },
        { role: "user", content: sample },
      ],
      { temperature: 0.3, max_tokens: 2000, json: true }
    );
    raw = completion.choices[0]?.message?.content ?? "{}";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analysis failed";
    return Response.json({ error: msg }, { status: 502 });
  }

  let analysis: Record<string, unknown>;
  try {
    const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
    analysis = JSON.parse(cleaned);
  } catch {
    return Response.json({ error: "Failed to parse analysis" }, { status: 500 });
  }

  analysis.chunkCount = chunks.length;

  return Response.json(analysis);
}
