import OpenAI from "openai";
import { buildExamPrompt } from "@teachflow/ai-prompts";
import type { ExamInput } from "@teachflow/ai-prompts";
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

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
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
