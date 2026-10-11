import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  skipInTesting?: boolean;
}) {
  const hits = new Map<string, RateLimitRecord>();

  // Cleanup expired entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (record.resetAt <= now) {
        hits.delete(key);
      }
    }
  }, 60000).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, allow bypassing if configured
    if (options.skipInTesting && process.env.NODE_ENV === 'test') {
      return next();
    }

    const clientIp = (req.headers?.['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || '127.0.0.1';
    const key = `${req.baseUrl || ''}${req.path || ''}:${clientIp}`;
    const now = Date.now();

    const record = hits.get(key);

    if (!record || record.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (record.count >= options.max) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec.toString());
      res.status(429).json({
        error: options.message || 'Too many requests. Please try again later.',
        retryAfterSeconds: retryAfterSec
      });
      return;
    }

    record.count += 1;
    next();
  };
}
