import { 
  User, 
  VoiceEvent, 
  UserPreferences,
  CreateUserData, 
  CreateVoiceEventData, 
  DbResponse, 
  D1QueryResult,
  PaginatedResponse,
  UserWithStats,
  UserEnhancementPreferences,
  EnhancementType
} from '@/types';
import { generateUserId, generateVoiceEventId, generateEmailSlug, generateApiKey } from '@/utils/id';
import { getEnvConfig, isDevelopment } from '@/utils/env';

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
    
    // Validate required configuration
    if (!config.D1_URL) {
      throw new Error('D1_URL is not configured');
    }
    
    if (!config.D1_API_KEY) {
      throw new Error('D1_API_KEY is not configured');
    }
    
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
 * Get user by API key
 * @param apiKey - User API key
 * @returns Promise<DbResponse<User>> - User data or error
 */
export async function getUserByApiKey(apiKey: string): Promise<DbResponse<User>> {
  try {
    console.log('🔍 [AUTH] Getting user by API key');
    
    const result = await executeQuery<User>(
      'SELECT * FROM users WHERE api_key = ? LIMIT 1',
      [apiKey]
    );

    console.log('🔍 [AUTH] getUserByApiKey result:', result.success);

    if (!result.success) {
      console.error('🚨 [AUTH] getUserByApiKey failed:', result.error);
      return { success: false, error: result.error };
    }

    const user = result.results?.[0];
    if (!user) {
      console.log('ℹ️ [AUTH] User not found for API key');
      return { success: false, error: 'User not found' };
    }

    console.log('✅ [AUTH] User found by API key:', user.google_email);
    return { success: true, data: user };
  } catch (error) {
    console.error('🚨 [AUTH] getUserByApiKey error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get user' 
    };
  }
}

/**
 * Get user by ID
 * @param userId - User ID
 * @returns Promise<DbResponse<User>> - User data or error
 */
