interface RateLimitInput {
  key: string;
  namespace: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

interface MemoryCounter {
  count: number;
  resetAt: number;
}

interface GlobalWithRateLimitStore {
  __rateLimitStore?: Map<string, MemoryCounter>;
}

const globalStore = globalThis as GlobalWithRateLimitStore;

function getMemoryStore(): Map<string, MemoryCounter> {
  if (!globalStore.__rateLimitStore) {
    globalStore.__rateLimitStore = new Map<string, MemoryCounter>();
  }
  return globalStore.__rateLimitStore;
}

function getRedisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

function toRateLimitResult(
  count: number,
  limit: number,
  resetAt: number,
  now = Date.now()
): RateLimitResult {
  const remaining = Math.max(limit - count, 0);
  const retryAfterSeconds = Math.max(Math.ceil((resetAt - now) / 1000), 0);
  return {
    allowed: count <= limit,
    limit,
    remaining,
    resetAt,
    retryAfterSeconds,
  };
}

async function consumeWithRedis(input: RateLimitInput): Promise<RateLimitResult> {
  const cfg = getRedisConfig();
  if (!cfg) {
    throw new Error('Redis is not configured');
  }

  const now = Date.now();
  const redisKey = `${input.namespace}:${input.key}`;

  const response = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', redisKey],
      ['EXPIRE', redisKey, input.windowSeconds],
      ['TTL', redisKey],
    ]),
  });

  if (!response.ok) {
    throw new Error(`Redis pipeline failed with status ${response.status}`);
  }

  const payload = (await response.json()) as Array<{ result?: number; error?: string }>;
  const count = Number(payload?.[0]?.result ?? 0);
  const ttl = Number(payload?.[2]?.result ?? input.windowSeconds);
  const resetAt = now + Math.max(ttl, 0) * 1000;

  return toRateLimitResult(count, input.limit, resetAt, now);
}

function consumeWithMemory(input: RateLimitInput): RateLimitResult {
  const now = Date.now();
  const key = `${input.namespace}:${input.key}`;
  const store = getMemoryStore();

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + input.windowSeconds * 1000;
    store.set(key, { count: 1, resetAt });
    return toRateLimitResult(1, input.limit, resetAt, now);
  }

  existing.count += 1;
  store.set(key, existing);
  return toRateLimitResult(existing.count, input.limit, existing.resetAt, now);
}

export async function consumeRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  if (input.limit <= 0 || input.windowSeconds <= 0) {
    throw new Error('Rate limit configuration must use positive limit and windowSeconds values.');
  }

  try {
    if (getRedisConfig()) {
      return await consumeWithRedis(input);
    }
  } catch {
    // Automatic fallback to memory store.
  }

  return consumeWithMemory(input);
}
