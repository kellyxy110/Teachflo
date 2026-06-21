const JINA_BASE = "https://api.jina.ai/v1";
const JINA_MODEL = "jina-embeddings-v3";
const JINA_DIMENSIONS = 1024;

interface JinaEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
}

function getJinaKey(): string {
  const key = process.env.JINA_API_KEY;
  if (!key) throw new Error("JINA_API_KEY is not set");
  return key;
}

export async function jinaEmbed(input: string | string[]): Promise<number[][]> {
  const res = await fetch(`${JINA_BASE}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getJinaKey()}`,
    },
    body: JSON.stringify({
      model: JINA_MODEL,
      input: Array.isArray(input) ? input : [input],
      dimensions: JINA_DIMENSIONS,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Jina API error ${res.status}: ${text}`);
  }

  const data: JinaEmbeddingResponse = await res.json();
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export { JINA_DIMENSIONS, JINA_MODEL };
