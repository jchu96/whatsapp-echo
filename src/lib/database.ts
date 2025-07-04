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
    console.log('🔍 [DB] Executing query:', sql);
    console.log('🔍 [DB] Parameters:', params);
    console.log('🔍 [DB] D1_URL:', config.D1_URL);
    console.log('🔍 [DB] D1_API_KEY prefix:', config.D1_API_KEY?.substring(0, 10) + '...');
    
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

    console.log('🔍 [DB] Response status:', response.status);
    console.log('🔍 [DB] Response statusText:', response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🚨 [DB] Error response body:', errorText);
      throw new Error(`Database query failed: ${response.statusText}`);
    }

    const rawResult = await response.json();
    console.log('✅ [DB] Raw query result:', rawResult);
    
    // Parse the Cloudflare D1 response structure
    // Expected format: { result: [{ results: [...], success: boolean, meta: {...} }], errors: [], messages: [], success: boolean }
    
    if (!rawResult.success) {
      console.error('🚨 [DB] D1 API returned success: false');
      return {
        success: false,
        error: rawResult.errors?.[0]?.message || 'Database query failed',
      };
    }

    if (!rawResult.result || !Array.isArray(rawResult.result) || rawResult.result.length === 0) {
      console.error('🚨 [DB] Invalid D1 response structure:', rawResult);
      return {
        success: false,
        error: 'Invalid database response structure',
      };
    }

    const queryResult = rawResult.result[0];
    
    if (!queryResult.success) {
      console.error('🚨 [DB] Query execution failed:', queryResult);
      return {
        success: false,
        error: 'Query execution failed',
      };
    }

    // Extract the actual results from the nested structure
    const results = queryResult.results || [];
    const meta = queryResult.meta || {};
    
    console.log('✅ [DB] Parsed results:', results);
    console.log('✅ [DB] Query meta:', meta);
    
    return {
      success: true,
      results,
      meta,
    };
  } catch (error) {
    console.error('🚨 [DB] Database error:', error);
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
    console.log('🔍 [AUTH] Getting user by email:', email);
    
    const result = await executeQuery<User>(
      'SELECT * FROM users WHERE google_email = ? LIMIT 1',
      [email]
    );

    console.log('🔍 [AUTH] getUserByEmail result:', result);

    if (!result.success) {
      console.error('🚨 [AUTH] getUserByEmail failed:', result.error);
      return { success: false, error: result.error };
    }

    const user = result.results?.[0];
    if (!user) {
      console.log('ℹ️ [AUTH] User not found for email:', email);
      return { success: false, error: 'User not found' };
    }

    console.log('✅ [AUTH] User found:', user);
    return { success: true, data: user };
  } catch (error) {
    console.error('🚨 [AUTH] getUserByEmail error:', error);
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
    console.log('🔍 [AUTH] Creating user:', userData);
    
    const id = generateUserId();
    const slug = userData.slug || generateEmailSlug();
    const approved = userData.approved ? 1 : 0;

    console.log('🔍 [AUTH] User creation details:', { id, slug, approved });

    const result = await executeQuery(
      'INSERT INTO users (id, google_email, slug, approved) VALUES (?, ?, ?, ?)',
      [id, userData.google_email, slug, approved]
    );

    console.log('🔍 [AUTH] createUser result:', result);

    if (!result.success) {
      console.error('🚨 [AUTH] createUser failed:', result.error);
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

    console.log('✅ [AUTH] User created successfully:', user);
    return { success: true, data: user };
  } catch (error) {
    console.error('🚨 [AUTH] createUser error:', error);
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
    // Ensure proper boolean conversion - D1 might return integers or strings
    const isCurrentlyApproved = Boolean(user.approved);
    const newApprovalStatus = isCurrentlyApproved ? 0 : 1;

    console.log('🔍 [DB] Toggle approval:', { 
      userId, 
      currentApproved: user.approved, 
      isCurrentlyApproved, 
      newApprovalStatus 
    });

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
    console.log('🔍 [AUTH] Checking if slug is taken:', slug);
    
    const result = await executeQuery<{ count: number }>(
      'SELECT COUNT(*) as count FROM users WHERE slug = ?',
      [slug]
    );

    console.log('🔍 [AUTH] isSlugTaken result:', result);

    if (!result.success) {
      console.error('🚨 [AUTH] isSlugTaken query failed:', result.error);
      return true; // Assume taken on error for safety
    }

    const count = result.results?.[0]?.count || 0;
    const taken = count > 0;
    console.log(`🔍 [AUTH] Slug "${slug}" taken: ${taken} (count: ${count})`);
    
    return taken;
  } catch (error) {
    console.error('🚨 [AUTH] Error checking slug:', error);
    return true; // Assume taken on error for safety
  }
}

/**
 * Generate a unique slug for a user
 * @returns Promise<string> - Unique slug
 */
export async function generateUniqueSlug(): Promise<string> {
  console.log('🔍 [AUTH] Generating unique slug...');
  
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const slug = generateEmailSlug();
    console.log(`🔍 [AUTH] Attempt ${attempts + 1}: Generated slug "${slug}"`);
    
    const isTaken = await isSlugTaken(slug);
    console.log(`🔍 [AUTH] Slug "${slug}" is taken:`, isTaken);
    
    if (!isTaken) {
      console.log(`✅ [AUTH] Found available slug: "${slug}"`);
      return slug;
    }
    
    attempts++;
  }

  console.error('🚨 [AUTH] Failed to generate unique slug after maximum attempts');
  throw new Error('Failed to generate unique slug after maximum attempts');
} 