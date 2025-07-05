import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, getSessionUser } from '@/lib/auth';
import { 
  getUserPreferences, 
  updateUserPreferences, 
  ensureUserPreferences,
  getUserByEmail,
  convertUserPreferences
} from '@/lib/database';

/**
 * GET /api/user/preferences
 * Get current user's enhancement preferences
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = getSessionUser(session);
    if (!user?.email) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    console.log('🔍 [PREFS API] Getting preferences for user:', user.email);

    // Get user by email to ensure we have the user ID
    const userResult = await getUserByEmail(user.email);
    if (!userResult.success || !userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get preferences and ensure they exist
    const preferencesResult = await ensureUserPreferences(userResult.data.id);
    
    if (!preferencesResult.success || !preferencesResult.data) {
      return NextResponse.json({ error: 'Failed to get preferences' }, { status: 500 });
    }

    // Convert to boolean format for frontend
    const enhancementPrefs = convertUserPreferences(preferencesResult.data);
    
    console.log('✅ [PREFS API] Preferences retrieved:', {
      userId: userResult.data.id,
      sendCleanedTranscript: enhancementPrefs.sendCleanedTranscript,
      sendSummary: enhancementPrefs.sendSummary
    });
    
    return NextResponse.json({
      success: true,
      data: {
        send_cleaned_transcript: enhancementPrefs.sendCleanedTranscript,
        send_summary: enhancementPrefs.sendSummary,
        user_id: userResult.data.id
      }
    });
  } catch (error) {
    console.error('❌ [PREFS API] Failed to get preferences:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * PUT /api/user/preferences
 * Update current user's enhancement preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = getSessionUser(session);
    if (!user?.email) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    console.log('🔍 [PREFS API] Updating preferences for user:', user.email);

    const body = await request.json();
    const { send_cleaned_transcript, send_summary } = body;
    
    // Validate boolean values
    if (typeof send_cleaned_transcript !== 'boolean' || typeof send_summary !== 'boolean') {
      console.error('❌ [PREFS API] Invalid preference values:', { send_cleaned_transcript, send_summary });
      return NextResponse.json({ 
        error: 'Invalid preference values. Both send_cleaned_transcript and send_summary must be boolean.' 
      }, { status: 400 });
    }

    // Get user by email to ensure we have the user ID
    const userResult = await getUserByEmail(user.email);
    if (!userResult.success || !userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('🔍 [PREFS API] Updating preferences:', {
      userId: userResult.data.id,
      sendCleanedTranscript: send_cleaned_transcript,
      sendSummary: send_summary
    });

    // Update preferences (convert boolean to integer for database)
    const updateResult = await updateUserPreferences(userResult.data.id, { 
      send_cleaned_transcript: send_cleaned_transcript ? 1 : 0, 
      send_summary: send_summary ? 1 : 0
    });
    
    if (!updateResult.success) {
      console.error('❌ [PREFS API] Failed to update preferences:', updateResult.error);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    console.log('✅ [PREFS API] Preferences updated successfully');
    
    return NextResponse.json({ 
      success: true,
      message: 'Preferences updated successfully',
      data: {
        send_cleaned_transcript,
        send_summary
      }
    });
  } catch (error) {
    console.error('❌ [PREFS API] Failed to update preferences:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
} 