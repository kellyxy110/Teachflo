import OpenAI from "openai";

export const OPENROUTER_MODELS = {
  // Core task models
  EXAM:            "deepseek/deepseek-v4-flash:free",
  REASONING:       "qwen/qwen3-next-80b-a3b-instruct:free",
  GENERAL:         "meta-llama/llama-3.3-70b-instruct:free",
  MULTIMODAL:      "google/gemma-4-31b-it:free",
  AGENT:           "moonshotai/kimi-k2.6:free",
  FRONTIER:        "nousresearch/hermes-3-llama-3.1-405b:free",
  // Extended free-tier models
  GPT_OSS:         "openai/gpt-oss-120b:free",
  NEMOTRON_ULTRA:  "nvidia/nemotron-3-ultra-550b-a55b:free",
  NEMOTRON_REASON: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  NEMOTRON_30B:    "nvidia/nemotron-3-nano-30b-a3b:free",
  NEMOTRON_12B:    "nvidia/nemotron-nano-12b-v2-vl:free",
  NEMOTRON_9B:     "nvidia/nemotron-nano-9b-v2:free",
  GEMMA_26B:       "google/gemma-4-26b-a4b-it:free",
  QWEN_CODER:      "qwen/qwen3-coder:free",
  LLAMA_3B:        "meta-llama/llama-3.2-3b-instruct:free",
} as const;

const MODEL_KEY_MAP: Record<string, string> = {
  [OPENROUTER_MODELS.EXAM]:     "OPENROUTER_KEY_DEEPSEEK",
  [OPENROUTER_MODELS.REASONING]:"OPENROUTER_KEY_QWEN",
  [OPENROUTER_MODELS.GENERAL]:  "OPENROUTER_KEY_LLAMA",
  [OPENROUTER_MODELS.MULTIMODAL]:"OPENROUTER_KEY_GEMMA",
  [OPENROUTER_MODELS.AGENT]:    "OPENROUTER_KEY_KIMI",
  [OPENROUTER_MODELS.FRONTIER]: "OPENROUTER_KEY_HERMES",
  // Extended models all fall back to shared OPENROUTER_API_KEY
};

const DEFAULT_HEADERS = {
  "HTTP-Referer": "https://teachflow-os.vercel.app",
  "X-Title": "TeachFlow OS",
};

function resolveKey(model?: string): string {
  if (model) {
    const envVar = MODEL_KEY_MAP[model];
    if (envVar) {
      const key = process.env[envVar];
      if (key) return key;
    }
  }
  const fallback = process.env.OPENROUTER_API_KEY;
  if (!fallback) {
    throw new Error("No OpenRouter API key available");
  }
  return fallback;
}

export function getOpenRouterClient(model?: string): OpenAI {
  return new OpenAI({
    apiKey: resolveKey(model),
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: DEFAULT_HEADERS,
  });
}
