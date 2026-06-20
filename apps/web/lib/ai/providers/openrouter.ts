import OpenAI from "openai";

export const OPENROUTER_MODELS = {
  EXAM: "deepseek/deepseek-v4-flash:free",
  REASONING: "qwen/qwen3-next-80b-a3b-instruct:free",
  GENERAL: "meta-llama/llama-3.3-70b-instruct:free",
  MULTIMODAL: "google/gemma-4-31b-it:free",
  AGENT: "moonshotai/kimi-k2.6:free",
  FRONTIER: "nousresearch/hermes-3-llama-3.1-405b:free",
} as const;

export function getOpenRouterClient(): OpenAI {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://teachflow-os.vercel.app",
      "X-Title": "TeachFlow OS",
    },
  });
}
