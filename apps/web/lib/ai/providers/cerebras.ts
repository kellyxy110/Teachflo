import OpenAI from "openai";

export const CEREBRAS_MODELS = {
  CHAT: "llama-3.3-70b",
} as const;

export function getCerebrasClient(): OpenAI {
  if (!process.env.CEREBRAS_API_KEY) {
    throw new Error("CEREBRAS_API_KEY is not set");
  }
  return new OpenAI({
    apiKey: process.env.CEREBRAS_API_KEY,
    baseURL: "https://api.cerebras.ai/v1",
  });
}
