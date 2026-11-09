interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Periodically clean stale entries without blocking Node process termination
if (typeof setInterval !== 'undefined') {
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, 300000);
  interval.unref?.();
}

/**
 * Checks request rate limit per client identifier (e.g. IP or session ID).
 * @param identifier Unique key representing client
 * @param limit Max allowed requests within window
 * @param windowMs Window duration in milliseconds
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 30,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, reset: now + windowMs };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, reset: record.resetAt };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count, reset: record.resetAt };
}

/**
 * Checks distributed rate limit using Upstash Redis REST API if configured,
 * falling back gracefully to the synchronous in-memory rate limiter.
 */
export async function checkRateLimitDistributed(
  identifier: string,
  limit: number = 30,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const windowSec = Math.ceil(windowMs / 1000);
      const res = await fetch(`${redisUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', `ratelimit:${identifier}`],
          ['EXPIRE', `ratelimit:${identifier}`, windowSec, 'NX'],
          ['TTL', `ratelimit:${identifier}`],
        ]),
      });

      if (res.ok) {
        const results = await res.json();
        const count = results[0]?.result || 1;
        const ttl = results[2]?.result || windowSec;
        const resetAt = Date.now() + ttl * 1000;

        return {
          allowed: count <= limit,
          remaining: Math.max(0, limit - count),
          reset: resetAt,
        };
      }
    } catch (err) {
      console.warn('Upstash rate limiting error, falling back to in-memory rate limiter:', err);
    }
  }

  return checkRateLimit(identifier, limit, windowMs);
}
