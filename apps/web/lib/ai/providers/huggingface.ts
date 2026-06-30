import OpenAI from "openai";

export const ORNITH_MODELS = {
  ORNITH_9B:   "deepreinforce-ai/Ornith-1.0-9B",
  ORNITH_35B:  "deepreinforce-ai/Ornith-1.0-35B",
  ORNITH_397B: "deepreinforce-ai/Ornith-1.0-397B-FP8",
} as const;

export type OrnithModel = (typeof ORNITH_MODELS)[keyof typeof ORNITH_MODELS];

export function getHuggingFaceClient(): OpenAI {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error("HUGGINGFACE_API_KEY is not set");
  return new OpenAI({
    apiKey,
    baseURL: "https://api-inference.huggingface.co/v1/",
  });
}
