import { OPENROUTER_MODELS } from "@/lib/ai/providers/openrouter";

// Ordered by preference for coding tasks.
// Primary tier: purpose-built code models (Qwen Coder, Poolside Laguna).
// Secondary tier: strong general models with good code performance.
// Tertiary tier: broad fallbacks for resilience.
export const CODING_MODELS = [
  OPENROUTER_MODELS.QWEN_CODER,      // Qwen3 Coder — primary; purpose-built for code
  OPENROUTER_MODELS.LAGUNA_M,        // Poolside Laguna M.1 — software-eng specialist
  OPENROUTER_MODELS.LAGUNA_XS,       // Poolside Laguna XS.2 — fast coding fallback
  OPENROUTER_MODELS.EXAM,            // DeepSeek V4 Flash — fast, structured output
  OPENROUTER_MODELS.AGENT,           // Kimi K2.6 — agentic, multi-step code
  OPENROUTER_MODELS.NEMOTRON_SUPER,  // Nemotron 3 Super 120B — strong code reasoning
  OPENROUTER_MODELS.GPT_OSS,
  OPENROUTER_MODELS.ARCEE_TRINITY,   // Arcee Trinity Large — solid general + code
  OPENROUTER_MODELS.NEMOTRON_ULTRA,
  OPENROUTER_MODELS.REASONING,       // Qwen3 80B
  OPENROUTER_MODELS.STEP_FLASH,      // StepFun 3.7 Flash — fast fallback
  OPENROUTER_MODELS.NEX_N2,          // Nex N2 Pro
  OPENROUTER_MODELS.FRONTIER,
  OPENROUTER_MODELS.GENERAL,
] as const;

type AssistMode = "explain" | "debug" | "hint" | "generate" | "review";

function detectMode(question: string): AssistMode {
  const q = question.toLowerCase();
  if (/\b(why|what does|how does|explain|understand|mean)\b/.test(q)) return "explain";
  if (/\b(error|bug|wrong|fail|not work|fix|crash|problem|issue)\b/.test(q)) return "debug";
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
    python: ".py",
  };
  const fileExt = ext[input.language] ?? "";

  const lessonCtx =
    input.lessonTitle
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
