import { safeAuth } from "@/lib/auth";
import { openRouterStream, LESSON_MODELS } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const ACTIONS = new Set(["expand", "condense"]);

function buildEditPrompt(
  action: string,
  content: string,
  subject: string,
  classLevel: string,
): string {
  const ctx = `Subject: ${subject}, Class: ${classLevel}`;

  if (action === "expand") {
    return `You are an expert Nigerian secondary school teacher editing a lesson plan.

${ctx}

TASK: Expand the lesson content below. Add more detail to each section — more explanation, more worked examples, more activities, and more context appropriate for Nigerian students. Maintain the same markdown heading structure. Do NOT remove any existing content.

LESSON TO EXPAND:
${content}

Return only the expanded lesson in the same markdown format. No preamble.`.trim();
  }

  return `You are an expert Nigerian secondary school teacher editing a lesson plan.

${ctx}

TASK: Condense the lesson content below. Keep all essential concepts, key terms, and worked examples but make it more concise. Cut redundancy. Maintain the same markdown heading structure.

LESSON TO CONDENSE:
${content}

Return only the condensed lesson in the same markdown format. No preamble.`.trim();
}

export async function POST(request: Request) {
  let userId: string | null = null;
  try {
    const auth = await safeAuth();
    userId = auth.userId;
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ok } = await rateLimit(`lesson-edit-ai:${userId}`);
  if (!ok) {
    return Response.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  let body: { content?: string; action?: string; subject?: string; classLevel?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { content, action, subject = "General", classLevel = "SS1" } = body;

  if (!content?.trim()) {
    return Response.json({ error: "content is required" }, { status: 400 });
  }
  if (!action || !ACTIONS.has(action)) {
    return Response.json({ error: `action must be one of: ${[...ACTIONS].join(", ")}` }, { status: 400 });
  }

  const prompt = buildEditPrompt(action, content.slice(0, 50000), subject, classLevel);

  let stream: Awaited<ReturnType<typeof openRouterStream>>;
  try {
    stream = await openRouterStream(
      LESSON_MODELS,
      [{ role: "user", content: prompt }],
      { max_tokens: 6000, temperature: 0.5 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI edit failed";
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
