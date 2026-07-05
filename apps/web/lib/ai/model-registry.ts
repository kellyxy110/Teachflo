/**
 * TeachNexis AI Model Registry
 *
 * Central reference for all AI model configurations, capabilities, routing,
 * and evaluation status. No model is hard-coded into business logic — all
 * routing tables (LESSON_MODELS, EXAM_MODELS, etc.) are built from this file.
 *
 * To add a model to production routing: set its status to "production" and
 * add it to the relevant capability array below.
 *
 * To evaluate a candidate: set status to "evaluation" and set the corresponding
 * env var so requests route to it during A/B testing.
 */

export type ModelProvider = "openrouter" | "huggingface" | "nebius" | "groq" | "ollama";
export type ModelStatus   = "production" | "evaluation" | "pending" | "rejected";
export type ModelCapability =
  | "lesson-generation"
  | "exam-generation"
  | "document-analysis"
  | "coding"
  | "agent-workflow"
  | "embedding"
  | "reasoning";

export interface ModelEntry {
  id: string;               // The model ID used in API calls
  name: string;             // Human-readable name
  provider: ModelProvider;
  status: ModelStatus;
  capabilities: ModelCapability[];
  contextWindow: number;    // Input context in tokens
  maxOutput: number;        // Max output tokens (0 = unknown/model limit)
  envVar?: string;          // Env var to override the model ID at runtime
  notes?: string;
}

export const MODEL_REGISTRY: ModelEntry[] = [
  // ── Production models ─────────────────────────────────────────────────

  {
    id: "qwen/qwen3-next-80b-a3b-instruct:free",
    name: "Qwen3 80B (Primary Lesson Model)",
    provider: "openrouter",
    status: "production",
    capabilities: ["lesson-generation", "exam-generation", "reasoning"],
    contextWindow: 32768,
    maxOutput: 8192,
    notes: "Primary for lesson notes — strong structured markdown, good Nigerian curriculum alignment",
  },
  {
    id: "deepseek/deepseek-v4-flash:free",
    name: "DeepSeek V4 Flash (Primary Exam Model)",
    provider: "openrouter",
    status: "production",
    capabilities: ["exam-generation", "reasoning"],
    contextWindow: 32768,
    maxOutput: 8192,
    notes: "Primary for exam JSON generation — fast, strong JSON mode reliability",
  },
  {
    id: "minimax/minimax-m3:free",
    name: "MiniMax M3",
    provider: "openrouter",
    status: "production",
    capabilities: ["lesson-generation", "document-analysis"],
    contextWindow: 40960,
    maxOutput: 8192,
    notes: "Fallback 1 for lesson generation — long context, good structured output",
  },
  {
    id: "anthropic/claude-sonnet-4.5:free",
    name: "Claude Sonnet 4.5",
    provider: "openrouter",
    status: "production",
    capabilities: ["lesson-generation", "exam-generation", "reasoning"],
    contextWindow: 200000,
    maxOutput: 16000,
    notes: "Highest quality fallback — excellent lesson note quality when available",
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B (Groq)",
    provider: "groq",
    status: "production",
    capabilities: ["lesson-generation", "exam-generation"],
    contextWindow: 128000,
    maxOutput: 32768,
    notes: "Last-resort fallback via Groq — very fast inference, reliable availability",
  },

  // ── Candidate models under evaluation ────────────────────────────────

  {
    id: "zai-org/GLM-5.2",
    name: "GLM-5.2 (ZAI)",
    provider: "huggingface",
    status: "evaluation",
    capabilities: ["lesson-generation", "reasoning"],
    contextWindow: 128000,
    maxOutput: 8192,
    envVar: "EVAL_MODEL_GLM_52",
    notes: "Strong multilingual model; evaluate for Yoruba/Igbo/Hausa lesson content",
  },
  {
    id: "nvidia/Qwen3.6-27B-NVFP4",
    name: "Qwen 3.6 27B NVFP4 (NVIDIA NIM)",
    provider: "nebius",
    status: "evaluation",
    capabilities: ["lesson-generation", "exam-generation", "reasoning"],
    contextWindow: 32768,
    maxOutput: 8192,
    envVar: "EVAL_MODEL_QWEN_NVFP4",
    notes: "NVIDIA FP4 quantized — evaluate for speed/quality tradeoff vs Qwen3 80B",
  },
  {
    id: "deepseek-ai/DeepSeek-V4-Pro-DSpark",
    name: "DeepSeek V4 Pro DSpark",
    provider: "huggingface",
    status: "evaluation",
    capabilities: ["exam-generation", "reasoning"],
    contextWindow: 65536,
    maxOutput: 8192,
    envVar: "EVAL_MODEL_DEEPSEEK_SPARK",
    notes: "Evaluate for exam generation and mathematical reasoning vs DeepSeek V4 Flash",
  },
  {
    id: "InternScience/Agents-A1",
    name: "Agents-A1 (InternScience)",
    provider: "huggingface",
    status: "evaluation",
    capabilities: ["agent-workflow"],
    contextWindow: 32768,
    maxOutput: 4096,
    envVar: "EVAL_MODEL_AGENTS_A1",
    notes: "Agent-specialised — evaluate for workflow orchestration and tool-use tasks only",
  },
  {
    id: "Qwen/Qwen-AgentWorld-35B-A3B",
    name: "Qwen AgentWorld 35B",
    provider: "huggingface",
    status: "evaluation",
    capabilities: ["agent-workflow", "reasoning"],
    contextWindow: 32768,
    maxOutput: 8192,
    envVar: "EVAL_MODEL_QWEN_AGENT",
    notes: "Agent-world model — evaluate for multi-step lesson planning workflows",
  },
  {
    id: "yuxinlu1/gemma-4-12B-agentic-fable5-composer2.5-v2-3.5x-tau2-GGUF",
    name: "Gemma 4 12B Agentic (GGUF)",
    provider: "ollama",
    status: "pending",
    capabilities: ["lesson-generation"],
    contextWindow: 8192,
    maxOutput: 4096,
    envVar: "EVAL_MODEL_GEMMA_AGENTIC",
    notes: "Requires local Ollama — set OLLAMA_BASE_URL. Evaluate for offline/self-hosted deployment",
  },
  {
    id: "deepreinforce-ai/Ornith-1.0-9B-GGUF",
    name: "Ornith 1.0 9B (GGUF)",
    provider: "ollama",
    status: "pending",
    capabilities: ["lesson-generation"],
    contextWindow: 8192,
    maxOutput: 4096,
    envVar: "EVAL_MODEL_ORNITH_GGUF",
    notes: "Local GGUF variant of Ornith. HF API version already integrated — evaluate GGUF for latency",
  },
  {
    id: "empero-ai/Qwythos-9B-Claude-Mythos-5-1M",
    name: "Qwythos 9B (1M context)",
    provider: "huggingface",
    status: "pending",
    capabilities: ["lesson-generation"],
    contextWindow: 1000000,
    maxOutput: 8192,
    envVar: "EVAL_MODEL_QWYTHOS",
    notes: "1M context window — evaluate for full curriculum document ingestion in a single call",
  },

  // ── Embedding / retrieval models ──────────────────────────────────────
  // These are NOT used for text generation — they power vector search in the RAG pipeline.

  {
    id: "nvidia/Nemotron-Labs-TwoTower-30B-A3B-Base-BF16",
    name: "Nemotron TwoTower 30B (Embedding)",
    provider: "huggingface",
    status: "evaluation",
    capabilities: ["embedding"],
    contextWindow: 8192,
    maxOutput: 0, // Embedding model — no text output
    envVar: "EVAL_EMBEDDING_MODEL",
    notes: "Bi-encoder retrieval model — evaluate vs Jina v3 for RAG chunk similarity scoring",
  },
];

