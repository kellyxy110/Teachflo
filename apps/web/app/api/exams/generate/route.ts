import { buildExamPrompt } from "@teachflow/ai-prompts";
import type { ExamInput } from "@teachflow/ai-prompts";
import { safeAuth } from "@/lib/auth";
import { openRouterCompletion, EXAM_MODELS } from "@/lib/ai";
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

  const { ok } = rateLimit(`exam-gen:${userId}`);
  if (!ok) {
    return Response.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const body = await request.json();
  const { subject, classLevel, topic, examType, difficulty, mcqCount, theoryCount, advancedCount } = body;

  if (!subject || !classLevel || !topic || !examType || !difficulty) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const prompt = buildExamPrompt({
    subject,
    classLevel,
    topic,
    examType,
    difficulty,
    mcqCount: mcqCount ?? 10,
    theoryCount: theoryCount ?? 3,
    advancedCount: advancedCount ?? 2,
  } as ExamInput);

  let raw: string;
  try {
    const { completion } = await openRouterCompletion(
      EXAM_MODELS,
      [{ role: "user", content: prompt }],
      { temperature: 0.4, max_tokens: 6000, json: true }
    );
    raw = completion.choices[0]?.message?.content ?? "{}";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI generation failed";
    return Response.json({ error: msg }, { status: 502 });
  }

  let parsed: Record<string, unknown>;
  try {
    // Strip markdown code fences if a model wrapped the output
    const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return Response.json({ error: "Failed to parse AI response as JSON" }, { status: 500 });
  }

  return Response.json(parsed);
}
