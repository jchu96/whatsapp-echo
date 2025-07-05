// @ts-ignore
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from "@sentry/nextjs";
import { 
  verifyMailgunSignature, 
  extractUserSlug, 
  sendSuccessEmail,
  sendErrorEmail 
} from '@/lib/mailgun';
import { getUserBySlug, insertVoiceEvent, ensureUserPreferences, insertVoiceEventAndGetId, getUserRequestedEnhancements, serializeEnhancements } from '@/lib/database';
import { validateAudioFile } from '@/lib/audio';
import { fastTranscribeAudio, cleanTranscription, categorizeWhisperError } from '@/lib/whisper';
import { 
  categorizeError, 
  createMetricsTracker, 
  logProcessingMetrics,
  AudioProcessingError,
  ProcessingTimeoutError
} from '@/lib/errors';
import { 
  handleProcessingError,
  createErrorContext,
  withTimeoutAndErrorHandling
} from '@/lib/enhanced-errors';
import { getAudioProcessingConfig } from '@/utils/env';
import { AudioFile, ProcessingContext, TimeoutErrorType, BackgroundProcessingMetadata } from '@/types';
import { requiresBackgroundProcessing } from '@/lib/voice-processor';

// TypeScript interface for Mailgun webhook data
interface MailgunWebhookData {
  recipient: string;
  sender: string;
  subject: string;
  'body-plain': string;
  'body-html': string;
  'message-headers': string;
  'attachment-count': string;
  timestamp: string;
  signature: string;
  token: string;
}

// Vercel configuration for Hobby tier optimization
export const runtime = 'nodejs';
export const maxDuration = 60;

// Note: In App Router, body parsing is handled differently - no config needed



/**
 * Check if file is an audio file
 */
function isAudioFile(filename: string, contentType: string): boolean {
  const audioExtensions = ['.m4a', '.mp3', '.wav', '.ogg', '.aac', '.flac'];
  const audioMimeTypes = [
    'audio/m4a',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/aac',
    'audio/flac',
    'audio/mp4a-latm' // Mailgun specific
  ];
  
  const hasAudioExtension = audioExtensions.some(ext => 
    filename.toLowerCase().endsWith(ext)
  );
  
  const hasAudioMimeType = audioMimeTypes.some(type => 
    contentType.toLowerCase().includes(type)
  );
  
  return hasAudioExtension || hasAudioMimeType;
}

