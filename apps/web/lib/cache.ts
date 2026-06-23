const KV_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

// ── In-memory fallback ──────────────────────────────────────────────────────
const store = new Map<string, { value: string; expiresAt: number }>();

function memGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { store.delete(key); return null; }
  return JSON.parse(entry.value) as T;
}

function memSet(key: string, value: unknown, ttlSeconds: number): void {
  store.set(key, { value: JSON.stringify(value), expiresAt: Date.now() + ttlSeconds * 1000 });
}

// ── Vercel KV REST helpers ──────────────────────────────────────────────────
async function kvGet<T>(key: string): Promise<T | null> {
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  const { result } = await res.json() as { result: string | null };
  return result ? (JSON.parse(result) as T) : null;
}

async function kvSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ value: JSON.stringify(value), ex: ttlSeconds }),
  });
}

// ── Public API ──────────────────────────────────────────────────────────────
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (KV_URL && KV_TOKEN) {
    return kvGet<T>(key).catch(() => memGet<T>(key));
  }
  return memGet<T>(key);
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (KV_URL && KV_TOKEN) {
    await kvSet(key, value, ttlSeconds).catch(() => memSet(key, value, ttlSeconds));
    return;
  }
  memSet(key, value, ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  store.delete(key);
  if (KV_URL && KV_TOKEN) {
    await fetch(`${KV_URL}/del/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    }).catch(() => {});
  }
}

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const value = await fetcher();
  await cacheSet(key, value, ttlSeconds);
  return value;
}
