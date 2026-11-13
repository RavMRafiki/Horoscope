import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
};

const LIMIT = 3;
const WINDOW_MS = 60_000;
const REDIS_RETRY_COOLDOWN_MS = 30_000;

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
let lastPrune = 0;

function prune(now: number) {
  if (now - lastPrune < WINDOW_MS) return;
  lastPrune = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function checkMemory(key: string): RateLimitResult {
  const now = Date.now();
  prune(now);

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    const resetAt = now + WINDOW_MS;
    buckets.set(key, { count: 1, resetAt });
    return {
      ok: true,
      limit: LIMIT,
      remaining: LIMIT - 1,
      resetAt,
      retryAfter: 0,
    };
  }

  if (current.count >= LIMIT) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return {
      ok: false,
      limit: LIMIT,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfter,
    };
  }

  current.count += 1;
  return {
    ok: true,
    limit: LIMIT,
    remaining: Math.max(0, LIMIT - current.count),
    resetAt: current.resetAt,
    retryAfter: 0,
  };
}

let limiter: Ratelimit | null = null;
let redisDisabledUntil = 0;

function redisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function getLimiter(): Ratelimit {
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(LIMIT, "1 m"),
      prefix: "rl:horoscope",
      analytics: false,
    });
  }
  return limiter;
}

export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  const now = Date.now();
  if (!redisConfigured() || now < redisDisabledUntil) {
    return checkMemory(key);
  }

  try {
    const { success, limit, remaining, reset } = await getLimiter().limit(key);
    const retryAfter = success
      ? 0
      : Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return {
      ok: success,
      limit,
      remaining,
      resetAt: reset,
      retryAfter,
    };
  } catch (error) {
    console.error("Redis rate limit unavailable, falling back to memory", error);
    redisDisabledUntil = Date.now() + REDIS_RETRY_COOLDOWN_MS;
    return checkMemory(key);
  }
}