/**
 * POST handler for Mailgun inbound webhook
 * Processes voice note emails with aggressive timeout handling
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const config = getAudioProcessingConfig();
  
  console.log('🎵 [INBOUND] === NEW REQUEST ===');
  console.log('🎵 [INBOUND] Request received at:', new Date().toISOString());
  console.log('🎵 [INBOUND] Processing timeout:', config.processingTimeoutSec, 'seconds');
  
  // Create abort controller with safety margin
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('⏰ [INBOUND] Processing timeout reached, aborting...');
    controller.abort();
  }, config.processingTimeoutSec * 1000);
  
  const metricsTracker = createMetricsTracker(startTime);
  
  // Declare webhookData at function scope so it's available in catch block
  let webhookData: MailgunWebhookData | undefined;
  
  try {
    metricsTracker.startPhase('webhook_parsing');
    console.log('📋 [INBOUND] Starting webhook parsing phase');
    
    // Parse multipart form data using Next.js native support
    console.log('📋 [INBOUND] Starting FormData parsing...');
    let formData: FormData;
    try {
      formData = await request.formData();
      console.log('📋 [INBOUND] FormData parsed successfully');
      
      // Log all form entries for debugging
      const allKeys = Array.from(formData.keys());
      console.log('📋 [INBOUND] FormData keys found:', {
        totalKeys: allKeys.length,
        keys: allKeys,
        attachmentKeys: allKeys.filter(key => key.startsWith('attachment-')),
        webhookKeys: allKeys.filter(key => !key.startsWith('attachment-'))
      });
      
    } catch (parseError) {
      console.error('❌ [INBOUND] Failed to parse form data:', parseError);
      console.error('❌ [INBOUND] Parse error details:', {
        errorMessage: parseError instanceof Error ? parseError.message : String(parseError),
        errorStack: parseError instanceof Error ? parseError.stack : 'No stack trace',
        contentType: request.headers.get('content-type'),
        contentLength: request.headers.get('content-length')
      });
      throw new Error(`Failed to parse multipart form data: ${parseError}`);
    }

    console.log('📋 [INBOUND] Extracting webhook data from FormData...');

    // Extract webhook data from FormData
    webhookData = {
      recipient: formData.get('recipient') as string,
      sender: formData.get('sender') as string,
      subject: formData.get('subject') as string,
      'body-plain': formData.get('body-plain') as string,
      'body-html': formData.get('body-html') as string,
      'message-headers': formData.get('message-headers') as string,
      'attachment-count': formData.get('attachment-count') as string,
      timestamp: formData.get('timestamp') as string,
      signature: formData.get('signature') as string,
      token: formData.get('token') as string,
    };

    console.log('📧 [INBOUND] Webhook data extracted:', {
      sender: webhookData.sender,
      recipient: webhookData.recipient,
      subject: webhookData.subject,
      timestamp: webhookData.timestamp,
      attachmentCount: webhookData['attachment-count'],
      hasTimestamp: !!webhookData.timestamp,
      hasSignature: !!webhookData.signature,
      hasToken: !!webhookData.token
    });

    console.log('🎵 [INBOUND] Scanning for audio attachments...');

    // Find audio attachments in FormData
    const audioFiles: File[] = [];
    const allAttachments: Array<{key: string, name: string, size: number, type: string, isAudio: boolean}> = [];

    // Use Array.from to iterate over FormData entries
    Array.from(formData.entries()).forEach(([key, value]) => {
      if (key.startsWith('attachment-') && value instanceof File) {
        const isAudio = isAudioFile(value.name, value.type);
        
        allAttachments.push({
          key,
          name: value.name,
          size: value.size,
          type: value.type,
          isAudio
        });
        
        console.log(`🎵 [INBOUND] Found attachment [${key}]: ${value.name}`, {
          size: value.size,
          type: value.type,
          sizeInMB: Math.round(value.size / 1024 / 1024 * 100) / 100,
          isAudio: isAudio
        });
        
        if (isAudio) {
          console.log(`✅ [INBOUND] Audio file detected: ${value.name}`);
          audioFiles.push(value);
        } else {
          console.log(`❌ [INBOUND] Non-audio file skipped: ${value.name} (type: ${value.type})`);
        }
      }
    });

    console.log('🎵 [INBOUND] Attachment scan complete:', {
      totalAttachments: allAttachments.length,
      audioFiles: audioFiles.length,
      expectedAttachments: webhookData['attachment-count'],
      attachmentSummary: allAttachments.map(a => ({
        name: a.name,
        type: a.type,
        isAudio: a.isAudio,
        sizeMB: Math.round(a.size / 1024 / 1024 * 100) / 100
      }))
    });

    if (audioFiles.length > 0) {
      console.log('🎵 [INBOUND] Audio files ready for processing:', audioFiles.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        sizeInMB: Math.round(f.size / 1024 / 1024 * 100) / 100
      })));
    }

    // Verify Mailgun signature for security
    console.log('🔐 [INBOUND] Verifying Mailgun signature...');
    if (!verifyMailgunSignature(webhookData.timestamp, webhookData.token, webhookData.signature)) {
      console.error('❌ [INBOUND] Invalid Mailgun signature');
      
      const error = new Error('Invalid Mailgun signature');
      await handleProcessingError(error, {
        userEmail: webhookData.sender,
        phase: 'signature_verification',
        additionalData: {
          recipient: webhookData.recipient,
          timestamp: webhookData.timestamp,
          securityIssue: true
        }
      });
      
      // Use 406 to prevent retries - signature won't become valid on retry
      return NextResponse.json({ error: 'Invalid signature' }, { status: 406 });
    }
    console.log('✅ [INBOUND] Mailgun signature verified');
    
    // Extract user slug from recipient email
    const slug = extractUserSlug(webhookData.recipient);
    console.log('🔍 [INBOUND] Extracted user slug:', slug);
    if (!slug) {
      console.error('❌ [INBOUND] No valid slug found in recipient:', webhookData.recipient);
      
      const error = new Error(`No valid slug found in recipient: ${webhookData.recipient}`);
      await handleProcessingError(error, {
        userEmail: webhookData.sender,
        phase: 'slug_extraction',
        additionalData: { recipient: webhookData.recipient }
      });
      
      // Use 406 to prevent retries - recipient address won't change on retry
      return NextResponse.json({ error: 'Invalid recipient' }, { status: 406 });
    }
    
    metricsTracker.startPhase('user_lookup');
    console.log('👤 [INBOUND] Starting user lookup phase');
    console.log('👤 [INBOUND] About to call getUserBySlug with slug:', slug);
    
    // Look up user and verify approval with timeout
    let userResult: Awaited<ReturnType<typeof getUserBySlug>>;
    try {
      console.log('👤 [INBOUND] Starting database lookup with 10 second timeout...');
      userResult = await Promise.race([
        getUserBySlug(slug),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Database lookup timeout after 10 seconds')), 10000)
        )
      ]);
      console.log('👤 [INBOUND] Database lookup completed successfully');
    } catch (error) {
      console.error('👤 [INBOUND] Database lookup failed or timed out:', error);
      throw error; // Re-throw to be caught by outer handler
    }
    
    console.log('👤 [INBOUND] getUserBySlug completed, processing results...');
    console.log('🔍 [INBOUND] User lookup result:', {
      success: userResult.success,
      hasData: !!userResult.data,
      userEmail: userResult.data?.google_email,
      error: userResult.error
    });
    
    console.log('👤 [INBOUND] Database lookup details:', {
      slug,
      querySuccess: userResult.success,
      userFound: !!userResult.data,
      userEmail: userResult.data?.google_email,
      userApproved: userResult.data?.approved,
      errorMessage: userResult.error
    });
    
    if (!userResult.success || !userResult.data) {
      console.error('❌ [INBOUND] User not found for slug:', slug);
      
      const error = new Error(`User not found for slug: ${slug}`);
      // Don't send error email for unknown users (security), but do report to Sentry
      await handleProcessingError(error, {
        phase: 'user_lookup',
        additionalData: { slug, recipient: webhookData.recipient }
      });
      
      // Use 406 to prevent retries - user won't appear on retry
      return NextResponse.json({ error: 'User not found' }, { status: 406 });
    }
    
    const user = userResult.data;
    console.log('👤 [INBOUND] User found:', {
      id: user.id,
      email: user.google_email,
      approved: user.approved,
      slug: user.slug
    });
    
    if (!Boolean(user.approved)) {
      console.error('❌ [INBOUND] User not approved:', user.google_email);
      
      const error = new Error(`User not approved: ${user.google_email}`);
      // This SHOULD send error email to user since they exist
      await handleProcessingError(error, {
        userId: user.id,
        userEmail: user.google_email,
        phase: 'user_approval_check',
        additionalData: { slug: user.slug }
      }, controller.signal);
      
      // Use 406 to prevent retries - approval status won't change automatically
      return NextResponse.json({ error: 'User not approved' }, { status: 406 });
    }
    console.log('✅ [INBOUND] User approved, proceeding with processing');
    
    // Get user preferences for smart routing
    console.log('🔍 [INBOUND] Getting user preferences for smart routing...');
    const preferencesResult = await ensureUserPreferences(user.id);
    
    if (!preferencesResult.success || !preferencesResult.data) {
      console.error('❌ [INBOUND] Failed to get user preferences:', preferencesResult.error);
      
      const error = new Error(`Failed to get user preferences: ${preferencesResult.error}`);
      await handleProcessingError(error, {
        userId: user.id,
        userEmail: user.google_email,
        phase: 'preferences_lookup',
        additionalData: { slug: user.slug }
      }, controller.signal);
      
      return NextResponse.json({ error: 'Failed to get user preferences' }, { status: 500 });
    }
    
    const userPreferences = preferencesResult.data;
    
    // Get enhancement preferences using the new system
    const requestedEnhancements = await getUserRequestedEnhancements(user.id);
    
    console.log('✅ [INBOUND] User preferences retrieved:', {
      userId: user.id,
      legacyProcessingType: userPreferences.transcript_processing,
      sendCleanedTranscript: Boolean(userPreferences.send_cleaned_transcript),
      sendSummary: Boolean(userPreferences.send_summary),
      requestedEnhancements,
      requiresBackground: requiresBackgroundProcessing(requestedEnhancements)
    });
    
    if (audioFiles.length === 0) {
      console.error('❌ [INBOUND] No audio attachments found');
      
      const error = new Error('No audio attachments found');
      await handleProcessingError(error, {
        userId: user.id,
        userEmail: user.google_email,
        phase: 'attachment_detection',
        additionalData: { 
          attachmentCount: audioFiles.length,
          totalAttachments: webhookData['attachment-count'] 
        }
      }, controller.signal);
      
      // Use 406 to prevent retries - same email won't have attachments on retry
      return NextResponse.json({ error: 'No audio attachments found' }, { status: 406 });
    }
    
    // Process the first audio attachment
    const audioFile = audioFiles[0];
    
    console.log('🎵 [INBOUND] Preparing to process audio file:', {
      filename: audioFile.name,
      size: audioFile.size,
      contentType: audioFile.type,
      sizeInMB: Math.round(audioFile.size / 1024 / 1024 * 100) / 100,
      lastModified: new Date(audioFile.lastModified).toISOString()
    });
    
    // Create processing context
    const context: ProcessingContext = {
      userId: user.id,
      userEmail: user.google_email,
      slug: user.slug,
      startTime,
      abortController: controller,
      timeoutId
    };
    
    console.log('🔄 [INBOUND] Starting "Always Raw + Optional Enhancements" processing:', {
      userId: context.userId,
      userEmail: context.userEmail,
      slug: context.slug,
      requestedEnhancements,
      hasEnhancements: requestedEnhancements.length > 0,
      timeoutRemaining: Math.max(0, config.processingTimeoutSec * 1000 - (Date.now() - startTime))
    });
    
    // STEP 1: Always process raw transcript synchronously (immediate response)
    console.log('🔄 [INBOUND] Processing raw transcript (synchronous)...');
    
    const result = await processVoiceNote(audioFile, context, metricsTracker);
    
    clearTimeout(timeoutId);
    
    // Log metrics for raw processing
    const metrics = metricsTracker.getMetrics(audioFile.size, result.success, result.errorType);
    logProcessingMetrics(metrics, result.success);
    
    console.log('📊 [INBOUND] Raw processing completed:', {
      success: result.success,
      totalTime: metrics.totalTime,
      fileSize: metrics.fileSize,
      errorType: result.errorType,
      error: result.error,
      enhancementsQueued: requestedEnhancements.length
    });
    
    if (!result.success) {
      console.log('❌ [INBOUND] Raw processing failed, not proceeding with enhancements:', {
        error: result.error,
        errorType: result.errorType,
        filename: audioFile.name,
        processingTimeMs: Date.now() - startTime
      });
      return NextResponse.json(
        { error: result.error || 'Processing failed' }, 
        { status: 500 }
      );
    }
    
    console.log('✅ [INBOUND] Raw transcript processed successfully');
    
    // STEP 2: Queue optional enhancements in background (if requested)
    let enhancementEventId: string | null = null;
    let enhancementStatus = 'none';
    
    if (requestedEnhancements.length > 0 && result.transcript) {
      try {
        console.log('🔄 [INBOUND] Queuing background enhancements:', requestedEnhancements);
        console.log('🔄 [INBOUND] Using transcript from raw processing (no re-transcription needed)');
        
        // Create voice event for enhancement tracking
        enhancementEventId = await insertVoiceEventAndGetId({
          user_id: user.id,
          duration_sec: result.duration,
          bytes: audioFile.size,
          status: 'processing',
          processing_type: 'cleanup', // Will be updated by background processor based on actual enhancements
          enhancements_requested: serializeEnhancements(requestedEnhancements)
        });
        
        console.log('💾 [INBOUND] Enhancement event created:', {
          enhancementEventId,
          requestedEnhancements,
          userId: user.id
        });
        
        // Create background processing metadata with transcript from raw processing
        const enhancementMetadata: BackgroundProcessingMetadata = {
          userId: user.id,
          userEmail: user.google_email,
          eventId: enhancementEventId,
          enhancementTypes: requestedEnhancements,
          filename: audioFile.name,
          fileSize: audioFile.size,
          transcript: result.transcript // Pass transcript from raw processing
        };
        
        // Queue for background processing in separate serverless function
        const crypto = require('crypto');
        const authToken = crypto
          .createHash('sha256')
          .update(process.env.NEXTAUTH_SECRET || '')
          .digest('hex');

        fetch(`${request.url.replace('/api/inbound', '/api/background/enhance-transcript')}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(enhancementMetadata)
        }).catch((enhancementError: Error) => {
          console.error('❌ [INBOUND] Enhancement processing failed asynchronously:', enhancementError);
          // Don't await this - let it fail in background without affecting response
        });
        
        enhancementStatus = 'queued';
        
        console.log('✅ [INBOUND] Enhancement processing queued successfully');
        
      } catch (enhancementError) {
        console.error('❌ [INBOUND] Failed to queue enhancement processing:', enhancementError);
        enhancementStatus = 'failed';
        
        // Don't fail the entire request - raw transcript was successful
        await handleProcessingError(enhancementError, {
          userId: user.id,
          userEmail: user.google_email,
          phase: 'enhancement_setup',
          additionalData: {
            requestedEnhancements,
            filename: audioFile.name
          }
        });
      }
    } else if (requestedEnhancements.length > 0) {
      console.error('❌ [INBOUND] Enhancements requested but no transcript available from raw processing');
      enhancementStatus = 'failed';
    } else {
      console.log('ℹ️ [INBOUND] No enhancements requested, raw transcript only');
    }
    
    // Return success response for raw transcript
    console.log('✅ [INBOUND] Voice note processing completed successfully');
    console.log('✅ [INBOUND] Success metrics:', {
      filename: audioFile.name,
      processingTimeMs: metrics.totalTime,
      fileSizeMB: Math.round(audioFile.size / 1024 / 1024 * 100) / 100,
      transcriptionLength: 'Not logged for privacy',
      enhancementsQueued: requestedEnhancements.length,
      enhancementStatus
    });
    
    return NextResponse.json({ 
      message: 'Voice note processed successfully',
      processing_type: 'raw',
      enhancements: {
        requested: requestedEnhancements,
        status: enhancementStatus,
        event_id: enhancementEventId,
        estimated_completion: requestedEnhancements.length > 0 ? 'Within 2-3 minutes' : null
      },
      metrics: {
        totalTime: metrics.totalTime,
        fileSize: metrics.fileSize
      }
    });
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    console.error('❌ [INBOUND] Webhook processing error:', error);
    console.error('❌ [INBOUND] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Enhanced error logging with detailed context
    console.error('❌ [INBOUND] Webhook processing failed with full context:', {
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : 'No stack trace',
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      processingTimeMs: Date.now() - startTime,
      requestHeaders: {
        contentType: request.headers.get('content-type'),
        contentLength: request.headers.get('content-length'),
        userAgent: request.headers.get('user-agent')
      }
    });

    // Try to get user email from already parsed webhook data if available
    let userEmail: string | undefined;
    try {
      if (webhookData?.sender) {
        userEmail = webhookData.sender;
        console.log('📧 [INBOUND] Using sender from parsed webhook data:', {
          userEmail,
          hasWebhookData: !!webhookData,
          webhookKeys: webhookData ? Object.keys(webhookData) : []
        });
      } else {
        console.log('📧 [INBOUND] No webhook data available for error context:', {
          hasWebhookData: !!webhookData,
          webhookDataType: typeof webhookData
        });
      }
    } catch (parseError) {
      console.error('❌ [INBOUND] Could not get user email for error handling:', {
        parseError: parseError instanceof Error ? parseError.message : String(parseError),
        hasWebhookData: !!webhookData
      });
    }
    
    const metrics = metricsTracker.getMetrics(0, false);
    await handleProcessingError(error, {
      userEmail,
      processingMetrics: metrics,
      phase: 'webhook_processing',
      additionalData: {
        requestUrl: request.url,
        userAgent: request.headers.get('user-agent'),
        elapsedTime: Date.now() - startTime
      }
    }, controller.signal);
    
    return NextResponse.json(
      { error: 'Internal processing error' }, 
      { status: 500 }
    );
  }
}

/**
 * Process voice note with timeout handling
 * @param audioFile - Audio file to process
 * @param context - Processing context
 * @param metricsTracker - Metrics tracker
 * @returns Processing result with transcript and duration
 */
