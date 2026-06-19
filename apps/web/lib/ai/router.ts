import type OpenAI from "openai";
import { getGroqClient, GROQ_MODELS } from "./providers/groq";
import { getOpenRouterClient, OPENROUTER_MODELS } from "./providers/openrouter";
import { retrieveRAGContext } from "../rag/retriever";

// ── Types ──────────────────────────────────────────────────────────────────

export type Intent =
  | "tutoring"
  | "exam"
  | "curriculum"
  | "document"
  | "automation"
  | "general"
  | "complex";

export interface RouteResult {
  client: OpenAI;
  model: string;
  provider: string;
  intent: Intent;
  reason: string;
}

export interface ChatRequest {
  message: string;
  schoolId?: string;
  useRAG?: boolean;
  systemPrompt?: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  provider: string;
  intent: string;
  reason: string;
  ragUsed: boolean;
  ragChunks?: number;
}

export interface StreamMetadata {
  model: string;
  provider: string;
  intent: string;
  reason: string;
  ragUsed: boolean;
  ragChunks?: number;
}

// ── Intent Classification ──────────────────────────────────────────────────

const INTENT_RULES: Array<{
  intent: Intent;
  pattern: RegExp;
  reason: string;
}> = [
  {
    intent: "exam",
    pattern:
      /\b(exam|test|quiz|mcq|grade|grading|mark scheme|score|assessment|distractor|objective question|theory question|past question|question bank)\b/i,
    reason: "Request involves exam generation, grading, or question creation",
  },
  {
    intent: "curriculum",
    pattern:
      /\b(curriculum|syllabus|scheme of work|term plan|lesson plan|unit plan|course outline|roadmap|learning objective|scope and sequence)\b/i,
    reason: "Request involves curriculum planning or course structuring",
  },
  {
    intent: "document",
    pattern:
      /\b(document|pdf|file|image|picture|photo|screenshot|analyze this|read this|parse this|extract from|summarize this file)\b/i,
    reason: "Request involves document or multimodal content understanding",
  },
  {
    intent: "automation",
    pattern:
      /\b(automate|generate ui|build component|create interface|workflow|system design|generate code|scaffold|create app)\b/i,
    reason: "Request involves UI generation or automated workflows",
  },
  {
    intent: "tutoring",
    pattern:
      /\b(explain|teach|what is|how does|understand|learn|help me|tutor|solve|example|practice|step by step|break down|simplify)\b/i,
    reason: "Request is a teaching or tutoring question",
  },
];

export function classifyIntent(message: string): {
  intent: Intent;
  reason: string;
} {
  for (const rule of INTENT_RULES) {
    if (rule.pattern.test(message)) {
      return { intent: rule.intent, reason: rule.reason };
    }
  }
  return {
    intent: "general",
    reason: "No specific intent detected — using general model",
  };
}

// ── Model Router ───────────────────────────────────────────────────────────

const ROUTE_MAP: Record<
  Intent,
  {
    getClient: () => OpenAI;
    model: string;
    provider: string;
    reason: string;
  }
> = {
  tutoring: {
    getClient: getGroqClient,
    model: GROQ_MODELS.TEACHING,
    provider: "groq",
    reason: "Groq LPU — fast streaming for tutoring responses",
  },
  exam: {
    getClient: getOpenRouterClient,
    model: OPENROUTER_MODELS.EXAM,
    provider: "openrouter",
    reason: "DeepSeek V4 Flash — structured JSON exam output",
  },
  curriculum: {
    getClient: getOpenRouterClient,
    model: OPENROUTER_MODELS.REASONING,
    provider: "openrouter",
    reason: "Qwen3 80B — deep reasoning for curriculum planning",
  },
  document: {
    getClient: getOpenRouterClient,
    model: OPENROUTER_MODELS.MULTIMODAL,
    provider: "openrouter",
    reason: "Gemma 4 31B — document and multimodal understanding",
  },
  automation: {
    getClient: getOpenRouterClient,
    model: OPENROUTER_MODELS.AGENT,
    provider: "openrouter",
    reason: "Kimi K2.6 — autonomous task execution and UI generation",
  },
  complex: {
    getClient: getOpenRouterClient,
    model: OPENROUTER_MODELS.FRONTIER,
    provider: "openrouter",
    reason: "Hermes 3 405B — complex reasoning fallback",
  },
  general: {
    getClient: getOpenRouterClient,
    model: OPENROUTER_MODELS.GENERAL,
    provider: "openrouter",
    reason: "Llama 3.3 70B — general educational assistance",
  },
};

