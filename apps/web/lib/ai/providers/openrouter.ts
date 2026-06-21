import OpenAI from "openai";

export const OPENROUTER_MODELS = {
  EXAM: "deepseek/deepseek-v4-flash:free",
  REASONING: "qwen/qwen3-next-80b-a3b-instruct:free",
  GENERAL: "meta-llama/llama-3.3-70b-instruct:free",
  MULTIMODAL: "google/gemma-4-31b-it:free",
  AGENT: "moonshotai/kimi-k2.6:free",
  FRONTIER: "nousresearch/hermes-3-llama-3.1-405b:free",
} as const;

const MODEL_KEY_MAP: Record<string, string> = {
  [OPENROUTER_MODELS.EXAM]: "OPENROUTER_KEY_DEEPSEEK",
  [OPENROUTER_MODELS.REASONING]: "OPENROUTER_KEY_QWEN",
  [OPENROUTER_MODELS.GENERAL]: "OPENROUTER_KEY_LLAMA",
  [OPENROUTER_MODELS.MULTIMODAL]: "OPENROUTER_KEY_GEMMA",
  [OPENROUTER_MODELS.AGENT]: "OPENROUTER_KEY_KIMI",
  [OPENROUTER_MODELS.FRONTIER]: "OPENROUTER_KEY_HERMES",
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
