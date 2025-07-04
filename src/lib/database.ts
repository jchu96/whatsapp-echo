import { 
  User, 
  VoiceEvent, 
  CreateUserData, 
  CreateVoiceEventData, 
  DbResponse, 
  D1QueryResult,
  PaginatedResponse,
  UserWithStats
} from '@/types';
import { generateUserId, generateVoiceEventId, generateEmailSlug } from '@/utils/id';
import { getEnvConfig } from '@/utils/env';

// Database configuration
const config = getEnvConfig();

/**
 * Execute a SQL query against Cloudflare D1
 * @param sql - SQL query string
 * @param params - Query parameters
 * @returns Promise<D1QueryResult> - Query result
 */
export async function executeQuery<T = any>(
  sql: string, 
  params: any[] = []
): Promise<D1QueryResult<T>> {
  try {
    const response = await fetch(config.D1_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.D1_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sql,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`Database query failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Database error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

/**
 * Get user by slug
 * @param slug - User slug
 * @returns Promise<DbResponse<User>> - User data or error
 */
export async function getUserBySlug(slug: string): Promise<DbResponse<User>> {
  try {
    const result = await executeQuery<User>(
      'SELECT * FROM users WHERE slug = ? LIMIT 1',
      [slug]
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const user = result.results?.[0];
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, data: user };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get user' 
    };
  }
}

/**
 * Get user by email
 * @param email - User email
 * @returns Promise<DbResponse<User>> - User data or error
 */
export async function getUserByEmail(email: string): Promise<DbResponse<User>> {
  try {
    const result = await executeQuery<User>(
      'SELECT * FROM users WHERE google_email = ? LIMIT 1',
      [email]
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const user = result.results?.[0];
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, data: user };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get user' 
    };
  }
}

/**
 * Create a new user
 * @param userData - User creation data
 * @returns Promise<DbResponse<User>> - Created user data or error
 */
export async function createUser(userData: CreateUserData): Promise<DbResponse<User>> {
  try {
    const id = generateUserId();
    const slug = userData.slug || generateEmailSlug();
    const approved = userData.approved ? 1 : 0;

    const result = await executeQuery(
      'INSERT INTO users (id, google_email, slug, approved) VALUES (?, ?, ?, ?)',
      [id, userData.google_email, slug, approved]
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Return the created user
    const user: User = {
      id,
      google_email: userData.google_email,
      slug,
      approved,
      created_at: new Date().toISOString(),
    };

    return { success: true, data: user };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create user' 
    };
  }
}

/**
 * Toggle user approval status
 * @param userId - User ID
 * @returns Promise<DbResponse<User>> - Updated user data or error
 */
export async function toggleUserApproval(userId: string): Promise<DbResponse<User>> {
  try {
    // First get the current user
    const currentUser = await executeQuery<User>(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!currentUser.success || !currentUser.results?.[0]) {
      return { success: false, error: 'User not found' };
    }

    const user = currentUser.results[0];
    const newApprovalStatus = user.approved ? 0 : 1;

    const result = await executeQuery(
      'UPDATE users SET approved = ? WHERE id = ?',
      [newApprovalStatus, userId]
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Return updated user
    const updatedUser: User = {
      ...user,
      approved: newApprovalStatus,
    };

    return { success: true, data: updatedUser };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to toggle approval' 
    };
  }
}

/**
 * Insert a voice event
 * @param eventData - Voice event data
 * @returns Promise<DbResponse<VoiceEvent>> - Created event or error
 */
export async function insertVoiceEvent(
  eventData: CreateVoiceEventData
): Promise<DbResponse<VoiceEvent>> {
  try {
    const id = generateVoiceEventId();

    const result = await executeQuery(
      'INSERT INTO voice_events (id, user_id, duration_sec, bytes) VALUES (?, ?, ?, ?)',
      [id, eventData.user_id, eventData.duration_sec || null, eventData.bytes || null]
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Return the created event
    const voiceEvent: VoiceEvent = {
      id,
      user_id: eventData.user_id,
      received_at: new Date().toISOString(),
      duration_sec: eventData.duration_sec || null,
      bytes: eventData.bytes || null,
    };

    return { success: true, data: voiceEvent };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to insert voice event' 
    };
  }
}

/**
 * Get paginated list of users with stats
 * @param page - Page number (1-based)
 * @param limit - Number of items per page
 * @returns Promise<PaginatedResponse<UserWithStats>> - Paginated users with stats
 */
export async function getUsersWithStats(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<UserWithStats>> {
  try {
    const offset = (page - 1) * limit;

    // Get users with voice event counts
    const result = await executeQuery<UserWithStats>(
      `SELECT 
        u.*,
        COUNT(ve.id) as voice_events_count,
        MAX(ve.received_at) as last_activity
      FROM users u
      LEFT JOIN voice_events ve ON u.id = ve.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    if (!result.success) {
      return { 
        success: false, 
        error: result.error,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 }
      };
    }

    // Get total count
    const countResult = await executeQuery<{ total: number }>(
      'SELECT COUNT(*) as total FROM users'
    );

    const total = countResult.results?.[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: result.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get users',
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }
}

/**
 * Get voice events for a user
 * @param userId - User ID
 * @param page - Page number (1-based)
 * @param limit - Number of items per page
 * @returns Promise<PaginatedResponse<VoiceEvent>> - Paginated voice events
 */
export async function getVoiceEventsByUser(
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<VoiceEvent>> {
  try {
    const offset = (page - 1) * limit;

    const result = await executeQuery<VoiceEvent>(
      'SELECT * FROM voice_events WHERE user_id = ? ORDER BY received_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );

    if (!result.success) {
      return { 
        success: false, 
        error: result.error,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 }
      };
    }

    // Get total count
    const countResult = await executeQuery<{ total: number }>(
      'SELECT COUNT(*) as total FROM voice_events WHERE user_id = ?',
      [userId]
    );

    const total = countResult.results?.[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: result.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get voice events',
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }
}

/**
 * Check if a slug is already taken
 * @param slug - Slug to check
 * @returns Promise<boolean> - True if slug is taken
 */
export async function isSlugTaken(slug: string): Promise<boolean> {
  try {
    const result = await executeQuery<{ count: number }>(
      'SELECT COUNT(*) as count FROM users WHERE slug = ?',
      [slug]
    );

    return (result.results?.[0]?.count || 0) > 0;
  } catch (error) {
    console.error('Error checking slug:', error);
    return true; // Assume taken on error for safety
  }
}

/**
 * Generate a unique slug for a user
 * @returns Promise<string> - Unique slug
 */
export async function generateUniqueSlug(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const slug = generateEmailSlug();
    const isTaken = await isSlugTaken(slug);
    
    if (!isTaken) {
      return slug;
    }
    
    attempts++;
  }

  throw new Error('Failed to generate unique slug after maximum attempts');
} 