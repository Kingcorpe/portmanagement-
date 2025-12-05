// Rate Limiting Utilities
// HIGH PRIORITY FIX #7: NOTE - This is in-memory only and won't work with multiple server instances
// For production scaling with load balancing, consider:
// - Redis-based rate limiting (express-rate-limit with RedisStore)
// - External rate limiting service (Cloudflare, AWS WAF)
// - Database-backed rate limiting
// TODO: Migrate to Redis-based rate limiting for production scaling

// SECURITY: Simple in-memory rate limiter
export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup() {
    const now = Date.now();
    // Use Array.from to avoid TypeScript iteration issues
    const entries = Array.from(this.requests.entries());
    for (const [key, value] of entries) {
      if (now > value.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.requests.get(identifier);

    if (!record || now > record.resetTime) {
      // New window or expired window
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs,
      };
    }

    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }

    record.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }
}

// Create rate limiters for different endpoints
export const generalRateLimiter = new RateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes
export const webhookRateLimiter = new RateLimiter(60 * 1000, 10); // 10 requests per minute for webhooks
export const authRateLimiter = new RateLimiter(15 * 60 * 1000, 20); // 20 requests per 15 minutes for auth

// SECURITY: Rate limiting middleware
export function rateLimit(limiter: RateLimiter, getIdentifier: (req: any) => string) {
  return (req: any, res: any, next: any) => {
    const identifier = getIdentifier(req);
    const result = limiter.check(identifier);

    res.setHeader('X-RateLimit-Limit', limiter['maxRequests']);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      return res.status(429).json({
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      });
    }

    next();
  };
}





