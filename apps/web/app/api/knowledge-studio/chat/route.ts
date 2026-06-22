import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { generateEmbedding } from "@/lib/embeddings";
import { openRouterStream, LESSON_MODELS, EXAM_MODELS, DOCUMENT_MODELS } from "@/lib/ai";

export const maxDuration = 60;

type StudioMode = "explain" | "summarize" | "quiz-me" | "step-by-step" | "compare";

interface ChunkResult {
  id: string;
  documentId: string;
  content: string;
  metadata: Record<string, unknown> | null;
  chunkIndex: number;
  similarity: number;
}

const MODE_PROMPTS: Record<StudioMode, string> = {
  explain:
    "You are a document-grounded tutor. Explain concepts ONLY using the provided document chunks. " +
    "Be clear, use simple language suitable for Nigerian secondary school students. " +
    "After your explanation, cite your sources using [Source: chunk X] notation.",
  summarize:
    "You are a document summarizer. Create a clear, structured summary ONLY from the provided document chunks. " +
    "Use bullet points and headings. Include key terms and definitions found in the text. " +
    "Cite each point with [Source: chunk X].",
  "quiz-me":
    "You are a quiz generator. Generate 5 questions ONLY from the provided document chunks. " +
    "Format:\n" +
    "Q1. [stem]\nA) ...\nB) ...\nC) ...\nD) ...\nCorrect: [letter]\nExplanation: ...\nSource: chunk X\n\n" +
    "Mix MCQ and short-answer. Vary difficulty from Remember to Apply level.",
  "step-by-step":
    "You are a methodical tutor. Using ONLY the provided document chunks, break down the concept step by step. " +
    "Number each step. Explain WHY each step matters. Use examples from the document. " +
    "Cite with [Source: chunk X].",
  compare:
    "You are a document analyst. Compare and contrast the content across the provided document chunks. " +
    "Identify overlapping concepts, contradictions, and gaps. " +
    "Structure as: Similarities, Differences, Gaps. Cite with [Source: chunk X].",
};

function modelsForMode(mode: StudioMode): readonly string[] {
  switch (mode) {
    case "explain":
    case "step-by-step":
      return LESSON_MODELS;
    case "quiz-me":
      return EXAM_MODELS;
    case "summarize":
    case "compare":
      return DOCUMENT_MODELS;
  }
}

export async function POST(request: Request) {
  let userId: string | null = null;
  try {
    const auth = await safeAuth();
    userId = auth.userId;
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { ok, remaining } = rateLimit(`ks-chat:${userId}`);
  if (!ok) {
    return Response.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": "60", "X-RateLimit-Remaining": String(remaining) } }
    );
  }

  const teacher = await db.teacher.findUnique({
    where: { clerkId: userId },
    select: { schoolId: true },
  });
  if (!teacher) return Response.json({ error: "Teacher not found" }, { status: 404 });

  const body = await request.json();
  const {
    message,
    documentIds,
    mode = "explain",
    topK = 8,
  } = body as {
    message: string;
    documentIds: string[];
    mode?: StudioMode;
    topK?: number;
  };

  if (!message) return Response.json({ error: "message is required" }, { status: 400 });
  if (!documentIds || documentIds.length === 0) {
    return Response.json({ error: "Select at least one document" }, { status: 400 });
  }

  const embedding = await generateEmbedding(message);
  const vec = `[${embedding.join(",")}]`;

  const placeholders = documentIds.map((_, i) => `$${i + 3}`).join(",");

  const chunks = await db.$queryRawUnsafe<ChunkResult[]>(
    `SELECT id, "documentId", content, metadata, "chunkIndex",
            1 - (embedding <=> $1::vector) as similarity
     FROM document_chunks
     WHERE "schoolId" = $2 AND "documentId" IN (${placeholders})
     ORDER BY embedding <=> $1::vector
     LIMIT ${topK}`,
    vec,
    teacher.schoolId,
    ...documentIds
  );

  if (chunks.length === 0) {
    return Response.json({
      content: "No relevant content found in the selected documents for this query. Try rephrasing your question or uploading more materials.",
      chunks: [],
      model: "none",
      provider: "none",
      mode,
    });
  }

  const contextParts = chunks.map(
    (c, i) => `[Chunk ${i + 1} | Doc: ${(c.metadata as Record<string,string>)?.documentTitle || "Unknown"} | Index: ${c.chunkIndex}]\n${c.content}`
  );

  const systemPrompt = [
    MODE_PROMPTS[mode] || MODE_PROMPTS.explain,
    "\n\nIMPORTANT: You must ONLY answer based on the document chunks below. " +
    "If the answer is not in the chunks, say: \"This information is not found in the uploaded materials.\" " +
    "NEVER use external knowledge.\n\n",
    "=== DOCUMENT CHUNKS ===\n\n",
    contextParts.join("\n\n---\n\n"),
  ].join("");

  const models = modelsForMode(mode);

  let stream: Awaited<ReturnType<typeof openRouterStream>>;
  try {
    stream = await openRouterStream(
      models,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      {
        temperature: mode === "quiz-me" ? 0.4 : 0.6,
        max_tokens: mode === "summarize" ? 3000 : 2000,
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Knowledge Studio AI failed";
    return Response.json({ error: msg }, { status: 502 });
  }

  const chunkMeta = chunks.map((c) => ({
    id: c.id,
    documentId: c.documentId,
    chunkIndex: c.chunkIndex,
    similarity: Math.round(c.similarity * 1000) / 1000,
    preview: c.content.slice(0, 150),
    metadata: c.metadata,
  }));

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
      "X-KS-Mode": mode,
      "X-KS-Chunks": JSON.stringify(chunkMeta),
      "X-KS-Chunk-Count": String(chunks.length),
    },
  });
}
