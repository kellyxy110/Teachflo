import { getOpenRouterClient, OPENROUTER_MODELS } from "@/lib/ai/providers/openrouter";
import { getGroqClient, GROQ_MODELS } from "@/lib/ai/providers/groq";
import { retrieveRAGContext } from "@/lib/rag/retriever";
import type { ExamBlueprint, GeneratedQuestion, DifficultyLevel, BloomLevel } from "./types";

interface ModelConfig {
  getClient: () => import("openai").default;
  model: string;
}

const MODEL_MAP: Record<string, ModelConfig> = {
  MCQ: { getClient: getOpenRouterClient, model: OPENROUTER_MODELS.EXAM },
  SHORT_ANSWER: { getClient: getOpenRouterClient, model: OPENROUTER_MODELS.REASONING },
  STRUCTURED: { getClient: getGroqClient, model: GROQ_MODELS.TEACHING },
  DOCUMENT: { getClient: getOpenRouterClient, model: OPENROUTER_MODELS.MULTIMODAL },
  COMPLEX: { getClient: getOpenRouterClient, model: OPENROUTER_MODELS.FRONTIER },
};

export async function generateQuestionsFromBlueprint(
  blueprint: ExamBlueprint,
  schoolId?: string
): Promise<GeneratedQuestion[]> {
  let ragContext = "";
  if (blueprint.ragAvailable && schoolId) {
    try {
      const chunks = await retrieveRAGContext(
        `${blueprint.subject} ${blueprint.topic} exam questions`,
        schoolId,
        5
      );
      if (chunks.length > 0) {
        ragContext = chunks.map((c) => c.content).join("\n\n---\n\n");
      }
    } catch {
      // RAG not available — proceed without
    }
  }

  const mcqCount = Math.ceil(blueprint.totalQuestions * 0.6);
  const theoryCount = Math.ceil(blueprint.totalQuestions * 0.25);
  const structuredCount = blueprint.totalQuestions - mcqCount - theoryCount;

  const batches = [
    { type: "MCQ" as const, count: mcqCount },
    { type: "SHORT_ANSWER" as const, count: theoryCount },
    { type: "STRUCTURED" as const, count: structuredCount },
  ].filter((b) => b.count > 0);

  const results: GeneratedQuestion[] = [];

  for (const batch of batches) {
    const questions = await generateBatch(batch.type, batch.count, blueprint, ragContext);
    results.push(...questions);
  }

  return results;
}

