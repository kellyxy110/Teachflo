import OpenAI from "openai";

// ── Groq (lesson rewriting, fast fallback) ───────────────────────────────
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

// ── OpenRouter client ────────────────────────────────────────────────────
export const OPENROUTER_EXAM_MODEL   = "deepseek/deepseek-v4-flash:free";
export const OPENROUTER_LESSON_MODEL = "qwen/qwen3-next-80b-a3b-instruct:free";

const MODEL_KEY_MAP: Record<string, string> = {
  "deepseek/deepseek-v4-flash:free":            "OPENROUTER_KEY_DEEPSEEK",
  "qwen/qwen3-next-80b-a3b-instruct:free":      "OPENROUTER_KEY_QWEN",
  "meta-llama/llama-3.3-70b-instruct:free":     "OPENROUTER_KEY_LLAMA",
  "google/gemma-4-31b-it:free":                 "OPENROUTER_KEY_GEMMA",
  "moonshotai/kimi-k2.6:free":                  "OPENROUTER_KEY_KIMI",
  "nousresearch/hermes-3-llama-3.1-405b:free":  "OPENROUTER_KEY_HERMES",
};

export function getOpenRouterClient(model?: string): OpenAI {
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

// ── Model fallback lists ─────────────────────────────────────────────────
// Ordered by preference. All free-tier via OpenRouter.
// If the primary model is unavailable/rate-limited, the next is tried.

export const LESSON_MODELS = [
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "openai/gpt-oss-120b:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
] as const;

export const EXAM_MODELS = [
  "deepseek/deepseek-v4-flash:free",
  "openai/gpt-oss-120b:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "meta-llama/llama-3.3-70b-instruct:free",
] as const;

export const DOCUMENT_MODELS = [
  "google/gemma-4-31b-it:free",
  "openai/gpt-oss-120b:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
] as const;

// ── Fallback helpers ─────────────────────────────────────────────────────

type Messages = OpenAI.Chat.Completions.ChatCompletionMessageParam[];

interface StreamOpts {
  temperature?: number;
  max_tokens?: number;
}

interface CompletionOpts extends StreamOpts {
  json?: boolean;
}

/**
 * Tries each model in order, returning the first successful stream.
 * Falls back to Groq if all OpenRouter models fail.
 */
export async function openRouterStream(
  models: readonly string[],
  messages: Messages,
  opts: StreamOpts = {}
): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk> & { controller: AbortController }> {
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const stream = await getOpenRouterClient(model).chat.completions.create({
        model,
        messages,
        stream: true,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.max_tokens ?? 2000,
      });
      return stream;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  // Final fallback: Groq
  if (process.env.GROQ_API_KEY) {
    try {
      const stream = await getGroqClient().chat.completions.create({
        model: GROQ_MODEL,
        messages,
        stream: true,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.max_tokens ?? 2000,
      });
      return stream;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError ?? new Error("All AI models failed");
}

/**
 * Tries each model in order, returning the first successful completion.
 * Falls back to Groq if all OpenRouter models fail.
 */
export async function openRouterCompletion(
  models: readonly string[],
  messages: Messages,
  opts: CompletionOpts = {}
): Promise<{ completion: OpenAI.Chat.Completions.ChatCompletion; model: string }> {
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const completion = await getOpenRouterClient(model).chat.completions.create({
        model,
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.max_tokens ?? 6000,
        ...(opts.json ? { response_format: { type: "json_object" as const } } : {}),
      });
      return { completion, model };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  // Final fallback: Groq (without json_object — Groq doesn't guarantee it)
  if (process.env.GROQ_API_KEY) {
    try {
      const completion = await getGroqClient().chat.completions.create({
        model: GROQ_MODEL,
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.max_tokens ?? 6000,
      });
      return { completion, model: GROQ_MODEL };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError ?? new Error("All AI models failed");
}