export async function getUserById(userId: string): Promise<DbResponse<User>> {
  try {
    console.log('🔍 [ADMIN] Getting user by ID:', userId);
    
    const result = await executeQuery<User>(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    console.log('🔍 [ADMIN] getUserById result:', result.success);

    if (!result.success) {
      console.error('🚨 [ADMIN] getUserById failed:', result.error);
      return { success: false, error: result.error };
    }

    const user = result.results?.[0];
    if (!user) {
      console.log('ℹ️ [ADMIN] User not found for ID:', userId);
      return { success: false, error: 'User not found' };
    }

    console.log('✅ [ADMIN] User found by ID:', user.google_email);
    return { success: true, data: user };
  } catch (error) {
    console.error('🚨 [ADMIN] getUserById error:', error);
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
    const apiKey = generateApiKey();
    const approved = userData.approved ? 1 : 0;

    console.log('🔍 [AUTH] User creation details:', { id, slug, approved, hasApiKey: !!apiKey });

    const result = await executeQuery(
      'INSERT INTO users (id, google_email, slug, api_key, approved) VALUES (?, ?, ?, ?, ?)',
      [id, userData.google_email, slug, apiKey, approved]
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
      api_key: apiKey,
      approved,
      created_at: new Date().toISOString(),
    };

    console.log('✅ [AUTH] User created successfully with API key:', user.google_email);
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
      'INSERT INTO voice_events (id, user_id, duration_sec, bytes, status, processing_type, enhancements_requested) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        id, 
        eventData.user_id, 
        eventData.duration_sec || null, 
        eventData.bytes || null,
        eventData.status || 'processing',
        eventData.processing_type || null,
        eventData.enhancements_requested || null
      ]
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
      status: eventData.status || 'processing',
      processing_type: eventData.processing_type || null,
      completed_at: null,
      error_message: null,
      enhancements_requested: eventData.enhancements_requested || null,
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

/**
 * Get user preferences by user ID
 * @param userId - User ID
 * @returns Promise<DbResponse<UserPreferences>> - User preferences or error
 */
export async function getUserPreferences(userId: string): Promise<DbResponse<UserPreferences>> {
  try {
    console.log('🔍 [PREFS] Getting user preferences for:', userId);
    
    const result = await executeQuery<UserPreferences>(
      'SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const preferences = result.results?.[0];
    if (!preferences) {
      return { success: false, error: 'User preferences not found' };
    }

    return { success: true, data: preferences };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get user preferences' 
    };
  }
}

/**
 * Create user preferences
 * @param userId - User ID
 * @param preferences - Partial preferences data
 * @returns Promise<DbResponse<UserPreferences>> - Created preferences or error
 */
export async function createUserPreferences(
  userId: string, 
  preferences: Partial<UserPreferences> = {}
): Promise<DbResponse<UserPreferences>> {
  try {
    console.log('🔍 [PREFS] Creating user preferences:', { userId, preferences });
    
    const result = await executeQuery(
      'INSERT INTO user_preferences (user_id, transcript_processing, send_cleaned_transcript, send_summary, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))',
      [
        userId, 
        preferences.transcript_processing || 'raw',
        preferences.send_cleaned_transcript ?? 0,
        preferences.send_summary ?? 0
      ]
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Return the created preferences
    const userPreferences: UserPreferences = {
      user_id: userId,
      transcript_processing: preferences.transcript_processing || 'raw',
      send_cleaned_transcript: preferences.send_cleaned_transcript ?? 0,
      send_summary: preferences.send_summary ?? 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return { success: true, data: userPreferences };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create user preferences' 
    };
  }
}

/**
 * Update user preferences
 * @param userId - User ID
 * @param updates - Partial updates to preferences
 * @returns Promise<DbResponse<UserPreferences>> - Updated preferences or error
 */
export async function updateUserPreferences(
  userId: string, 
  updates: Partial<Pick<UserPreferences, 'transcript_processing' | 'send_cleaned_transcript' | 'send_summary'>>
): Promise<DbResponse<UserPreferences>> {
  try {
    console.log('🔍 [PREFS] Updating user preferences:', { userId, updates });
    
    const updateFields = [];
    const values = [];
    
    if (updates.transcript_processing !== undefined) {
      updateFields.push('transcript_processing = ?');
      values.push(updates.transcript_processing);
    }
    
    if (updates.send_cleaned_transcript !== undefined) {
      updateFields.push('send_cleaned_transcript = ?');
      values.push(updates.send_cleaned_transcript);
    }
    
    if (updates.send_summary !== undefined) {
      updateFields.push('send_summary = ?');
      values.push(updates.send_summary);
    }
    
    if (updateFields.length === 0) {
      return { success: false, error: 'No updates provided' };
    }
    
    updateFields.push('updated_at = datetime("now")');
    values.push(userId);
    
    const result = await executeQuery(
      `UPDATE user_preferences SET ${updateFields.join(', ')} WHERE user_id = ?`,
      values
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Get the updated preferences
    const updatedPrefs = await getUserPreferences(userId);
    return updatedPrefs;
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update user preferences' 
    };
  }
}

/**
 * Ensure user has preferences (create if missing)
 * @param userId - User ID
 * @returns Promise<DbResponse<UserPreferences>> - User preferences
 */
export async function ensureUserPreferences(userId: string): Promise<DbResponse<UserPreferences>> {
  try {
    console.log('🔍 [PREFS] Ensuring user preferences exist for:', userId);
    
    let preferences = await getUserPreferences(userId);
    
    if (!preferences.success) {
      // Create default preferences if they don't exist
      console.log('🔍 [PREFS] Creating default preferences for user:', userId);
      preferences = await createUserPreferences(userId);
    }
    
    return preferences;
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to ensure user preferences' 
    };
  }
}

/**
 * Update voice event status and metadata
 * @param eventId - Voice event ID
 * @param updates - Partial updates to voice event
 * @returns Promise<DbResponse<VoiceEvent>> - Updated voice event or error
 */
export async function updateVoiceEvent(
  eventId: string, 
  updates: Partial<{
    status: 'processing' | 'completed' | 'failed';
    completed_at: Date;
    error_message: string;
  }>
): Promise<DbResponse<VoiceEvent>> {
  try {
    console.log('🔍 [DB] Updating voice event:', { eventId, updates });
    
    const updateFields = [];
    const values = [];
    
    if (updates.status) {
      updateFields.push('status = ?');
      values.push(updates.status);
    }
    
    if (updates.completed_at) {
      updateFields.push('completed_at = ?');
      values.push(updates.completed_at.toISOString());
    }
    
    if (updates.error_message) {
      updateFields.push('error_message = ?');
      values.push(updates.error_message);
    }
    
    if (updateFields.length === 0) {
      return { success: false, error: 'No updates provided' };
    }
    
    values.push(eventId);
    
    const result = await executeQuery(
      `UPDATE voice_events SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );
    
    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Get the updated voice event
    const updatedEvent = await executeQuery<VoiceEvent>(
      'SELECT * FROM voice_events WHERE id = ? LIMIT 1',
      [eventId]
    );

    if (!updatedEvent.success || !updatedEvent.results?.[0]) {
      return { success: false, error: 'Failed to retrieve updated voice event' };
    }

    return { success: true, data: updatedEvent.results[0] };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update voice event' 
    };
  }
}

/**
 * Insert a voice event and return the event ID
 * @param eventData - Voice event data
 * @returns Promise<string> - Event ID or throws error
 */
export async function insertVoiceEventAndGetId(
  eventData: CreateVoiceEventData
): Promise<string> {
  const result = await insertVoiceEvent(eventData);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to insert voice event');
  }
  
  return result.data!.id;
}

/**
 * Convert SQLite boolean integers to JavaScript booleans
 * @param preferences - Raw preferences from database
 * @returns User preferences with proper boolean conversion
 */
export function convertUserPreferences(preferences: UserPreferences): UserEnhancementPreferences {
  return {
    sendCleanedTranscript: Boolean(preferences.send_cleaned_transcript),
    sendSummary: Boolean(preferences.send_summary)
  };
}

/**
 * Get user enhancement preferences in a usable format
 * @param userId - User ID
 * @returns Promise<DbResponse<UserEnhancementPreferences>> - Converted preferences or error
 */
export async function getUserEnhancementPreferences(userId: string): Promise<DbResponse<UserEnhancementPreferences>> {
  try {
    const prefsResult = await getUserPreferences(userId);
    
    if (!prefsResult.success || !prefsResult.data) {
      return { success: false, error: prefsResult.error };
    }
    
    const enhancementPrefs = convertUserPreferences(prefsResult.data);
    
    return { success: true, data: enhancementPrefs };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get enhancement preferences' 
    };
  }
}

/**
 * Update user enhancement preferences
 * @param userId - User ID
 * @param preferences - Enhancement preferences to update
 * @returns Promise<DbResponse<UserPreferences>> - Updated preferences or error
 */
export async function updateUserEnhancementPreferences(
  userId: string,
  preferences: Partial<UserEnhancementPreferences>
): Promise<DbResponse<UserPreferences>> {
  try {
    const updates: Partial<Pick<UserPreferences, 'send_cleaned_transcript' | 'send_summary'>> = {};
    
    if (preferences.sendCleanedTranscript !== undefined) {
      updates.send_cleaned_transcript = preferences.sendCleanedTranscript ? 1 : 0;
    }
    
    if (preferences.sendSummary !== undefined) {
      updates.send_summary = preferences.sendSummary ? 1 : 0;
    }
    
    return await updateUserPreferences(userId, updates);
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update enhancement preferences' 
    };
  }
}

/**
 * Get the list of enhancement types that should be processed for a user
 * @param userId - User ID
 * @returns Promise<EnhancementType[]> - Array of enhancement types to process
 */
export async function getUserRequestedEnhancements(userId: string): Promise<EnhancementType[]> {
  try {
    const prefsResult = await getUserEnhancementPreferences(userId);
    
    if (!prefsResult.success || !prefsResult.data) {
      console.warn('🔍 [PREFS] Could not get enhancement preferences, returning empty array');
      return [];
    }
    
    const enhancements: EnhancementType[] = [];
    
    if (prefsResult.data.sendCleanedTranscript) {
      enhancements.push('cleanup');
    }
    
    if (prefsResult.data.sendSummary) {
      enhancements.push('summary');
    }
    
    console.log('🔍 [PREFS] User enhancement preferences:', {
      userId,
      sendCleanedTranscript: prefsResult.data.sendCleanedTranscript,
      sendSummary: prefsResult.data.sendSummary,
      enhancementsToProcess: enhancements
    });
    
    return enhancements;
  } catch (error) {
    console.error('🚨 [PREFS] Error getting user enhancements:', error);
    return [];
  }
}

/**
 * Create JSON string of enhancement types for database storage
 * @param enhancements - Array of enhancement types
 * @returns JSON string for database storage
 */
export function serializeEnhancements(enhancements: EnhancementType[]): string {
  return JSON.stringify(enhancements);
}

/**
 * Parse JSON string of enhancement types from database
 * @param enhancementsJson - JSON string from database
 * @returns Array of enhancement types
 */
export function deserializeEnhancements(enhancementsJson: string | null): EnhancementType[] {
  if (!enhancementsJson) {
    return [];
  }
  
  try {
    const parsed = JSON.parse(enhancementsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('🚨 [DB] Error parsing enhancements JSON:', error);
    return [];
  }
}

/**
 * Backfill API keys for existing users who don't have them
 * @returns Promise<DbResponse<number>> - Number of users updated
 */
export async function backfillApiKeys(): Promise<DbResponse<number>> {
  try {
    console.log('🔧 [MIGRATION] Starting API key backfill for existing users');
    
    // Get users without API keys
    const usersResult = await executeQuery<User>(
      'SELECT * FROM users WHERE api_key IS NULL'
    );

    if (!usersResult.success) {
      return { success: false, error: usersResult.error };
    }

    const usersWithoutKeys = usersResult.results || [];
    console.log(`🔧 [MIGRATION] Found ${usersWithoutKeys.length} users without API keys`);

    if (usersWithoutKeys.length === 0) {
      console.log('✅ [MIGRATION] All users already have API keys');
      return { success: true, data: 0 };
    }

    let updatedCount = 0;

    // Update each user with a unique API key
    for (const user of usersWithoutKeys) {
      let apiKey: string;
      let attempts = 0;
      const maxAttempts = 5;

      // Generate unique API key with retry logic
      do {
        apiKey = generateApiKey();
        attempts++;

        const updateResult = await executeQuery(
          'UPDATE users SET api_key = ? WHERE id = ? AND api_key IS NULL',
          [apiKey, user.id]
        );

        if (updateResult.success && updateResult.meta?.changes) {
          console.log(`✅ [MIGRATION] Generated API key for user: ${user.google_email}`);
          updatedCount++;
          break;
        } else if (attempts >= maxAttempts) {
          console.error(`❌ [MIGRATION] Failed to generate unique API key for user: ${user.google_email}`);
          break;
        }
      } while (attempts < maxAttempts);
    }

    console.log(`✅ [MIGRATION] Backfill completed: ${updatedCount}/${usersWithoutKeys.length} users updated`);
    return { success: true, data: updatedCount };
  } catch (error) {
    console.error('🚨 [MIGRATION] API key backfill error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to backfill API keys' 
    };
  }
} 