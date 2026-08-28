const WINDOW_MS = 60_000;
const MAX_REQUESTS = 15;

// ── In-memory fallback (single instance, resets on cold start) ──────────────
const hits = new Map<string, { count: number; resetAt: number }>();
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, val] of hits) {
    if (val.resetAt <= now) hits.delete(key);
  }
}, WINDOW_MS);
// The in-memory fallback is production behavior, but test processes must not
// be kept alive by its maintenance timer after a harness has finished.
if (process.env.NODE_ENV === "test") cleanupTimer.unref?.();

function inMemoryLimit(key: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, remaining: MAX_REQUESTS - 1 };
  }
  entry.count++;
  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  return { ok: entry.count <= MAX_REQUESTS, remaining };
}

// ── Upstash Redis (activated when env vars are present) ─────────────────────
async function upstashLimit(key: string): Promise<{ ok: boolean; remaining: number }> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return inMemoryLimit(key);

  const pipeline = [
    ["INCR", key],
    ["PEXPIRE", key, String(WINDOW_MS)],
  ];

  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(pipeline),
  });

  if (!res.ok) return inMemoryLimit(key);

  const data = await res.json() as [{ result: number }, unknown];
  const count = data[0].result;
  const remaining = Math.max(0, MAX_REQUESTS - count);
  return { ok: count <= MAX_REQUESTS, remaining };
}

export async function rateLimit(key: string): Promise<{ ok: boolean; remaining: number }> {
  if (testLimiter) return testLimiter(key);
  if (process.env.UPSTASH_REDIS_REST_URL) {
    return upstashLimit(key);
  }
  return inMemoryLimit(key);
}

let testLimiter: ((key: string) => Promise<{ ok: boolean; remaining: number }> | { ok: boolean; remaining: number }) | null = null;

/** Test-process-only override; never selected by request data or production env. */
export function setRateLimiterForTests(
  limiter: typeof testLimiter,
): void {
  if (process.env.NODE_ENV !== "test") throw new Error("Test rate-limit override is unavailable outside NODE_ENV=test");
  testLimiter = limiter;
}
