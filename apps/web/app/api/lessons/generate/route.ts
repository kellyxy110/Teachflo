import { buildLessonPrompt, lessonMaxTokens, type CIGContext } from "@teachflow/ai-prompts";
import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { openRouterStream, LESSON_MODELS } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";
import { getTopicByLabel, getTopicContext } from "@/lib/curriculum-graph";
import { retrieveRAGContext } from "@/lib/vector-search";
import type { ClassLevel, Term } from "@prisma/client";

export const maxDuration = 120;

export async function POST(request: Request) {
  let userId: string | null = null;
  try {
    const auth = await safeAuth();
    userId = auth.userId;
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ok } = await rateLimit(`lesson-gen:${userId}`);
  if (!ok) {
    return Response.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const body = await request.json();
  const { subject, classLevel, topic, week, term, periods } = body;

  // Resolve teacher → schoolId (needed for RAG lookup)
  let schoolId: string | null = null;
  try {
    const teacher = await db.teacher.findUnique({
      where: { clerkId: userId },
      select: { schoolId: true },
    });
    schoolId = teacher?.schoolId ?? null;
  } catch {
    // Non-fatal — generation continues without RAG context
  }

  if (!subject || !classLevel || !topic) {
    return Response.json({ error: "subject, classLevel, and topic are required" }, { status: 400 });
  }

  // Enrich with CIG context — non-fatal if lookup fails or node not found
  let cigContext: CIGContext | undefined;
  try {
    const node = await getTopicByLabel(topic, subject, classLevel as ClassLevel, term as Term | undefined);
    if (node) {
      const ctx = await getTopicContext(node.id);
      cigContext = {
        description: node.description ?? "",
        bloomLevels: ctx.bloomLevels,
        examStandards: ctx.examStandards,
        keywords: node.keywords,
        misconceptions: ctx.misconceptions,
        formulae: ctx.formulae,
        prerequisites: ctx.prerequisites.map((p) => p.label),
        crossSubjectConnections: ctx.crossSubjectConnections.map((c) => ({
          topic: c.node.label,
          subject: c.subject,
        })),
        difficulty: node.difficulty ?? "MEDIUM",
      };
    }
  } catch {
    // CIG lookup is best-effort — lesson generation continues without it
  }

  // Retrieve textbook context from school's uploaded PDFs
  let textbookContext: string | undefined;
  if (schoolId) {
    try {
      const chunks = await retrieveRAGContext(`${subject} ${topic} ${classLevel}`, schoolId, 6);
      if (chunks.length > 0) {
        textbookContext = chunks
          .filter((c) => c.similarity > 0.5)
          .slice(0, 5)
          .map((c, i) => `[Excerpt ${i + 1}]\n${c.content}`)
          .join("\n\n");
      }
    } catch {
      // Non-fatal — generation continues without textbook context
    }
  }

  const periodCount = typeof periods === "number" && periods >= 1 ? Math.min(periods, 20) : 1;
  const prompt = buildLessonPrompt({ subject, classLevel, topic, week, term, periods: periodCount, cigContext, textbookContext });

  let stream: Awaited<ReturnType<typeof openRouterStream>>;
  try {
    stream = await openRouterStream(
      LESSON_MODELS,
      [{ role: "user", content: prompt }],
      // Lower temperature for structured lesson output — 0.4 gives reliable section adherence
      { max_tokens: lessonMaxTokens(periodCount), temperature: 0.4 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI generation failed";
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
    cancel() {
      stream.controller.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
