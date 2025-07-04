/**
 * Security middleware and utilities for production deployment
 * Optimized for Vercel Hobby tier
 */

// @ts-ignore
import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from './rate-limit';

/**
 * Security headers for production
 */
export const SECURITY_HEADERS = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // XSS protection
  'X-XSS-Protection': '1; mode=block',
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.openai.com",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'"
  ].join('; '),
  
  // HSTS (only in production)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  
  // Permissions policy
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()'
  ].join(', ')
};

/**
 * Add security headers to response
 * @param response - Response object
 * @param isDevelopment - Whether in development mode
 * @returns Response with security headers
 */
export function addSecurityHeaders(response: NextResponse, isDevelopment = false) {
  // Add all security headers
  // @ts-ignore
  Object.entries(SECURITY_HEADERS).forEach(([key, value]: [string, string]) => {
    // Skip HSTS in development
    if (key === 'Strict-Transport-Security' && isDevelopment) {
      return;
    }
    
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * CSRF token generation and validation
 */
export class CSRFProtection {
  private static tokens = new Map<string, { token: string; expires: number }>();
  
  /**
   * Generate CSRF token for session
   * @param sessionId - Session identifier
   * @returns CSRF token
   */
  static generateToken(sessionId: string): string {
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    
    this.tokens.set(sessionId, { token, expires });
    
    // Cleanup expired tokens
    this.cleanupExpiredTokens();
    
    return token;
  }
  
  /**
   * Validate CSRF token
   * @param sessionId - Session identifier
   * @param token - Token to validate
   * @returns Whether token is valid
   */
  static validateToken(sessionId: string, token: string): boolean {
    const entry = this.tokens.get(sessionId);
    
    if (!entry) {
      return false;
    }
    
    if (Date.now() > entry.expires) {
      this.tokens.delete(sessionId);
      return false;
    }
    
    return entry.token === token;
  }
  
  /**
   * Clean up expired tokens
   */
  private static cleanupExpiredTokens() {
    const now = Date.now();
    // @ts-ignore
    for (const [sessionId, entry] of this.tokens.entries()) {
      if (now > entry.expires) {
        this.tokens.delete(sessionId);
      }
    }
  }
  
  /**
   * Clear all tokens (for testing)
   */
  static clearTokens() {
    this.tokens.clear();
  }
}

/**
 * Input validation helpers
 */
export class InputValidator {
  /**
   * Validate email format
   * @param email - Email to validate
   * @returns Whether email is valid
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }
  
  /**
   * Sanitize string input
   * @param input - Input string
   * @param maxLength - Maximum length
   * @returns Sanitized string
   */
  static sanitizeString(input: string, maxLength = 1000): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .trim()
      .substring(0, maxLength)
      .replace(/[<>]/g, ''); // Remove potential XSS characters
  }
  
  /**
   * Validate slug format
   * @param slug - Slug to validate
   * @returns Whether slug is valid
   */
  static isValidSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9]{6}$/;
    return slugRegex.test(slug);
  }
  
  /**
   * Validate file size
   * @param bytes - File size in bytes
   * @param maxSize - Maximum size in bytes
   * @returns Whether size is valid
   */
  static isValidFileSize(bytes: number, maxSize = 15 * 1024 * 1024): boolean {
    return typeof bytes === 'number' && bytes > 0 && bytes <= maxSize;
  }
}

/**
 * Security middleware for API routes
 * @param request - Request object
 * @returns Security check result
 */
export function securityMiddleware(request: NextRequest) {
  const results = {
    allowed: true,
    reason: '',
    rateLimit: null as any,
    headers: {} as Record<string, string>
  };
  
  // Check rate limiting
  const rateLimit = checkApiRateLimit(request);
  results.rateLimit = rateLimit;
  
  if (!rateLimit.allowed) {
    results.allowed = false;
    results.reason = 'Rate limit exceeded';
    results.headers['Retry-After'] = rateLimit.retryAfter?.toString() || '60';
  }
  
  // Add rate limit headers
  results.headers['X-RateLimit-Limit'] = '100';
  results.headers['X-RateLimit-Remaining'] = rateLimit.remaining.toString();
  results.headers['X-RateLimit-Reset'] = new Date(rateLimit.resetTime).toISOString();
  
  return results;
}

/**
 * Create secure API response
 * @param data - Response data
 * @param options - Response options
 * @returns Secure response
 */
export function createSecureResponse(
  data: any,
  options: {
    status?: number;
    headers?: Record<string, string>;
    isDevelopment?: boolean;
  } = {}
) {
  const response = NextResponse.json(data, {
    status: options.status || 200,
    headers: options.headers
  });
  
  // Add security headers
  addSecurityHeaders(response, options.isDevelopment);
  
  return response;
}

/**
 * Handle security errors
 * @param error - Error message
 * @param status - HTTP status code
 * @param headers - Additional headers
 * @returns Error response
 */
export function createSecurityError(
  error: string,
  status: number = 403,
  headers: Record<string, string> = {}
) {
  const response = NextResponse.json(
    { error, timestamp: new Date().toISOString() },
    { status, headers }
  );
  
  addSecurityHeaders(response);
  
  return response;
}

/**
 * Log security events
 * @param event - Security event
 * @param details - Event details
 */
export function logSecurityEvent(event: string, details: any) {
  console.log(`[SECURITY] ${event}`, {
    timestamp: new Date().toISOString(),
    event,
    details
  });
}

/**
 * Get security metrics
 * @returns Security metrics for monitoring
 */
export function getSecurityMetrics() {
  return {
    csrfTokens: CSRFProtection['tokens'].size,
    timestamp: new Date().toISOString()
  };
}

/**
 * Validate webhook signature (for Mailgun)
 * @param signature - Webhook signature
 * @param token - Webhook token
 * @param timestamp - Webhook timestamp
 * @param signingKey - Signing key
 * @returns Whether signature is valid
 */
export function validateWebhookSignature(
  signature: string,
  token: string,
  timestamp: string,
  signingKey: string
): boolean {
  try {
    // @ts-ignore
    const crypto = require('crypto');
    
    const data = timestamp + token;
    const expectedSignature = crypto
      .createHmac('sha256', signingKey)
      .update(data)
      .digest('hex');
    
    return signature === expectedSignature;
  } catch (error: any) {
    logSecurityEvent('webhook_signature_validation_error', { error: error.message });
    return false;
  }
}

/**
 * Security configuration for different environments
 */
export const SECURITY_CONFIG = {
  development: {
    enableCSRF: false,
    enableRateLimit: false,
    enableSecurityHeaders: false,
    logLevel: 'debug'
  },
  production: {
    enableCSRF: true,
    enableRateLimit: true,
    enableSecurityHeaders: true,
    logLevel: 'info'
  }
} as const; 