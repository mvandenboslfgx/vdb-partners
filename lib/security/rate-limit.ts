interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Process-local in-memory rate limiter.
 * Not a multi-instance production guarantee — use Redis/Upstash (or similar)
 * when multiple Node processes / Vercel instances must share limits.
 */
export function rateLimit(
  key: string,
  options: { limit?: number; windowMs?: number } = {},
) {
  const limit = options.limit ?? 20;
  const windowMs = options.windowMs ?? 60_000;
  const now = Date.now();
  const bucket = buckets.get(key);
  const current =
    !bucket || bucket.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : bucket;
  current.count += 1;
  buckets.set(key, current);
  return {
    success: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
  };
}

/** Build a bucket key from IP / email-ish parts. Values are for keys only — do not log them. */
export function buildRateLimitKey(
  scope: string,
  parts: { ip?: string | null; email?: string | null },
) {
  const ip = (parts.ip ?? "unknown").trim().slice(0, 64) || "unknown";
  const email = (parts.email ?? "").trim().toLowerCase().slice(0, 128);
  return `${scope}:${ip}:${email || "-"}`;
}

/** Test helper — clears process-local buckets. */
export function resetRateLimitBucketsForTests() {
  buckets.clear();
}
