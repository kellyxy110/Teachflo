import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { buildRewritePrompt } from "@teachflow/ai-prompts";
import type { RewriteInput } from "@teachflow/ai-prompts";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

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

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    stream: true,
    max_tokens: 2500,
    temperature: 0.6,
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
