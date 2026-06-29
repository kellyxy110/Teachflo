import {
  buildLessonPrompt,
  lessonMaxTokens,
  type CIGContext,
} from "@teachflow/ai-prompts";
import { safeAuth } from "@/lib/auth";
import { openRouterStream, LESSON_MODELS, EXAM_MODELS } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";
import { getNode, getTopicContext } from "@/lib/curriculum-graph";

export const maxDuration = 120;

function buildFlashcardsPrompt(
  subject: string,
  classLevel: string,
  topic: string,
  cig: CIGContext,
): string {
  const keyTerms = cig.keywords.slice(0, 8).join(", ");
  const misconceptions = cig.misconceptions.slice(0, 3).join("; ");
  return `You are a Nigerian secondary school teacher creating study flashcards for ${subject} students in ${classLevel}.

Topic: ${topic}
${cig.description ? `Description: ${cig.description}` : ""}

Generate 12 flashcards. Each has a FRONT (question or term) and BACK (answer or definition).

RULES:
- Use Nigerian curriculum terminology (WAEC/NECO aligned)
- Mix factual recall and application questions
- Keep BACK answers concise — 1–3 sentences max
- Ground examples in Nigerian context where possible
${keyTerms ? `- Cover these key terms: ${keyTerms}` : ""}
${misconceptions ? `- Address these misconceptions: ${misconceptions}` : ""}

OUTPUT — return exactly 12 cards in this format:

**Flashcard 1**
FRONT: [Question or term]
BACK: [Answer or definition]

[Continue to Flashcard 12]`.trim();
}

function buildQuizPrompt(
  subject: string,
  classLevel: string,
  topic: string,
  cig: CIGContext,
): string {
  const standards = cig.examStandards.join("/") || "WAEC/NECO";
  return `You are a senior ${standards} examiner setting a short class test for ${subject}, ${classLevel}.

Topic: ${topic}
${cig.description ? `Context: ${cig.description}` : ""}

Generate a 15-question class test:
- Section A: 10 multiple-choice questions (4 options each, mark correct answer)
- Section B: 5 short-answer/theory questions

RULES:
- Align with ${standards} question style and vocabulary
- Include worked solutions for all questions
- Difficulty: mix of recall (40%), application (40%), analysis (20%)
${cig.misconceptions.length > 0 ? `- Test these common misconceptions: ${cig.misconceptions.slice(0, 2).join("; ")}` : ""}
${cig.keywords.length > 0 ? `- Cover key terms: ${cig.keywords.slice(0, 6).join(", ")}` : ""}

FORMAT:
## Section A — Multiple Choice (10 marks)

**Q1.** [Question]
A. [Option]  B. [Option]  C. [Option]  D. [Option]
**Answer: X** — [brief explanation]

[Continue Q2–Q10]

## Section B — Short Answer (15 marks)

**Q11.** [Question] (3 marks)
**Answer:** [Full solution]

[Continue Q12–Q15]`.trim();
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

  const { ok } = await rateLimit(`cig-lesson:${userId}`);
  if (!ok) {
    return Response.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 },
    );
  }

  let body: { nodeId?: string; type?: string; periods?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { nodeId, type = "lesson", periods } = body;

  if (!nodeId?.trim()) {
    return Response.json({ error: "nodeId is required" }, { status: 400 });
  }

  const node = await getNode(nodeId);
  if (!node || node.type !== "TOPIC") {
    return Response.json({ error: "Topic not found" }, { status: 404 });
  }

  const ctx = await getTopicContext(nodeId);

  const cigContext: CIGContext = {
    description: node.description ?? "",
    bloomLevels: ctx.bloomLevels,
    examStandards: ctx.examStandards,
    keywords: node.keywords,
    misconceptions: ctx.misconceptions,
    formulae: ctx.formulae,
    prerequisites: ctx.prerequisites.map((p) => p.label),
    crossSubjectConnections: ctx.crossSubjectConnections.map((c) => ({
      topic: c.node.label,
      subject: c.subject,
    })),
    difficulty: node.difficulty ?? "MEDIUM",
  };

  // classLevel stored as JS1/JS2/JS3 in DB — display as JSS1/JSS2/JSS3
  const subject = node.subject ?? "General";
  const classLevel = node.classLevel
    ? node.classLevel.replace(/^JS(\d)$/, "JSS$1")
    : "SS1";
  const topic = node.label;
  const term = node.term ?? undefined;
  const week = node.week ?? undefined;

  let prompt: string;
  let models: readonly string[];
  let maxTokens: number;

  if (type === "quiz") {
    prompt = buildQuizPrompt(subject, classLevel, topic, cigContext);
    models = EXAM_MODELS;
    maxTokens = 4000;
  } else if (type === "flashcards") {
    prompt = buildFlashcardsPrompt(subject, classLevel, topic, cigContext);
    models = LESSON_MODELS;
    maxTokens = 2000;
  } else {
    const periodCount =
      typeof periods === "number" && periods >= 1 ? Math.min(periods, 20) : 1;
    prompt = buildLessonPrompt({
      subject,
      classLevel,
      topic,
      week,
      term: term as string | undefined,
      periods: periodCount,
      cigContext,
    });
    models = LESSON_MODELS;
    maxTokens = lessonMaxTokens(periodCount);
  }

  let stream: Awaited<ReturnType<typeof openRouterStream>>;
  try {
    stream = await openRouterStream(
      models,
      [{ role: "user", content: prompt }],
      { max_tokens: maxTokens, temperature: 0.7 },
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
