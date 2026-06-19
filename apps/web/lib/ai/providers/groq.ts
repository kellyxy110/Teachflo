import OpenAI from "openai";

export const GROQ_MODELS = {
  TEACHING: "llama-3.3-70b-versatile",
} as const;

export function getGroqClient(): OpenAI {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set");
  }
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}