export async function generateSingleAdaptiveQuestion(
  blueprint: ExamBlueprint,
  difficulty: DifficultyLevel,
  targetSkill: string,
  excludeIds: string[],
  schoolId?: string
): Promise<GeneratedQuestion> {
  let ragContext = "";
  if (blueprint.ragAvailable && schoolId) {
    try {
      const chunks = await retrieveRAGContext(
        `${blueprint.subject} ${targetSkill} ${difficulty}`,
        schoolId,
        3
      );
      if (chunks.length > 0) {
        ragContext = chunks.map((c) => c.content).join("\n\n---\n\n");
      }
    } catch { /* proceed without RAG */ }
  }

  const prompt = buildSingleQuestionPrompt(blueprint, difficulty, targetSkill, ragContext);
  const config = MODEL_MAP.MCQ;
  const client = config.getClient();

  const completion = await client.chat.completions.create({
    model: config.model,
    messages: [
      {
        role: "system",
        content: "You are an expert Nigerian curriculum exam question generator. Return ONLY valid JSON. No markdown.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.6,
    max_tokens: 1500,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);

  return normalizeQuestion(parsed, difficulty, targetSkill, blueprint.topic, ragContext ? "RAG" : "synthetic");
}

async function generateBatch(
  type: "MCQ" | "SHORT_ANSWER" | "STRUCTURED",
  count: number,
  blueprint: ExamBlueprint,
  ragContext: string
): Promise<GeneratedQuestion[]> {
  const prompt = buildBatchPrompt(type, count, blueprint, ragContext);
  const config = MODEL_MAP[type] ?? MODEL_MAP.MCQ;
  const client = config.getClient();

  try {
    const completion = await client.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: "system",
          content: "You are an expert Nigerian curriculum exam question generator for WAEC/JAMB/JUPEB. Return ONLY valid JSON. No markdown, no explanation.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 6000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    const questions: GeneratedQuestion[] = [];

    const arr = Array.isArray(parsed.questions) ? parsed.questions : [parsed];
    for (const q of arr) {
      questions.push(
        normalizeQuestion(q, q.difficulty ?? "medium", q.skillTag ?? blueprint.topic, blueprint.topic, ragContext ? "RAG" : "synthetic")
      );
    }

    return questions;
  } catch {
    return [];
  }
}

function buildBatchPrompt(
  type: "MCQ" | "SHORT_ANSWER" | "STRUCTURED",
  count: number,
  bp: ExamBlueprint,
  ragContext: string
): string {
  const diffDist = Object.entries(bp.difficultyDistribution)
    .map(([d, n]) => `${d}: ${n}`)
    .join(", ");

  const bloomDist = Object.entries(bp.bloomDistribution)
    .map(([b, n]) => `${b}: ${n}`)
    .join(", ");

  const typeInstructions: Record<string, string> = {
    MCQ: `Each question must be MCQ with options A, B, C, D and one correct answer.
Include "distractorAnalysis" explaining why each wrong option is a common mistake.`,
    SHORT_ANSWER: `Each question must be a short answer/theory question.
Include a "markScheme" with expected answer points.`,
    STRUCTURED: `Each question must be a step-by-step structured/calculation question.
Include a detailed "solution" showing each step clearly.`,
  };

  return `Generate ${count} ${type} questions for Nigerian secondary school.

Subject: ${bp.subject}
Class: ${bp.classLevel}
Topic: ${bp.topic}
Difficulty distribution: ${diffDist}
Bloom's taxonomy distribution: ${bloomDist}
${bp.weakSkills.length > 0 ? `Focus on weak skills: ${bp.weakSkills.join(", ")}` : ""}
${bp.syllabusTopics.length > 1 ? `Cover these topics: ${bp.syllabusTopics.join(", ")}` : ""}

${typeInstructions[type]}

${ragContext ? `Use this syllabus/document context:\n${ragContext}\n` : ""}

Return a JSON object:
{
  "questions": [
    {
      "stem": "question text",
      "type": "${type}",
      ${type === "MCQ" ? '"optionA": "...", "optionB": "...", "optionC": "...", "optionD": "...", "correctOption": "A|B|C|D",' : ""}
      "solution": "full solution",
      "explanation": "why the answer is correct",
      "difficulty": "easy|medium|hard",
      "bloomLevel": "REMEMBER|UNDERSTAND|APPLY|ANALYZE|EVALUATE|CREATE",
      "skillTag": "specific-skill",
      "topicTag": "topic",
      "subTopicTag": "sub-topic",
      "estimatedTime": 90,
      "commonMistakes": "common error students make"
      ${type === "MCQ" ? ', "distractorAnalysis": {"A": "why A", "B": "why B", "C": "why C", "D": "why D"}' : ""}
    }
  ]
}`;
}

function buildSingleQuestionPrompt(
  bp: ExamBlueprint,
  difficulty: DifficultyLevel,
  targetSkill: string,
  ragContext: string
): string {
  return `Generate 1 MCQ question for Nigerian secondary school.

Subject: ${bp.subject}
Class: ${bp.classLevel}
Topic: ${bp.topic}
Target skill: ${targetSkill}
Difficulty: ${difficulty}

${ragContext ? `Document context:\n${ragContext}\n` : ""}

Return a JSON object:
{
  "stem": "question text",
  "type": "MCQ",
  "optionA": "...", "optionB": "...", "optionC": "...", "optionD": "...",
  "correctOption": "A|B|C|D",
  "solution": "full solution",
  "explanation": "why correct",
  "difficulty": "${difficulty}",
  "bloomLevel": "REMEMBER|UNDERSTAND|APPLY|ANALYZE|EVALUATE|CREATE",
  "skillTag": "${targetSkill}",
  "topicTag": "${bp.topic}",
  "subTopicTag": "specific subtopic",
  "estimatedTime": 90,
  "commonMistakes": "common mistake",
  "distractorAnalysis": {"A": "...", "B": "...", "C": "...", "D": "..."}
}`;
}

function normalizeQuestion(
  raw: Record<string, unknown>,
  difficulty: DifficultyLevel,
  skill: string,
  topic: string,
  source: "syllabus" | "RAG" | "synthetic"
): GeneratedQuestion {
  const validBlooms: BloomLevel[] = ["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"];
  const bloom = validBlooms.includes(raw.bloomLevel as BloomLevel)
    ? (raw.bloomLevel as BloomLevel)
    : "UNDERSTAND";

  const validDiffs: DifficultyLevel[] = ["easy", "medium", "hard"];
  const diff = validDiffs.includes(raw.difficulty as DifficultyLevel)
    ? (raw.difficulty as DifficultyLevel)
    : difficulty;

  return {
    stem: String(raw.stem || raw.question || ""),
    type: (raw.type as "MCQ" | "SHORT_ANSWER" | "STRUCTURED") ?? "MCQ",
    optionA: raw.optionA ? String(raw.optionA) : undefined,
    optionB: raw.optionB ? String(raw.optionB) : undefined,
    optionC: raw.optionC ? String(raw.optionC) : undefined,
    optionD: raw.optionD ? String(raw.optionD) : undefined,
    correctOption: raw.correctOption ? String(raw.correctOption) : undefined,
    solution: String(raw.solution || ""),
    explanation: String(raw.explanation || ""),
    difficulty: diff,
    bloomLevel: bloom,
    skillTag: String(raw.skillTag || skill),
    topicTag: String(raw.topicTag || topic),
    subTopicTag: String(raw.subTopicTag || ""),
    source,
    estimatedTime: Number(raw.estimatedTime) || 90,
    distractorAnalysis: raw.distractorAnalysis as Record<string, string> | undefined,
    commonMistakes: raw.commonMistakes ? String(raw.commonMistakes) : undefined,
  };
}