async function processVoiceNote(
  audioFile: File, 
  context: ProcessingContext,
  metricsTracker: any
): Promise<{ success: boolean; error?: string; errorType?: TimeoutErrorType; transcript?: string; duration?: number }> {
  
  console.log('🔍 [PROCESS] Starting processVoiceNote with File object:', {
    name: audioFile.name,
    size: audioFile.size,
    type: audioFile.type,
    lastModified: new Date(audioFile.lastModified).toISOString()
  });

  const audioFileData: AudioFile = {
    filename: audioFile.name,
    size: audioFile.size,
    contentType: audioFile.type,
    url: '' // Not needed since we have the File object
  };

  console.log('📁 [PROCESS] AudioFile metadata created:', {
    filename: audioFileData.filename,
    size: audioFileData.size,
    contentType: audioFileData.contentType,
    sizeInMB: Math.round(audioFileData.size / 1024 / 1024 * 100) / 100
  });

  const errorContext = createErrorContext(context, {
    filename: audioFileData.filename,
    fileSize: audioFileData.size,
    contentType: audioFileData.contentType
  });
  
  try {
    metricsTracker.startPhase('validation');
    console.log('🔍 [PROCESS] Starting validation phase');
    
    // Validate audio file
    const validation = validateAudioFile(audioFileData);
    console.log('🔍 [PROCESS] Validation result:', {
      isValid: validation.isValid,
      errorType: validation.errorType,
      errorMessage: validation.errorMessage
    });
    
    if (!validation.isValid) {
      console.log('❌ [PROCESS] Audio validation failed, sending error email');
      
      const error = new AudioProcessingError(
        validation.errorMessage || 'Audio validation failed',
        validation.errorType!,
        audioFileData.filename,
        audioFileData.size
      );
      
      await handleProcessingError(error, {
        ...errorContext,
        phase: 'validation'
      }, context.abortController.signal);
      
      return { 
        success: false, 
        error: validation.errorMessage, 
        errorType: validation.errorType 
      };
    }
    console.log('✅ [PROCESS] Audio validation passed');
    
    metricsTracker.startPhase('download');
    console.log('📦 [PROCESS] Using File object directly - no buffer conversion needed');
    
    console.log('📦 [PROCESS] File object ready for Whisper API:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type,
      lastModified: new Date(audioFile.lastModified).toISOString()
    });
    
    metricsTracker.startPhase('transcription');
    console.log('🎤 [PROCESS] Starting transcription phase');
    
    console.log('🎤 [PROCESS] Preparing File object for Whisper API:', {
      fileName: audioFile.name,
      fileSize: audioFile.size,
      fileType: audioFile.type,
      fileLastModified: new Date(audioFile.lastModified).toISOString()
    });

    console.log('🎤 [PROCESS] Starting Whisper API transcription...');
    const transcriptionResult = await withTimeoutAndErrorHandling(
      () => {
        console.log('🎤 [PROCESS] Calling fastTranscribeAudio with 40 second timeout');
        return fastTranscribeAudio(audioFile, 40000); // audioFile is now properly handled by the Whisper function
      },
      45000, // 45 second timeout
      { ...errorContext, phase: 'transcription' },
      'Audio Transcription'
    );

    console.log('🎤 [PROCESS] Whisper API transcription completed:', {
      success: !!transcriptionResult,
      duration: transcriptionResult?.duration,
      textLength: transcriptionResult?.text?.length || 0,
      hasText: !!transcriptionResult?.text,
      // firstChars removed for privacy - transcript content is never logged
    });
    
    const cleanedTranscript = cleanTranscription(transcriptionResult.text);
    console.log('🧹 [PROCESS] Cleaned transcript:', {
      originalLength: transcriptionResult.text?.length || 0,
      cleanedLength: cleanedTranscript?.length || 0,
      hasCleanedText: !!cleanedTranscript
    });
    
    if (!cleanedTranscript) {
      console.log('❌ [PROCESS] Empty transcription result');
      throw new AudioProcessingError(
        'Empty transcription result',
        'general_error',
        audioFileData.filename
      );
    }
    
    metricsTracker.startPhase('database');
    console.log('💾 [PROCESS] Starting database phase');
    
    const voiceEventData = {
      user_id: context.userId,
      duration_sec: transcriptionResult.duration,
      bytes: audioFile.size, // Use original file size
      status: 'completed' as const,
      processing_type: 'raw' as const // Synchronous processing is always raw
    };

    console.log('💾 [PROCESS] Preparing to insert voice event:', voiceEventData);

    await insertVoiceEvent(voiceEventData);

    console.log('💾 [PROCESS] Voice event logged to database successfully:', {
      userId: voiceEventData.user_id,
      duration: voiceEventData.duration_sec,
      bytes: voiceEventData.bytes,
      timestamp: new Date().toISOString()
    });
    
    metricsTracker.startPhase('email');
    console.log('📧 [PROCESS] Starting email phase');
    
    console.log('📧 [PROCESS] Preparing success email:', {
      recipient: context.userEmail,
      transcriptLength: cleanedTranscript.length,
      filename: audioFileData.filename,
      subject: `Voice note transcription: ${audioFileData.filename}`
    });

    const emailSent = await sendSuccessEmail(
      context.userEmail,
      cleanedTranscript,
      audioFileData.filename,
      context.abortController.signal
    );

    console.log('📧 [PROCESS] Email sending completed:', {
      success: emailSent,
      recipient: context.userEmail,
      filename: audioFileData.filename,
      timestamp: new Date().toISOString()
    });
    
    console.log('📧 [PROCESS] Email sent:', emailSent);
    
    if (!emailSent) {
      console.error('❌ [PROCESS] Failed to send success email');
      // Report email failure to Sentry but don't fail the entire process
      await handleProcessingError(
        new Error('Failed to send success email'),
        { ...errorContext, phase: 'email_notification' },
        context.abortController.signal
      );
    }
    
    metricsTracker.endPhase();
    console.log('✅ [PROCESS] All phases completed successfully');
    
    return { 
      success: true,
      transcript: cleanedTranscript,
      duration: transcriptionResult.duration
    };
    
  } catch (error) {
    console.error('❌ [PROCESS] Voice note processing error:', error);
    
    // This catch block now only handles truly unexpected errors
    // since expected errors are handled by the enhanced error handler
    
    const metrics = metricsTracker.getMetrics(audioFile.size, false);
    await handleProcessingError(error, {
      ...errorContext,
      processingMetrics: metrics,
      phase: 'voice_note_processing'
    }, context.abortController.signal);
    
    const errorType = categorizeError(error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
    
    return { 
      success: false, 
      error: errorMessage, 
      errorType
    };
  }
}

/**
 * GET handler for webhook verification (Mailgun setup)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const timestamp = searchParams.get('timestamp');
  const signature = searchParams.get('signature');
  
  if (!token || !timestamp || !signature) {
    return NextResponse.json({ error: 'Missing verification parameters' }, { status: 400 });
  }
  
  if (verifyMailgunSignature(timestamp, token, signature)) {
    return NextResponse.json({ message: 'Webhook verified' });
  } else {
    // Use 406 to prevent retries - verification signature won't change
    return NextResponse.json({ error: 'Invalid signature' }, { status: 406 });
  }
} 