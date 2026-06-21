import { jinaEmbed, JINA_DIMENSIONS } from "./ai/providers/jina";

export const EMBEDDING_DIMENSIONS = parseInt(
  process.env.EMBEDDING_DIMENSIONS || String(JINA_DIMENSIONS)
);

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "jina-embeddings-v3";

function useJina(): boolean {
  return !!process.env.JINA_API_KEY;
}

function getEmbeddingURL(): string {
  const base = process.env.EMBEDDING_PROVIDER_URL;
  if (!base) {
    throw new Error(
      "EMBEDDING_PROVIDER_URL is not set and JINA_API_KEY is not available. " +
        "Set JINA_API_KEY or provide an OpenAI-compatible embedding endpoint."
    );
  }
  return base.endsWith("/embeddings") ? base : `${base}/embeddings`;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const apiKey = process.env.EMBEDDING_API_KEY;
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

interface EmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
}

async function callGenericEmbeddingAPI(
  input: string | string[]
): Promise<number[][]> {
  const url = getEmbeddingURL();
  const response = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Embedding API error ${response.status}: ${text}`);
  }

  const data: EmbeddingResponse = await response.json();
  return data.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

async function callEmbeddingAPI(input: string | string[]): Promise<number[][]> {
  if (useJina()) return jinaEmbed(input);
  return callGenericEmbeddingAPI(input);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const results = await callEmbeddingAPI(text.slice(0, 8000));
  return results[0];
}

export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const BATCH_SIZE = 50;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE).map((t) => t.slice(0, 8000));
    const batchResults = await callEmbeddingAPI(batch);
    results.push(...batchResults);
  }

  return results;
}
