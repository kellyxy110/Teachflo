import type OpenAI from "openai";
import { getGroqClient, GROQ_MODELS } from "@/lib/ai/providers/groq";
import { getOpenRouterClient, OPENROUTER_MODELS } from "@/lib/ai/providers/openrouter";

// Re-export client factories so existing imports keep working
export { getGroqClient, getOpenRouterClient };

// Backward-compat aliases
export const GROQ_MODEL = GROQ_MODELS.TEACHING;
export const OPENROUTER_EXAM_MODEL   = OPENROUTER_MODELS.EXAM;
export const OPENROUTER_LESSON_MODEL = OPENROUTER_MODELS.REASONING;

// ── Model fallback lists ──────────────────────────────────────────────────
// Ordered by preference. All free-tier via OpenRouter.
// Primary is tried first; remaining are fallbacks if rate-limited or unavailable.

export const LESSON_MODELS = [
  OPENROUTER_MODELS.REASONING,       // Qwen3 80B — primary lesson model
  OPENROUTER_MODELS.MINIMAX_M3,
  OPENROUTER_MODELS.SONNET_4_5,
  OPENROUTER_MODELS.GPT_OSS,
  OPENROUTER_MODELS.NEMOTRON_ULTRA,
  OPENROUTER_MODELS.FRONTIER,
  OPENROUTER_MODELS.NEMOTRON_REASON,
  OPENROUTER_MODELS.MULTIMODAL,
  OPENROUTER_MODELS.GEMMA_26B,
  OPENROUTER_MODELS.GENERAL,
  OPENROUTER_MODELS.NEMOTRON_30B,
] as const;

export const EXAM_MODELS = [
  OPENROUTER_MODELS.EXAM,            // DeepSeek V4 Flash — primary exam model
  OPENROUTER_MODELS.MINIMAX_M3,
  OPENROUTER_MODELS.SONNET_4_5,
  OPENROUTER_MODELS.GPT_OSS,
  OPENROUTER_MODELS.NEMOTRON_ULTRA,
  OPENROUTER_MODELS.REASONING,
  OPENROUTER_MODELS.FRONTIER,
  OPENROUTER_MODELS.NEMOTRON_REASON,
  OPENROUTER_MODELS.GENERAL,
] as const;

export const DOCUMENT_MODELS = [
  OPENROUTER_MODELS.MULTIMODAL,      // Gemma 4 31B — primary document model
  OPENROUTER_MODELS.MINIMAX_M3,
  OPENROUTER_MODELS.SONNET_4_5,
  OPENROUTER_MODELS.GPT_OSS,
  OPENROUTER_MODELS.NEMOTRON_12B,
  OPENROUTER_MODELS.GEMMA_26B,
  OPENROUTER_MODELS.NEMOTRON_ULTRA,
  OPENROUTER_MODELS.FRONTIER,
  OPENROUTER_MODELS.REASONING,
] as const;

// ── Streaming / completion utilities ─────────────────────────────────────
// Both functions try models in order, fall back to Groq as last resort.

type Messages = OpenAI.Chat.Completions.ChatCompletionMessageParam[];

interface StreamOpts {
  temperature?: number;
  max_tokens?: number;
}

interface CompletionOpts extends StreamOpts {
  json?: boolean;
}

const MODEL_TIMEOUT_MS = 8000;
const MAX_FALLBACK_ATTEMPTS = 4;

export async function openRouterStream(
  models: readonly string[],
  messages: Messages,
  opts: StreamOpts = {}
): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk> & { controller: AbortController }> {
  let lastError: Error | null = null;
  const candidates = models.slice(0, MAX_FALLBACK_ATTEMPTS);

  for (const model of candidates) {
    try {
      const stream = await getOpenRouterClient(model).chat.completions.create(
        {
          model,
          messages,
          stream: true,
          temperature: opts.temperature ?? 0.7,
          max_tokens: opts.max_tokens ?? 2000,
        },
        { signal: AbortSignal.timeout(MODEL_TIMEOUT_MS) }
      );
      return stream;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      const stream = await getGroqClient().chat.completions.create(
        {
          model: GROQ_MODELS.TEACHING,
          messages,
          stream: true,
          temperature: opts.temperature ?? 0.7,
          max_tokens: opts.max_tokens ?? 2000,
        },
        { signal: AbortSignal.timeout(MODEL_TIMEOUT_MS) }
      );
      return stream;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError ?? new Error("All AI models failed");
}

export async function openRouterCompletion(
  models: readonly string[],
  messages: Messages,
  opts: CompletionOpts = {}
): Promise<{ completion: OpenAI.Chat.Completions.ChatCompletion; model: string }> {
  let lastError: Error | null = null;
  const candidates = models.slice(0, MAX_FALLBACK_ATTEMPTS);

  for (const model of candidates) {
    try {
      const completion = await getOpenRouterClient(model).chat.completions.create(
        {
          model,
          messages,
          temperature: opts.temperature ?? 0.4,
          max_tokens: opts.max_tokens ?? 6000,
          ...(opts.json ? { response_format: { type: "json_object" as const } } : {}),
        },
        { signal: AbortSignal.timeout(MODEL_TIMEOUT_MS) }
      );
      return { completion, model };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      const completion = await getGroqClient().chat.completions.create(
        {
          model: GROQ_MODELS.TEACHING,
          messages,
          temperature: opts.temperature ?? 0.4,
          max_tokens: opts.max_tokens ?? 6000,
        },
        { signal: AbortSignal.timeout(MODEL_TIMEOUT_MS) }
      );
      return { completion, model: GROQ_MODELS.TEACHING };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError ?? new Error("All AI models failed");
}
