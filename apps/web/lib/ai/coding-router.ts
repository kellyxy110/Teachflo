import type OpenAI from "openai";
import { getHuggingFaceClient, ORNITH_MODELS } from "./providers/huggingface";
import { getOpenRouterClient, OPENROUTER_MODELS } from "./providers/openrouter";
import { getNvidiaClient, NVIDIA_MODELS } from "./providers/nvidia";
import { getGroqClient, GROQ_MODELS } from "./providers/groq";

// ── Task Classification ───────────────────────────────────────────────────────

export type CodingTask =
  | "html_css"
  | "javascript_ts"
  | "python"
  | "debugging"
  | "explanation"
  | "generation"
  | "algorithm"
  | "review"
  | "testing"
  | "general";

// Ordered by priority — first match wins.
const TASK_PATTERNS: Array<{ task: CodingTask; pattern: RegExp }> = [
  { task: "debugging",     pattern: /\b(error|bug|wrong|fail|not work(?:ing)?|crash|fix|undefined|null pointer|exception|traceback|syntax error|cannot read|is not a function|breaks?|broken)\b/i },
  { task: "algorithm",     pattern: /\b(algorithm|sort|search|binary|O\(n|complexity|data structure|linked list|tree|graph|recursion|dynamic programming|\bdp\b|bfs|dfs|big-?o)\b/i },
  { task: "testing",       pattern: /\b(test|unit test|jest|pytest|spec|assert|mock|fixture|coverage|vitest)\b/i },
  { task: "html_css",      pattern: /\b(html|css|div|span|class[= ]|selector|flexbox|grid|margin|padding|style|layout|responsive|bootstrap|tailwind|media query|animation|transition|hover|pseudo)\b/i },
  { task: "javascript_ts", pattern: /\b(javascript|typescript|\bjs\b|\bts\b|react|next\.?js|vue|angular|node|npm|promise|async|await|fetch|dom|component|hook|state|props|const |let |var |function )\b/i },
  { task: "python",        pattern: /\b(python|\.py|def |import |pip|pandas|numpy|django|flask|fastapi|list comprehension|lambda|decorator|__init__|pytorch|tensorflow)\b/i },
  { task: "explanation",   pattern: /\b(explain|what does|how does|what is|understand|mean|tell me about|walk me through|what happens when)\b/i },
  { task: "review",        pattern: /\b(review|check|improve|feedback|better|refactor|optimis|optimiz|clean up|best practice)\b/i },
  { task: "generation",    pattern: /\b(write|generate|create|build|make|code for|give me|scaffold|implement)\b/i },
];

export function classifyCodingTask(question: string): CodingTask {
  for (const { task, pattern } of TASK_PATTERNS) {
    if (pattern.test(question)) return task;
  }
  return "general";
}

// ── Provider Entry Types ──────────────────────────────────────────────────────

interface ModelEntry {
  provider: "huggingface" | "openrouter" | "nvidia" | "groq";
  model: string;
  label: string;
}

function clientForEntry(entry: ModelEntry): OpenAI {
  switch (entry.provider) {
    case "huggingface": return getHuggingFaceClient();
    case "openrouter":  return getOpenRouterClient(entry.model);
    case "nvidia":      return getNvidiaClient();
    case "groq":        return getGroqClient();
  }
}

// ── Route Config ──────────────────────────────────────────────────────────────
// To add a new model: insert a ModelEntry into the relevant task array.
// Order = priority. Ornith 35B leads all coding-heavy chains.

const ROUTES: Record<CodingTask, ModelEntry[]> = {
  html_css: [
    { provider: "huggingface", model: ORNITH_MODELS.ORNITH_35B,           label: "Ornith 35B" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.QWEN_CODER,       label: "Qwen3 Coder" },
    { provider: "nvidia",      model: NVIDIA_MODELS.QWEN_CODER_32B,       label: "NVIDIA Qwen Coder" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.LAGUNA_M,         label: "Laguna M.1" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.EXAM,             label: "DeepSeek V4 Flash" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.AGENT,            label: "Kimi K2.6" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.ARCEE_TRINITY,    label: "Arcee Trinity" },
    { provider: "groq",        model: GROQ_MODELS.TEACHING,               label: "Groq Llama 70B" },
  ],
  javascript_ts: [
    { provider: "huggingface", model: ORNITH_MODELS.ORNITH_35B,           label: "Ornith 35B" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.EXAM,             label: "DeepSeek V4 Flash" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.QWEN_CODER,       label: "Qwen3 Coder" },
    { provider: "nvidia",      model: NVIDIA_MODELS.QWEN_CODER_32B,       label: "NVIDIA Qwen Coder" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.LAGUNA_M,         label: "Laguna M.1" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.AGENT,            label: "Kimi K2.6" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.ARCEE_TRINITY,    label: "Arcee Trinity" },
    { provider: "groq",        model: GROQ_MODELS.TEACHING,               label: "Groq Llama 70B" },
  ],
  python: [
    { provider: "huggingface", model: ORNITH_MODELS.ORNITH_35B,           label: "Ornith 35B" },
    { provider: "nvidia",      model: NVIDIA_MODELS.DEEPSEEK_R1,          label: "NVIDIA DeepSeek R1" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.EXAM,             label: "DeepSeek V4 Flash" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.QWEN_CODER,       label: "Qwen3 Coder" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.AGENT,            label: "Kimi K2.6" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.NEMOTRON_SUPER,   label: "Nemotron Super" },
    { provider: "groq",        model: GROQ_MODELS.TEACHING,               label: "Groq Llama 70B" },
  ],
  debugging: [
    { provider: "huggingface", model: ORNITH_MODELS.ORNITH_397B,          label: "Ornith 397B" },
    { provider: "nvidia",      model: NVIDIA_MODELS.DEEPSEEK_R1,          label: "NVIDIA DeepSeek R1" },
    { provider: "huggingface", model: ORNITH_MODELS.ORNITH_35B,           label: "Ornith 35B" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.EXAM,             label: "DeepSeek V4 Flash" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.FRONTIER,         label: "Hermes 3 405B" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.REASONING,        label: "Qwen3 80B" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.AGENT,            label: "Kimi K2.6" },
    { provider: "groq",        model: GROQ_MODELS.TEACHING,               label: "Groq Llama 70B" },
  ],
  algorithm: [
    { provider: "huggingface", model: ORNITH_MODELS.ORNITH_397B,          label: "Ornith 397B" },
    { provider: "nvidia",      model: NVIDIA_MODELS.DEEPSEEK_R1,          label: "NVIDIA DeepSeek R1" },
    { provider: "huggingface", model: ORNITH_MODELS.ORNITH_35B,           label: "Ornith 35B" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.REASONING,        label: "Qwen3 80B" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.FRONTIER,         label: "Hermes 3 405B" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.NEMOTRON_ULTRA,   label: "Nemotron Ultra" },
    { provider: "groq",        model: GROQ_MODELS.TEACHING,               label: "Groq Llama 70B" },
  ],
  explanation: [
    { provider: "huggingface", model: ORNITH_MODELS.ORNITH_9B,            label: "Ornith 9B" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.AGENT,            label: "Kimi K2.6" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.GENERAL,          label: "Llama 3.3 70B" },
    { provider: "huggingface", model: ORNITH_MODELS.ORNITH_35B,           label: "Ornith 35B" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.NEMOTRON_SUPER,   label: "Nemotron Super" },
    { provider: "groq",        model: GROQ_MODELS.TEACHING,               label: "Groq Llama 70B" },
  ],
  generation: [
    { provider: "huggingface", model: ORNITH_MODELS.ORNITH_35B,           label: "Ornith 35B" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.QWEN_CODER,       label: "Qwen3 Coder" },
    { provider: "nvidia",      model: NVIDIA_MODELS.QWEN_CODER_32B,       label: "NVIDIA Qwen Coder" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.LAGUNA_M,         label: "Laguna M.1" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.EXAM,             label: "DeepSeek V4 Flash" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.AGENT,            label: "Kimi K2.6" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.ARCEE_TRINITY,    label: "Arcee Trinity" },
    { provider: "groq",        model: GROQ_MODELS.TEACHING,               label: "Groq Llama 70B" },
  ],
  review: [
    { provider: "huggingface", model: ORNITH_MODELS.ORNITH_35B,           label: "Ornith 35B" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.ARCEE_TRINITY,    label: "Arcee Trinity" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.QWEN_CODER,       label: "Qwen3 Coder" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.EXAM,             label: "DeepSeek V4 Flash" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.FRONTIER,         label: "Hermes 3 405B" },
    { provider: "groq",        model: GROQ_MODELS.TEACHING,               label: "Groq Llama 70B" },
  ],
  testing: [
    { provider: "huggingface", model: ORNITH_MODELS.ORNITH_35B,           label: "Ornith 35B" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.QWEN_CODER,       label: "Qwen3 Coder" },
    { provider: "nvidia",      model: NVIDIA_MODELS.QWEN_CODER_32B,       label: "NVIDIA Qwen Coder" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.LAGUNA_XS,        label: "Laguna XS.2" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.EXAM,             label: "DeepSeek V4 Flash" },
    { provider: "groq",        model: GROQ_MODELS.TEACHING,               label: "Groq Llama 70B" },
  ],
  general: [
    { provider: "huggingface", model: ORNITH_MODELS.ORNITH_35B,           label: "Ornith 35B" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.QWEN_CODER,       label: "Qwen3 Coder" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.LAGUNA_M,         label: "Laguna M.1" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.EXAM,             label: "DeepSeek V4 Flash" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.AGENT,            label: "Kimi K2.6" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.NEMOTRON_SUPER,   label: "Nemotron Super" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.GPT_OSS,          label: "GPT OSS 120B" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.ARCEE_TRINITY,    label: "Arcee Trinity" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.FRONTIER,         label: "Hermes 3 405B" },
    { provider: "openrouter",  model: OPENROUTER_MODELS.GENERAL,          label: "Llama 3.3 70B" },
    { provider: "groq",        model: GROQ_MODELS.TEACHING,               label: "Groq Llama 70B" },
  ],
};

// ── Streaming ─────────────────────────────────────────────────────────────────

const CODING_TIMEOUT_MS = 15_000; // 15s — longer than main router for complex code tasks

export interface CodingStreamResult {
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk> & { controller: AbortController };
  modelUsed: string;
  providerUsed: string;
  taskType: CodingTask;
  fallbackCount: number;
}

export async function codingStream(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  task: CodingTask,
  opts: { max_tokens?: number; temperature?: number } = {}
): Promise<CodingStreamResult> {
  const entries = ROUTES[task] ?? ROUTES.general;
  let fallbackCount = 0;
  let lastError: Error | null = null;

  for (const entry of entries) {
    try {
      const client = clientForEntry(entry);
      const stream = await client.chat.completions.create(
        {
          model: entry.model,
          messages,
          stream: true,
          temperature: opts.temperature ?? 0.5,
          max_tokens: opts.max_tokens ?? 800,
        },
        { signal: AbortSignal.timeout(CODING_TIMEOUT_MS) }
      ) as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk> & { controller: AbortController };

      return {
        stream,
        modelUsed: entry.model,
        providerUsed: entry.provider,
        taskType: task,
        fallbackCount,
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      fallbackCount++;
    }
  }

  throw lastError ?? new Error("All coding models failed");
}

// ── Prompt Builder ────────────────────────────────────────────────────────────

type AssistMode = "explain" | "debug" | "hint" | "generate" | "review";

function detectMode(question: string): AssistMode {
  const q = question.toLowerCase();
  if (/\b(why|what does|how does|explain|understand|mean)\b/.test(q)) return "explain";
  if (/\b(error|bug|wrong|fail|not work|fix|crash|problem|issue|broken)\b/.test(q)) return "debug";
  if (/\b(hint|help me|where do i|what should|stuck|next step)\b/.test(q)) return "hint";
  if (/\b(write|generate|create|build|make|code for|give me)\b/.test(q)) return "generate";
  return "review";
}

const MODE_INSTRUCTIONS: Record<AssistMode, string> = {
  explain:
    "Explain clearly what this code does. Use simple language suitable for a secondary school student. If the code has multiple parts, explain each section briefly.",
  debug:
    "Identify the bug or error in this code. Explain what is wrong, why it happens, and show the corrected version with clear annotations on what changed.",
  hint:
    "Give a helpful hint WITHOUT giving the full solution. Guide the student toward solving it themselves using leading questions or a small nudge.",
  generate:
    "Write the requested code. Keep it beginner-friendly, well-commented, and appropriate for a Nigerian secondary school coding lab. Explain what the code does after writing it.",
  review:
    "Review this code for correctness, style, and best practices. Point out any issues and suggest specific improvements. Be encouraging.",
};

export interface CodingAssistInput {
  code: string;
  language: string;
  question: string;
  lessonTitle?: string;
  lessonInstruction?: string;
}

export function buildCodingAssistPrompt(input: CodingAssistInput): string {
  const mode = detectMode(input.question);
  const ext: Record<string, string> = {
    html: ".html",
    css: ".css",
    javascript: ".js",
    typescript: ".ts",
    python: ".py",
  };
  const fileExt = ext[input.language] ?? "";

  const lessonCtx = input.lessonTitle
    ? `LESSON: "${input.lessonTitle}"${input.lessonInstruction ? `\nTASK: ${input.lessonInstruction}` : ""}\n`
    : "";

  return `You are a friendly coding tutor in a Nigerian secondary school coding lab.
Students are learning ${input.language.toUpperCase()} at beginner to intermediate level.

${lessonCtx}STUDENT'S ${input.language.toUpperCase()} CODE (${fileExt}):
\`\`\`${input.language}
${input.code || "(no code written yet)"}
\`\`\`

STUDENT'S QUESTION: ${input.question}

INSTRUCTIONS:
${MODE_INSTRUCTIONS[mode]}

RESPONSE RULES:
- Be encouraging and positive — this is a learning environment
- Use simple, clear language appropriate for a 12–18 year old
- Where helpful, ground examples in everyday Nigerian life (market, phone, school, etc.)
- If showing code, use a proper code block
- Keep response under 350 words unless a full solution is genuinely needed
- Never start with "Certainly!", "Great question!", or "Absolutely!"
- Be direct — do not pad with unnecessary preamble`.trim();
}
