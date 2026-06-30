import OpenAI from "openai";

export const NVIDIA_MODELS = {
  // Top-tier reasoning & instruction
  NEMOTRON_SUPER:    "nvidia/llama-3.3-nemotron-super-49b-v1",
  NEMOTRON_70B:      "nvidia/llama-3.1-nemotron-70b-instruct",
  // General instruction
  LLAMA_70B:         "meta/llama-3.3-70b-instruct",
  LLAMA_3_1_70B:     "meta/llama-3.1-70b-instruct",
  // Fast / lightweight
  MINITRON_8B:       "nvidia/mistral-nemo-minitron-8b-8k-instruct",
  // Coding
  QWEN_CODER_32B:    "qwen/qwen2.5-coder-32b-instruct",
  // Reasoning
  DEEPSEEK_R1:       "deepseek-ai/deepseek-r1",
  // Multimodal
  PHI4_MULTIMODAL:   "microsoft/phi-4-multimodal-instruct",
} as const;

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

const KEY_VARS = [
  "NVIDIA_API_KEY",
  "NVIDIA_API_KEY_2",
  "NVIDIA_API_KEY_3",
  "NVIDIA_API_KEY_4",
] as const;

let _roundRobinIndex = 0;

function resolveNvidiaKey(): string {
  const available = KEY_VARS.map((v) => process.env[v]).filter(Boolean) as string[];
  if (available.length === 0) throw new Error("No NVIDIA API key configured");
  const key = available[_roundRobinIndex % available.length];
  _roundRobinIndex = (_roundRobinIndex + 1) % available.length;
  return key;
}

export function getNvidiaClient(): OpenAI {
  return new OpenAI({
    apiKey: resolveNvidiaKey(),
    baseURL: NVIDIA_BASE_URL,
  });
}
