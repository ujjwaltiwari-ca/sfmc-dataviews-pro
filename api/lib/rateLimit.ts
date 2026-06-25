type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanupAt = 0;

function cleanupExpiredBuckets(now: number): void {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanupAt = now;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) {
      buckets.delete(key);
    }
  }
}

export type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds?: number;
};

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  cleanupExpiredBuckets(now);

  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= maxRequests) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true };
}

/** Best-effort per-instance limiter (use Upstash for multi-instance production if needed). */
export const STAGING_POST_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };
export const CHAT_POST_LIMIT = { max: 30, windowMs: 60 * 1000 };
