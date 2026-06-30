import { safeAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  buildCodingAssistPrompt,
  classifyCodingTask,
  codingStream,
  type CodingAssistInput,
} from "@/lib/ai/coding-router";

export const maxDuration = 60;

export async function POST(request: Request) {
  let userId: string | null = null;
  try {
    const auth = await safeAuth();
    userId = auth.userId;
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ok } = await rateLimit(`coding-assist:${userId}`);
  if (!ok) {
    return Response.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 },
    );
  }

  let body: Partial<CodingAssistInput>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { code = "", language, question, lessonTitle, lessonInstruction } = body;

  if (!language?.trim()) {
    return Response.json({ error: "language is required" }, { status: 400 });
  }
  if (!question?.trim()) {
    return Response.json({ error: "question is required" }, { status: 400 });
  }
  if (question.length > 500) {
    return Response.json({ error: "question must be under 500 characters" }, { status: 400 });
  }

  const prompt = buildCodingAssistPrompt({
    code: code.slice(0, 4000),
    language,
    question,
    lessonTitle,
    lessonInstruction,
  });

  const task = classifyCodingTask(question);

  let result: Awaited<ReturnType<typeof codingStream>>;
  try {
    result = await codingStream(
      [{ role: "user", content: prompt }],
      task,
      { max_tokens: 800, temperature: 0.5 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI generation failed";
    return Response.json({ error: msg }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of result.stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
    cancel() {
      result.stream.controller.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Accel-Buffering": "no",
      "X-Coding-Task": task,
      "X-Model-Provider": result.providerUsed,
    },
  });
}