export function routeToModel(intent: Intent): RouteResult {
  const route = ROUTE_MAP[intent] ?? ROUTE_MAP.general;
  return {
    client: route.getClient(),
    model: route.model,
    provider: route.provider,
    intent,
    reason: route.reason,
  };
}

// ── Fallback Chain ─────────────────────────────────────────────────────────

const FALLBACK_CHAIN: Intent[] = ["general", "complex"];

async function tryCompletion(
  intents: Intent[],
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
): Promise<{
  completion: OpenAI.Chat.Completions.ChatCompletion;
  route: RouteResult;
}> {
  let lastError: Error | null = null;
  for (const intent of intents) {
    const route = routeToModel(intent);
    try {
      const completion = await route.client.chat.completions.create({
        model: route.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      });
      return { completion, route };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError ?? new Error("All models in fallback chain failed");
}

async function tryStream(
  intents: Intent[],
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
): Promise<{
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
  route: RouteResult;
}> {
  let lastError: Error | null = null;
  for (const intent of intents) {
    const route = routeToModel(intent);
    try {
      const stream = await route.client.chat.completions.create({
        model: route.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      });
      return { stream, route };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError ?? new Error("All models in fallback chain failed");
}

// ── System Prompt ──────────────────────────────────────────────────────────

const DEFAULT_SYSTEM_PROMPT =
  "You are TeachFlow AI, an intelligent educational assistant for Nigerian secondary schools (JSS1–SS3). " +
  "You are aligned with WAEC, JAMB, and JUPEB curriculum standards. " +
  "Provide clear, accurate, and pedagogically sound responses.";

function buildMessages(
  message: string,
  systemPrompt: string | undefined,
  ragContext: string
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const system = [
    systemPrompt || DEFAULT_SYSTEM_PROMPT,
    ragContext
      ? `\n\nRelevant context from school knowledge base:\n${ragContext}`
      : "",
  ].join("");

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: message },
  ];
}

// ── Main Chat (non-streaming) ──────────────────────────────────────────────

export async function routedChat(req: ChatRequest): Promise<ChatResponse> {
  const { intent, reason } = classifyIntent(req.message);

  let ragContext = "";
  let ragChunks = 0;
  if (req.useRAG && req.schoolId) {
    try {
      const chunks = await retrieveRAGContext(req.message, req.schoolId, 5);
      if (chunks.length > 0) {
        ragContext = chunks.map((c) => c.content).join("\n\n---\n\n");
        ragChunks = chunks.length;
      }
    } catch {
      // RAG failure is non-fatal — proceed without context
    }
  }

  const messages = buildMessages(req.message, req.systemPrompt, ragContext);
  const chain: Intent[] = [intent, ...FALLBACK_CHAIN.filter((i) => i !== intent)];

  const { completion, route } = await tryCompletion(chain, messages);

  return {
    content: completion.choices[0]?.message?.content ?? "",
    model: route.model,
    provider: route.provider,
    intent,
    reason: route.reason,
    ragUsed: ragChunks > 0,
    ragChunks: ragChunks || undefined,
  };
}

// ── Streaming Chat ─────────────────────────────────────────────────────────

export async function routedChatStream(
  req: ChatRequest
): Promise<{
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
  metadata: StreamMetadata;
}> {
  const { intent, reason } = classifyIntent(req.message);

  let ragContext = "";
  let ragChunks = 0;
  if (req.useRAG && req.schoolId) {
    try {
      const chunks = await retrieveRAGContext(req.message, req.schoolId, 5);
      if (chunks.length > 0) {
        ragContext = chunks.map((c) => c.content).join("\n\n---\n\n");
        ragChunks = chunks.length;
      }
    } catch {
      // RAG failure non-fatal
    }
  }

  const messages = buildMessages(req.message, req.systemPrompt, ragContext);
  const chain: Intent[] = [intent, ...FALLBACK_CHAIN.filter((i) => i !== intent)];

  const { stream, route } = await tryStream(chain, messages);

  return {
    stream,
    metadata: {
      model: route.model,
      provider: route.provider,
      intent,
      reason: route.reason,
      ragUsed: ragChunks > 0,
      ragChunks: ragChunks || undefined,
    },
  };
}
