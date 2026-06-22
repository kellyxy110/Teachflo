import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { openRouterStream, DOCUMENT_MODELS } from "@/lib/ai";

export const maxDuration = 60;

type GenerateType = "summary" | "concepts" | "flashcards" | "exam-questions";

const TYPE_PROMPTS: Record<GenerateType, string> = {
  summary:
    "Generate a structured summary of the document content. Include:\n" +
    "1. **Overview** — 2-3 sentence summary\n" +
    "2. **Key Points** — bullet list of main ideas\n" +
    "3. **Important Definitions** — any terms defined in the text\n" +
    "4. **Formulas/Rules** — if applicable\n\n" +
    "Base everything ONLY on the provided text. Cite chunk numbers.",
  concepts:
    "Extract all key concepts from the document. For each concept provide:\n" +
    "- **Concept Name**\n" +
    "- **Definition** (from the document)\n" +
    "- **Related Concepts** (if mentioned)\n" +
    "- **Difficulty Level** (Remember/Understand/Apply/Analyze)\n\n" +
    "ONLY extract concepts explicitly mentioned in the text.",
  flashcards:
    "Generate flashcards from the document content. Format each as:\n\n" +
    "**Card N**\n" +
    "Front: [question or term]\n" +
    "Back: [answer or definition]\n" +
    "Source: chunk X\n\n" +
    "Generate 10-15 flashcards covering the most important content. " +
    "ONLY use information from the provided text.",
  "exam-questions":
    "Generate exam questions from the document. Include:\n\n" +
    "**Section A: Objectives (5 MCQs)**\n" +
    "Q1. [stem]\nA) ...\nB) ...\nC) ...\nD) ...\nCorrect: [letter]\nExplanation: ...\nSource: chunk X\n\n" +
    "**Section B: Theory (3 questions)**\n" +
    "Q1. [question]\nExpected answer: ...\nMark scheme: ...\nSource: chunk X\n\n" +
    "Base ALL questions on the provided document content only.",
};

export async function POST(request: Request) {
  let userId: string | null = null;
  try {
    const auth = await safeAuth();
    userId = auth.userId;
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { ok } = rateLimit(`ks-gen:${userId}`);
  if (!ok) {
    return Response.json({ error: "Too many requests. Please wait." }, { status: 429 });
  }

  const teacher = await db.teacher.findUnique({
    where: { clerkId: userId },
    select: { schoolId: true },
  });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 404 });

  const body = await request.json();
  const { documentId, type = "summary" } = body as {
    documentId: string;
    type?: GenerateType;
  };

  if (!documentId) return Response.json({ error: "documentId is required" }, { status: 400 });

  const chunks = await db.$queryRawUnsafe<
    Array<{ content: string; chunkIndex: number; metadata: Record<string, unknown> | null }>
  >(
    `SELECT content, "chunkIndex", metadata
     FROM document_chunks
     WHERE "documentId" = $1 AND "schoolId" = $2
     ORDER BY "chunkIndex" ASC`,
    documentId,
    teacher.schoolId
  );

  if (chunks.length === 0) {
    return Response.json({ error: "No chunks found for this document" }, { status: 404 });
  }

  const contextParts = chunks.map(
    (c, i) => `[Chunk ${i + 1} | Index: ${c.chunkIndex}]\n${c.content}`
  );

  const systemPrompt = [
    TYPE_PROMPTS[type] || TYPE_PROMPTS.summary,
    "\n\nYou must ONLY use the document content below. Do NOT use external knowledge.\n\n",
    "=== FULL DOCUMENT CONTENT ===\n\n",
    contextParts.join("\n\n---\n\n"),
  ].join("");

  let stream: Awaited<ReturnType<typeof openRouterStream>>;
  try {
    stream = await openRouterStream(
      DOCUMENT_MODELS,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate ${type} from this document.` },
      ],
      {
        temperature: type === "exam-questions" ? 0.4 : 0.5,
        max_tokens: 4000,
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    return Response.json({ error: msg }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
