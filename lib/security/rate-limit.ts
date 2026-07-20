interface Bucket { count: number; resetAt: number; }
const buckets = new Map<string, Bucket>();
/** Process-local only. Use Redis/Upstash in production across instances. */
export function rateLimit(key: string, options: { limit?: number; windowMs?: number } = {}) {
  const limit = options.limit ?? 20, windowMs = options.windowMs ?? 60_000, now = Date.now();
  const bucket = buckets.get(key);
  const current = !bucket || bucket.resetAt <= now ? { count: 0, resetAt: now + windowMs } : bucket;
  current.count += 1; buckets.set(key, current);
  return { success: current.count <= limit, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
}
