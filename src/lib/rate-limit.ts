/**
 * In-memory rate limiting for Vercel Hobby tier
 * No external dependencies - uses Map for storage
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// In-memory storage for rate limits
const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries periodically
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  // @ts-ignore
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const windowStart = now;
  const windowEnd = now + config.windowMs;
  
  const existing = rateLimitMap.get(identifier);
  
  if (!existing || now > existing.resetTime) {
    // New window or expired entry
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: windowEnd
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: windowEnd
    };
  }
  
  if (existing.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime,
      retryAfter: Math.ceil((existing.resetTime - now) / 1000)
    };
  }
  
  // Increment counter
  existing.count++;
  rateLimitMap.set(identifier, existing);
  
  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetTime: existing.resetTime
  };
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Voice processing webhook - very restrictive
  WEBHOOK: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5 // 5 voice notes per minute per user
  },
  
  // Admin API - moderate limits
  ADMIN_API: {
    windowMs: 60 * 1000, // 1 minute  
    maxRequests: 30 // 30 admin actions per minute
  },
  
  // General API - generous limits
  API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100 // 100 requests per minute
  },
  
  // Authentication - strict limits
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10 // 10 auth attempts per 15 minutes
  }
} as const;

/**
 * Get client identifier from request
 * Uses IP address with fallbacks for Vercel
 * @param request - Request object
 * @returns Client identifier
 */
export function getClientIdentifier(request: any): string {
  // Try various headers that Vercel might provide
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (forwardedFor) {
    // Take the first IP from the forwarded list
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback to a default identifier
  return 'unknown';
}

/**
 * Create rate limit middleware for API routes
 * @param config - Rate limit configuration
 * @param identifier - Optional custom identifier function
 * @returns Middleware function
 */
export function createRateLimit(
  config: RateLimitConfig,
  identifier?: (request: any) => string
) {
  return (request: any) => {
    const clientId = identifier ? identifier(request) : getClientIdentifier(request);
    return checkRateLimit(clientId, config);
  };
}

/**
 * Rate limit for webhook processing by user email
 * @param userEmail - User email address
 * @returns Rate limit result
 */
export function checkWebhookRateLimit(userEmail: string) {
  return checkRateLimit(`webhook:${userEmail}`, RATE_LIMITS.WEBHOOK);
}

/**
 * Rate limit for admin API by user ID
 * @param userId - Admin user ID
 * @returns Rate limit result
 */
export function checkAdminRateLimit(userId: string) {
  return checkRateLimit(`admin:${userId}`, RATE_LIMITS.ADMIN_API);
}

/**
 * Rate limit for general API by IP
 * @param request - Request object
 * @returns Rate limit result
 */
export function checkApiRateLimit(request: any) {
  const clientId = getClientIdentifier(request);
  return checkRateLimit(`api:${clientId}`, RATE_LIMITS.API);
}

/**
 * Rate limit for authentication attempts by IP
 * @param request - Request object
 * @returns Rate limit result
 */
export function checkAuthRateLimit(request: any) {
  const clientId = getClientIdentifier(request);
  return checkRateLimit(`auth:${clientId}`, RATE_LIMITS.AUTH);
}

/**
 * Get rate limit stats for monitoring
 * @returns Current rate limit statistics
 */
export function getRateLimitStats() {
  const now = Date.now();
  const activeEntries = Array.from(rateLimitMap.entries())
    .filter(([_, entry]) => now <= entry.resetTime);
    
  const stats = {
    totalEntries: rateLimitMap.size,
    activeEntries: activeEntries.length,
    expiredEntries: rateLimitMap.size - activeEntries.length,
    // @ts-ignore
    memoryUsage: process.memoryUsage ? process.memoryUsage().heapUsed : 0
  };
  
  return stats;
}

/**
 * Clear all rate limit entries (useful for testing)
 */
export function clearRateLimits() {
  rateLimitMap.clear();
} 