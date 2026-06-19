import OpenAI from "openai";
import { buildLessonPrompt } from "@teachflow/ai-prompts";
import { safeAuth } from "@/lib/auth";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function POST(request: Request) {
  try {
    const { userId } = await safeAuth();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { subject, classLevel, topic, week, term } = body;

  if (!subject || !classLevel || !topic) {
    return Response.json({ error: "subject, classLevel, and topic are required" }, { status: 400 });
  }

  const prompt = buildLessonPrompt({ subject, classLevel, topic, week, term });

  const stream = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
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
