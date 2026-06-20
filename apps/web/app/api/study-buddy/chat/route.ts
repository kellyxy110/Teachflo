import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { routedChatStream } from "@/lib/ai/router";
import { rateLimit } from "@/lib/rate-limit";

export type LearningMode =
  | "explain"
  | "test"
  | "hint"
  | "step-by-step"
  | "review-mistakes";

const MODE_PROMPTS: Record<LearningMode, string> = {
  explain:
    "You are an expert tutor. Explain concepts clearly using simple language, " +
    "real-world analogies, and examples suitable for Nigerian secondary school students. " +
    "Break complex ideas into digestible steps.",
  test:
    "You are an exam coach. Generate 3-5 practice questions based on the student's message. " +
    "For MCQ questions, format each as:\n" +
    "Q1. [stem]\nA) ...\nB) ...\nC) ...\nD) ...\nCorrect: [letter]\nExplanation: ...\n\n" +
    "Focus on the student's weak areas. Vary difficulty.",
  hint:
    "You are a Socratic tutor. Do NOT give direct answers. " +
    "Instead, ask guiding questions, give partial clues, and nudge the student " +
    "toward discovering the answer themselves. Use phrases like " +
    '"What do you think happens when...?" and "Consider this...".',
  "step-by-step":
    "You are a methodical tutor. Solve the problem step by step, " +
    "numbering each step clearly. Show your working. After each step, " +
    "briefly explain WHY that step is needed before moving to the next.",
  "review-mistakes":
    "You are a mistake analyst. The student wants to review their recent errors. " +
    "For each mistake: explain what went wrong, identify the misconception, " +
    "explain the correct reasoning, and suggest what to revise. Be encouraging.",
};

export async function POST(request: Request) {
  let userId: string | null = null;
  try {
    const auth = await safeAuth();
    userId = auth.userId;
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userId)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { ok, remaining } = rateLimit(`study-buddy:${userId}`);
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
  if (!teacher)
    return Response.json({ error: "Teacher not found" }, { status: 404 });

  const body = await request.json();
  const {
    message,
    studentId,
    mode = "explain",
    skillContext,
    weakSkills,
    recentMistakes,
  } = body as {
    message: string;
    studentId?: string;
    mode?: LearningMode;
    skillContext?: string;
    weakSkills?: string;
    recentMistakes?: string;
  };

  if (!message)
    return Response.json({ error: "message is required" }, { status: 400 });

  const modePrompt = MODE_PROMPTS[mode] || MODE_PROMPTS.explain;

  const contextParts = [modePrompt];

  if (skillContext) {
    contextParts.push(`\nStudent skill profile:\n${skillContext}`);
  }
  if (weakSkills) {
    contextParts.push(
      `\nWeak areas (focus here):\n${weakSkills}`
    );
  }
  if (recentMistakes && mode === "review-mistakes") {
    contextParts.push(
      `\nRecent mistakes to review:\n${recentMistakes}`
    );
  }

  const systemPrompt = contextParts.join("\n");

  try {
    const { stream } = await routedChatStream({
      message,
      schoolId: teacher.schoolId,
      useRAG: true,
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
      },
    });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Study Buddy AI failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
