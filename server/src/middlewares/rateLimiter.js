/**
 * In-Memory Token Bucket Rate Limiter
 */

const rateBuckets = new Map();

export function rateLimit(name, max, windowMs) {
  return (req, res, next) => {
    const key = `${name}:${req.ip || 'unknown'}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);

    if (!bucket || now - bucket.start > windowMs) {
      rateBuckets.set(key, { start: now, count: 1 });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }

    next();
  };
}

// Cleanup stale buckets periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.start > 120_000) rateBuckets.delete(key);
  }
}, 60_000);