/**
 * Look up a model entry by its ID.
 */
export function getModelEntry(id: string): ModelEntry | undefined {
  return MODEL_REGISTRY.find((m) => m.id === id);
}

/**
 * Get all models for a given capability in a given status.
 */
export function getModelsForCapability(
  capability: ModelCapability,
  status?: ModelStatus
): ModelEntry[] {
  return MODEL_REGISTRY.filter(
    (m) =>
      m.capabilities.includes(capability) &&
      (status === undefined || m.status === status)
  );
}

/**
 * Benchmark prompt set — run these against every candidate to score quality.
 * Use identical prompts for fair comparison. Score 1–5 on each dimension.
 */
export const BENCHMARK_PROMPTS = {
  lesson: {
    subject: "Mathematics",
    classLevel: "SS2",
    topic: "Quadratic Equations",
    periods: 1,
    term: "FIRST",
    week: 3,
  },
  exam: {
    subject: "Physics",
    classLevel: "SS3",
    topic: "Electromagnetic Induction",
    examType: "WAEC_MOCK",
    difficulty: "WAEC",
    mcqCount: 10,
    theoryCount: 3,
    advancedCount: 2,
  },
} as const;

export const BENCHMARK_CRITERIA = [
  "lesson_quality",       // Depth, completeness, Nigerian context accuracy
  "math_accuracy",        // Correct formulae, solutions, no arithmetic errors
  "science_accuracy",     // Correct scientific facts, proper notation
  "waec_alignment",       // How closely output matches WAEC mark schemes
  "json_reliability",     // For exam generation: valid JSON, correct schema
  "long_form_completion", // Whether full content generates without truncation
  "speed_tokens_per_sec", // Measured streaming rate
  "stability",            // Error rate across 10 runs on same prompt
] as const;
