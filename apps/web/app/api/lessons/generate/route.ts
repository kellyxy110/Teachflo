import { buildLessonPrompt, lessonMaxTokens } from "@teachflow/ai-prompts";
import { safeAuth } from "@/lib/auth";
import { openRouterStream, LESSON_MODELS } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

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

  if (!subject || !classLevel || !topic) {
    return Response.json({ error: "subject, classLevel, and topic are required" }, { status: 400 });
  }

  const periodCount = typeof periods === "number" && periods >= 1 ? Math.min(periods, 20) : 1;
  const prompt = buildLessonPrompt({ subject, classLevel, topic, week, term, periods: periodCount });

  let stream: Awaited<ReturnType<typeof openRouterStream>>;
  try {
    stream = await openRouterStream(
      LESSON_MODELS,
      [{ role: "user", content: prompt }],
      { max_tokens: lessonMaxTokens(periodCount), temperature: 0.7 }
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
