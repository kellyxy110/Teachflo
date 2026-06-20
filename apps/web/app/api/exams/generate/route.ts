import { buildExamPrompt } from "@teachflow/ai-prompts";
import type { ExamInput } from "@teachflow/ai-prompts";
import { safeAuth } from "@/lib/auth";
import { getOpenRouterClient, OPENROUTER_EXAM_MODEL } from "@/lib/ai";
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

  const completion = await getOpenRouterClient().chat.completions.create({
    model: OPENROUTER_EXAM_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_tokens: 6000,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Failed to parse AI response as JSON" }, { status: 500 });
  }

  return Response.json(parsed);
}
