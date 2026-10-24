import "server-only";

/**
 * Sliding-window limiter kept in memory. On Vercel each instance has its own window,
 * so this is a soft guard for one booth, not a hard global quota (move to Redis/KV later).
 */
const hits = new Map<string, number[]>();
let lastSweep = Date.now();

export interface Limit {
  limit: number;
  windowMs: number;
}

export function rateLimit(key: string, { limit, windowMs }: Limit): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, times] of hits) if (!times.some((t) => now - t < 3_600_000)) hits.delete(k);
  }
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  return { ok: true, retryAfter: 0 };
}
