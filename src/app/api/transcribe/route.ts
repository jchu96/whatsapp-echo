import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/auth-api-key';
import { validateAudioFile } from '@/lib/audio';
import { fastTranscribeAudio, cleanTranscription } from '@/lib/whisper';
import { insertVoiceEvent } from '@/lib/database';
import { withTimeoutAndErrorHandling } from '@/lib/enhanced-errors';

// Vercel configuration
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for API routes

/**
 * POST /api/transcribe
 * Transcribe audio file using API key authentication
 * Returns raw transcript only (no email processing)
 */
export async function POST(request: NextRequest) {
  console.log('🎤 [API-TRANSCRIBE] Starting transcription request');
  
  try {
    // Verify API key authentication
    const authHeader = request.headers.get('Authorization');
    const user = await verifyApiKey(authHeader);
    
    if (!user) {
      console.log('🔑 [API-TRANSCRIBE] Authentication failed');
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    console.log('✅ [API-TRANSCRIBE] Authentication successful:', user.google_email);

    // Parse multipart form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error('❌ [API-TRANSCRIBE] Failed to parse form data:', error);
      return NextResponse.json(
        { error: 'Invalid form data - expected multipart/form-data' },
        { status: 400 }
      );
    }

    // Get the audio file from form data
    const file = formData.get('file') as File;
    if (!file) {
      console.error('❌ [API-TRANSCRIBE] No file provided in form data');
      return NextResponse.json(
        { error: 'No file provided - include audio file in "file" field' },
        { status: 400 }
      );
    }

    console.log('📁 [API-TRANSCRIBE] File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate audio file
    const validation = validateAudioFile({
      filename: file.name,
      size: file.size,
      contentType: file.type,
      url: '' // Not needed for direct file validation
    });

    if (!validation.isValid) {
      console.error('❌ [API-TRANSCRIBE] File validation failed:', validation.errorMessage);
      return NextResponse.json(
        { error: validation.errorMessage || 'Invalid audio file' },
        { status: 400 }
      );
    }

    console.log('✅ [API-TRANSCRIBE] File validation passed');

    // Transcribe audio using Whisper
    console.log('🎤 [API-TRANSCRIBE] Starting transcription...');
    const transcriptionResult = await withTimeoutAndErrorHandling(
      () => fastTranscribeAudio(file, 40000), // 40 second timeout
      45000, // 45 second overall timeout
      { phase: 'transcription', userId: user.id, userEmail: user.google_email },
      'API Transcription'
    );

    if (!transcriptionResult?.text) {
      console.error('❌ [API-TRANSCRIBE] Empty transcription result');
      return NextResponse.json(
        { error: 'Transcription failed - empty result' },
        { status: 500 }
      );
    }

    const cleanedTranscript = cleanTranscription(transcriptionResult.text);
    console.log('✅ [API-TRANSCRIBE] Transcription completed:', {
      textLength: cleanedTranscript.length,
      duration: transcriptionResult.duration
    });

    // Log to database for analytics (metadata only)
    try {
      await insertVoiceEvent({
        user_id: user.id,
        duration_sec: transcriptionResult.duration,
        bytes: file.size,
        status: 'completed',
        processing_type: 'api' // Mark as API transcription
      });
      console.log('✅ [API-TRANSCRIBE] Event logged to database');
    } catch (dbError) {
      console.error('⚠️ [API-TRANSCRIBE] Database logging failed (non-critical):', dbError);
      // Don't fail the request if database logging fails
    }

    // Return successful response
    return NextResponse.json({
      text: cleanedTranscript
    });

  } catch (error) {
    console.error('🚨 [API-TRANSCRIBE] Unexpected error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error during transcription' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/transcribe
 * Return API information and usage instructions
 */
export async function GET() {
  return NextResponse.json({
    message: 'Voice Transcription API',
    usage: {
      method: 'POST',
      authentication: 'Bearer token in Authorization header',
      contentType: 'multipart/form-data',
      field: 'file',
      formats: ['m4a', 'mp3', 'wav', 'ogg'],
      maxSize: '15MB',
      response: { text: 'transcribed content' }
    },
    example: 'curl -X POST -H "Authorization: Bearer your-api-key" -F "file=@voice-note.m4a" /api/transcribe'
  });
} 