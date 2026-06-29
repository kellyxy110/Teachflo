const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function makeCacheKey(parts: Record<string, string>): string {
  const sorted = Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v.toLowerCase().replace(/\s+/g, "_")}`)
    .join("|");
  return `tf:ai:${sorted}`;
}

async function redisCommand(commands: unknown[][]): Promise<unknown[]> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return [];

  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!res.ok) return [];
  return (await res.json() as { result: unknown }[]).map((r) => r.result);
}

export async function getAICache(key: string): Promise<string | null> {
  try {
    const results = await redisCommand([["GET", key]]);
    const val = results[0];
    return typeof val === "string" ? val : null;
  } catch {
    return null;
  }
}

export async function setAICache(key: string, value: string): Promise<void> {
  try {
    await redisCommand([["SET", key, value, "EX", String(CACHE_TTL_SECONDS)]]);
  } catch {
    // Non-fatal — cache miss is acceptable
  }
}
