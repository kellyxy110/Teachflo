import { buildLessonPrompt } from "@teachflow/ai-prompts";
import { safeAuth } from "@/lib/auth";
import { getGroqClient, GROQ_MODEL } from "@/lib/ai";
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

  const { ok } = rateLimit(`lesson-gen:${userId}`);
  if (!ok) {
    return Response.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const body = await request.json();
  const { subject, classLevel, topic, week, term } = body;

  if (!subject || !classLevel || !topic) {
    return Response.json({ error: "subject, classLevel, and topic are required" }, { status: 400 });
  }

  const prompt = buildLessonPrompt({ subject, classLevel, topic, week, term });

  const stream = await getGroqClient().chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: "user", content: prompt }],
    stream: true,
    max_tokens: 2000,
    temperature: 0.7,
  });

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
