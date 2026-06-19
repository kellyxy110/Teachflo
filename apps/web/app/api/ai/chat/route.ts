import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { routedChatStream, classifyIntent } from "@/lib/ai/router";

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

  const teacher = await db.teacher.findUnique({
    where: { clerkId: userId },
    select: { schoolId: true },
  });
  if (!teacher) {
    return Response.json({ error: "Teacher not found" }, { status: 404 });
  }

  const body = await request.json();
  const { message, useRAG, systemPrompt } = body as {
    message: string;
    useRAG?: boolean;
    systemPrompt?: string;
  };

  if (!message) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  try {
    const { stream, metadata } = await routedChatStream({
      message,
      schoolId: teacher.schoolId,
      useRAG: useRAG ?? true,
      systemPrompt,
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
        "X-AI-Model": metadata.model,
        "X-AI-Provider": metadata.provider,
        "X-AI-Intent": metadata.intent,
        "X-AI-Reason": metadata.reason,
        "X-AI-RAG-Used": String(metadata.ragUsed),
        ...(metadata.ragChunks
          ? { "X-AI-RAG-Chunks": String(metadata.ragChunks) }
          : {}),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI routing failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
