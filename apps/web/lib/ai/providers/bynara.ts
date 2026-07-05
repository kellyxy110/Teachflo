import OpenAI from "openai";

// Known models on Bynara's router. Add more as you discover availability.
// Override at runtime via env vars — no redeploy needed.
export const BYNARA_MODELS = {
  PRIMARY:   process.env.BYNARA_MODEL_PRIMARY   ?? "mistral-large",
  SECONDARY: process.env.BYNARA_MODEL_SECONDARY ?? "mistral-medium",
  FALLBACK:  process.env.BYNARA_MODEL_FALLBACK  ?? "mistral-small",
} as const;

export function getBynaraClient(): OpenAI {
  const apiKey = process.env.BYNARA_API_KEY;
  if (!apiKey) throw new Error("BYNARA_API_KEY is not set");
  return new OpenAI({
    apiKey,
    baseURL: "https://router.bynara.id/v1",
  });
}
