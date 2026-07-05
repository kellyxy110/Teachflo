import OpenAI from "openai";

// Existing production models served via HuggingFace
export const ORNITH_MODELS = {
  ORNITH_9B:   "deepreinforce-ai/Ornith-1.0-9B",
  ORNITH_35B:  "deepreinforce-ai/Ornith-1.0-35B",
  ORNITH_397B: "deepreinforce-ai/Ornith-1.0-397B-FP8",
} as const;

// Candidate models for TeachNexis evaluation
// Confirm availability on HF Inference Providers before routing traffic here.
export const HF_CANDIDATE_MODELS = {
  // Reasoning / general
  GLM_5_2:           "zai-org/GLM-5.2",

  // NVIDIA NIM quantized — strong structured output, via Nebius provider
  QWEN3_27B_NVFP4:   "nvidia/Qwen3.6-27B-NVFP4",

  // DeepSeek advanced variant
  DEEPSEEK_V4_SPARK: "deepseek-ai/DeepSeek-V4-Pro-DSpark",

  // Agent-specialised
  AGENTS_A1:         "InternScience/Agents-A1",
  QWEN_AGENTWORLD:   "Qwen/Qwen-AgentWorld-35B-A3B",

  // GGUF local models — require Ollama or llama.cpp; set OLLAMA_BASE_URL
  GEMMA_12B_AGENTIC: "yuxinlu1/gemma-4-12B-agentic-fable5-composer2.5-v2-3.5x-tau2-GGUF",
  ORNITH_9B_GGUF:    "deepreinforce-ai/Ornith-1.0-9B-GGUF",
  QWYTHOS_9B:        "empero-ai/Qwythos-9B-Claude-Mythos-5-1M",

  // Embedding / retrieval only — NOT for generation; use for vector search
  NEMOTRON_TWOTOWER: "nvidia/Nemotron-Labs-TwoTower-30B-A3B-Base-BF16",
} as const;

export type OrnithModel = (typeof ORNITH_MODELS)[keyof typeof ORNITH_MODELS];

// HuggingFace Inference Providers Router — routes to best available provider
export function getHuggingFaceClient(): OpenAI {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error("HUGGINGFACE_API_KEY is not set");
  return new OpenAI({
    apiKey,
    baseURL: "https://router.huggingface.co/v1",
    defaultHeaders: {
      "X-Wait-For-Model": "true",
    },
  });
}

// Legacy endpoint (kept for backward compat)
export function getHuggingFaceLegacyClient(): OpenAI {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error("HUGGINGFACE_API_KEY is not set");
  return new OpenAI({
    apiKey,
    baseURL: "https://api-inference.huggingface.co/v1/",
  });
}

// Nebius AI Studio — serves NVIDIA NIM quantized models and European inference
export function getNebiusClient(): OpenAI {
  const key = process.env.NEBIUS_API_KEY ?? process.env.HUGGINGFACE_API_KEY;
  if (!key) throw new Error("NEBIUS_API_KEY or HUGGINGFACE_API_KEY is not set");
  return new OpenAI({
    apiKey: key,
    baseURL: "https://router.huggingface.co/nebius/v1",
  });
}

// Ollama — for local GGUF models; requires OLLAMA_BASE_URL env var
export function getOllamaClient(): OpenAI {
  const baseURL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
  return new OpenAI({
    apiKey: "ollama",
    baseURL,
  });
}
