import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  storeLessonEmbedding,
  storeQuestionEmbedding,
  storeDocumentChunks,
} from "@/lib/vector-search";
import { chunkText } from "@/lib/chunker";

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
  const { type, id, content, metadata } = body as {
    type: "lesson" | "question" | "document";
    id: string;
    content: string;
    metadata?: Record<string, unknown>;
  };

  if (!type || !id || !content) {
    return Response.json({ error: "type, id, and content are required" }, { status: 400 });
  }

  try {
    switch (type) {
      case "lesson":
        await storeLessonEmbedding(id, teacher.schoolId, content, metadata);
        break;
      case "question":
        await storeQuestionEmbedding(id, teacher.schoolId, content, metadata);
        break;
      case "document": {
        const chunks = chunkText(content);
        await storeDocumentChunks(
          id,
          teacher.schoolId,
          chunks.map((c, i) => ({ content: c, metadata: { ...metadata, chunkIndex: i } }))
        );
        break;
      }
      default:
        return Response.json({ error: "type must be lesson, question, or document" }, { status: 400 });
    }

    return Response.json({ success: true, type, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Embedding generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
