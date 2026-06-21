import OpenAI from "openai";

// ── Groq (Study Buddy fallback, lesson rewriting) ────────────────────────
export const GROQ_MODEL = "llama-3.3-70b-versatile";

export function getGroqClient(): OpenAI {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set");
  }
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

// ── OpenRouter (per-model keys, fallback to shared key) ──────────────────
export const OPENROUTER_EXAM_MODEL = "deepseek/deepseek-v4-flash:free";
export const OPENROUTER_LESSON_MODEL = "qwen/qwen3-next-80b-a3b-instruct:free";

export function getOpenRouterClient(model?: string): OpenAI {
  const MODEL_KEY_MAP: Record<string, string> = {
    "deepseek/deepseek-v4-flash:free": "OPENROUTER_KEY_DEEPSEEK",
    "qwen/qwen3-next-80b-a3b-instruct:free": "OPENROUTER_KEY_QWEN",
    "meta-llama/llama-3.3-70b-instruct:free": "OPENROUTER_KEY_LLAMA",
    "google/gemma-4-31b-it:free": "OPENROUTER_KEY_GEMMA",
    "moonshotai/kimi-k2.6:free": "OPENROUTER_KEY_KIMI",
    "nousresearch/hermes-3-llama-3.1-405b:free": "OPENROUTER_KEY_HERMES",
  };

  let apiKey: string | undefined;
  if (model) {
    const envVar = MODEL_KEY_MAP[model];
    if (envVar) apiKey = process.env[envVar];
  }
  if (!apiKey) apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("No OpenRouter API key available");

  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://teachflow-os.vercel.app",
      "X-Title": "TeachFlow OS",
    },
  });
}
