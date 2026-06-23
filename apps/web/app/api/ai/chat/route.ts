import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { routedChatStream } from "@/lib/ai/router";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  let userId: string | null = null;
  try {
    const auth = await safeAuth();
    userId = auth.userId;
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ok, remaining } = rateLimit(`ai-chat:${userId}`);
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
  if (!teacher) {
    return Response.json({ error: "Teacher not found" }, { status: 404 });
  }

  const text = await request.text();
  if (text.length > 10_000) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: { message?: string; useRAG?: boolean };
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { message, useRAG } = body;
  if (!message) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  try {
    const { stream } = await routedChatStream({
      message,
      schoolId: teacher.schoolId,
      useRAG: useRAG ?? true,
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
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI routing failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
