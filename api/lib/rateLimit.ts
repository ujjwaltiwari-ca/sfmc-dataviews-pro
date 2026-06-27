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

function checkRateLimitInMemory(
  key: string,
  maxRequests: number,
  windowMs: number,
  now: number,
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

type UpstashCommandResponse = {
  result?: number | null;
  error?: string;
};

function getUpstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    return null;
  }
  return { url: url.replace(/\/$/, ''), token };
}

async function upstashCommand(
  config: { url: string; token: string },
  command: string,
  ...args: Array<string | number>
): Promise<UpstashCommandResponse> {
  const encodedArgs = args.map((arg) => encodeURIComponent(String(arg))).join('/');
  const response = await fetch(`${config.url}/${command}/${encodedArgs}`, {
    headers: { Authorization: `Bearer ${config.token}` },
  });

  if (!response.ok) {
    throw new Error(`Upstash ${command} failed with HTTP ${response.status}`);
  }

  return (await response.json()) as UpstashCommandResponse;
}

async function checkRateLimitUpstash(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const config = getUpstashConfig();
  if (!config) {
    return checkRateLimitInMemory(key, maxRequests, windowMs, Date.now());
  }

  const redisKey = `ratelimit:${key}`;
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  const increment = await upstashCommand(config, 'incr', redisKey);
  if (increment.error) {
    throw new Error(increment.error);
  }

  const count = increment.result ?? 0;
  if (count === 1) {
    await upstashCommand(config, 'expire', redisKey, windowSeconds);
  }

  if (count > maxRequests) {
    const ttl = await upstashCommand(config, 'ttl', redisKey);
    const retryAfterSeconds =
      typeof ttl.result === 'number' && ttl.result > 0 ? ttl.result : windowSeconds;
    return { ok: false, retryAfterSeconds };
  }

  return { ok: true };
}

let warnedAboutInMemoryLimiter = false;

function warnInMemoryLimiterOnce(): void {
  if (warnedAboutInMemoryLimiter || process.env.NODE_ENV !== 'production') {
    return;
  }

  warnedAboutInMemoryLimiter = true;
  console.warn(
    '[rateLimit] UPSTASH_REDIS_REST_URL/TOKEN not set — using per-instance in-memory limits',
  );
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
  now = Date.now(),
): Promise<RateLimitResult> {
  if (getUpstashConfig()) {
    return checkRateLimitUpstash(key, maxRequests, windowMs);
  }

  warnInMemoryLimiterOnce();
  return checkRateLimitInMemory(key, maxRequests, windowMs, now);
}

/** Best-effort limiter; configure Upstash Redis in production for global enforcement. */
export const STAGING_POST_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };
export const CHAT_POST_LIMIT = { max: 30, windowMs: 60 * 1000 };
