/**
 * AI provider clients for TeachFlow OS
 *
 * Groq       → lesson generation + rewriting (streaming)
 *              Ultra-fast LPU inference — makes the live-typing UX feel instant.
 *              Model: llama-3.3-70b-versatile
 *
 * OpenRouter → exam generation (JSON mode)
 *              Routes to DeepSeek V4 Flash — 1M context, rock-solid JSON output,
 *              distractor analysis without hallucinating options.
 *              Model: deepseek/deepseek-v4-flash:free
 *
 * Both use the OpenAI-compatible API so we keep the same SDK with no new packages.
 */

import OpenAI from "openai";

// ── Groq ──────────────────────────────────────────────────────────────────────
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

// ── OpenRouter ────────────────────────────────────────────────────────────────
export const OPENROUTER_EXAM_MODEL = "deepseek/deepseek-v4-flash:free";

export function getOpenRouterClient(): OpenAI {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://teachflow.vercel.app",
      "X-Title": "TeachFlow OS",
    },
  });
}
