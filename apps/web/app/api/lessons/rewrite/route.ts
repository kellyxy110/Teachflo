import { buildRewritePrompt } from "@teachflow/ai-prompts";
import type { RewriteInput } from "@teachflow/ai-prompts";
import { safeAuth } from "@/lib/auth";
import { openRouterStream, LESSON_MODELS } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  let userId: string | null = null;
  try {
    const auth = await safeAuth();
    userId = auth.userId;
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ok } = rateLimit(`lesson-rewrite:${userId}`);
  if (!ok) {
    return Response.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const body = await request.json();
  const { originalLesson, mode, classLevel, subject } = body;

  if (!originalLesson || !mode || !classLevel || !subject) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validModes = ["ELI12", "WAEC", "JAMB", "JUPEB"];
  if (!validModes.includes(mode)) {
    return Response.json({ error: "Invalid mode" }, { status: 400 });
  }

  const prompt = buildRewritePrompt({
    originalLesson,
    mode,
    classLevel,
    subject,
  } as RewriteInput);

  let stream: Awaited<ReturnType<typeof openRouterStream>>;
  try {
    stream = await openRouterStream(
      LESSON_MODELS,
      [{ role: "user", content: prompt }],
      { max_tokens: 2500, temperature: 0.6 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI rewrite failed";
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
