// ============================================================================
// Lightweight in-memory rate limiter (sliding window).
//
// Suitable for a single Node instance / Vercel serverless warm instances. For
// multi-instance horizontal scale, back this with a shared store (e.g. Upstash
// Redis or Firestore); the call sites stay identical. Documented in README.
// ============================================================================

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map doesn't grow unbounded.
let lastSweep = Date.now();
function sweep(windowMs: number) {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    b.hits = b.hits.filter((t) => now - t < windowMs);
    if (b.hits.length === 0) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec?: number;
}

/**
 * Allow up to `limit` events per `windowMs` for a given `key`.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  sweep(windowMs);
  const b = buckets.get(key) ?? { hits: [] };
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length >= limit) {
    const oldest = b.hits[0];
    const retryAfterSec = Math.ceil((windowMs - (now - oldest)) / 1000);
    buckets.set(key, b);
    return { allowed: false, remaining: 0, retryAfterSec };
  }
  b.hits.push(now);
  buckets.set(key, b);
  return { allowed: true, remaining: limit - b.hits.length };
}
