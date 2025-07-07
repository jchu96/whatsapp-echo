import { getUserByApiKey } from '@/lib/database';
import { checkWebhookRateLimit } from '@/lib/rate-limit';
import { User } from '@/types';

/**
 * Verify API key from Authorization header and apply rate limiting
 * @param authHeader - Authorization header value
 * @returns Promise<User | null> - User data if valid, null if invalid
 */
export async function verifyApiKey(authHeader: string | null): Promise<User | null> {
  if (!authHeader) {
    console.log('🔑 [API-AUTH] No authorization header provided');
    return null;
  }

  // Check for Bearer token format
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/);
  if (!bearerMatch) {
    console.log('🔑 [API-AUTH] Invalid authorization header format - must be "Bearer <token>"');
    return null;
  }

  const apiKey = bearerMatch[1];
  
  // Validate API key format (32 hex characters)
  if (!/^[a-f0-9]{32}$/.test(apiKey)) {
    console.log('🔑 [API-AUTH] Invalid API key format');
    return null;
  }

  try {
    console.log('🔑 [API-AUTH] Looking up user by API key');
    
    // Get user by API key
    const userResult = await getUserByApiKey(apiKey);
    
    if (!userResult.success || !userResult.data) {
      console.log('🔑 [API-AUTH] API key not found or invalid');
      return null;
    }

    const user = userResult.data;

    // Check if user is approved
    if (!Boolean(user.approved)) {
      console.log('🔑 [API-AUTH] User account not approved:', user.google_email);
      return null;
    }

    console.log('🔑 [API-AUTH] User found and approved:', user.google_email);

    // Apply rate limiting using the same system as webhook processing
    const rateLimit = checkWebhookRateLimit(user.google_email);
    
    if (!rateLimit.allowed) {
      console.log('🔑 [API-AUTH] Rate limit exceeded for user:', user.google_email);
      return null;
    }

    console.log('🔑 [API-AUTH] Rate limit check passed:', {
      user: user.google_email,
      remaining: rateLimit.remaining
    });

    return user;
  } catch (error) {
    console.error('🔑 [API-AUTH] Error verifying API key:', error);
    return null;
  }
} 