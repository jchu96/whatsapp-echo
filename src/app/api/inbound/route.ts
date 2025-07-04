// @ts-ignore
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from "@sentry/nextjs";
import { 
  verifyMailgunSignature, 
  parseMailgunWebhook, 
  extractUserSlug, 
  getAudioAttachments,
  sendSuccessEmail,
  sendErrorEmail 
} from '@/lib/mailgun';
import { getUserBySlug, insertVoiceEvent } from '@/lib/database';
import { validateAudioFile, downloadAudioFile, createAudioFile } from '@/lib/audio';
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
import { AudioFile, ProcessingContext, TimeoutErrorType } from '@/types';

// Vercel configuration for Hobby tier optimization
export const runtime = 'nodejs';
export const maxDuration = 60;

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
  
  try {
    metricsTracker.startPhase('webhook_parsing');
    console.log('📋 [INBOUND] Starting webhook parsing phase');
    
    // Parse the form data from Mailgun
    const formData = await request.formData();
    const payload = parseMailgunWebhook(formData);
    
    console.log('📧 [INBOUND] Webhook payload parsed:', {
      sender: payload.sender,
      recipient: payload.recipient,
      subject: payload.subject,
      timestamp: payload.timestamp
    });
    
    // Verify Mailgun signature for security
    console.log('🔐 [INBOUND] Verifying Mailgun signature...');
    if (!verifyMailgunSignature(payload.timestamp, payload.token, payload.signature)) {
      console.error('❌ [INBOUND] Invalid Mailgun signature');
      
      const error = new Error('Invalid Mailgun signature');
      await handleProcessingError(error, {
        userEmail: payload.sender,
        phase: 'signature_verification',
        additionalData: {
          recipient: payload.recipient,
          timestamp: payload.timestamp,
          securityIssue: true
        }
      });
      
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    console.log('✅ [INBOUND] Mailgun signature verified');
    
    // Extract user slug from recipient email
    const slug = extractUserSlug(payload.recipient);
    console.log('🔍 [INBOUND] Extracted user slug:', slug);
    if (!slug) {
      console.error('❌ [INBOUND] No valid slug found in recipient:', payload.recipient);
      
      const error = new Error(`No valid slug found in recipient: ${payload.recipient}`);
      await handleProcessingError(error, {
        userEmail: payload.sender,
        phase: 'slug_extraction',
        additionalData: { recipient: payload.recipient }
      });
      
      return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 });
    }
    
    metricsTracker.startPhase('user_lookup');
    console.log('👤 [INBOUND] Starting user lookup phase');
    
    // Look up user and verify approval
    const userResult = await getUserBySlug(slug);
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
        additionalData: { slug, recipient: payload.recipient }
      });
      
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
      
      return NextResponse.json({ error: 'User not approved' }, { status: 403 });
    }
    console.log('✅ [INBOUND] User approved, proceeding with processing');
    
    // Get audio attachments
    console.log('🎵 [INBOUND] Looking for audio attachments...');
    const audioAttachments = getAudioAttachments(formData);
    console.log('🎵 [INBOUND] Found audio attachments:', audioAttachments.length);
    
    if (audioAttachments.length === 0) {
      console.error('❌ [INBOUND] No audio attachments found');
      
      const error = new Error('No audio attachments found');
      await handleProcessingError(error, {
        userId: user.id,
        userEmail: user.google_email,
        phase: 'attachment_detection',
        additionalData: { 
          attachmentCount: audioAttachments.length,
          totalAttachments: formData.get('attachment-count') 
        }
      }, controller.signal);
      
      return NextResponse.json({ error: 'No audio attachments found' }, { status: 400 });
    }
    
    // Process the first audio attachment
    const attachment = audioAttachments[0];
    const audioFile: AudioFile = {
      filename: attachment.filename,
      size: attachment.size,
      contentType: attachment['content-type'],
      url: attachment.url
    };
    
    console.log('🎵 [INBOUND] Processing audio file:', {
      filename: audioFile.filename,
      size: audioFile.size,
      contentType: audioFile.contentType,
      sizeInMB: Math.round(audioFile.size / 1024 / 1024 * 100) / 100
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
    
    console.log('🔄 [INBOUND] Starting audio processing...');
    // Process the audio file
    const result = await processVoiceNote(audioFile, context, metricsTracker);
    
    clearTimeout(timeoutId);
    
    // Log metrics
    const metrics = metricsTracker.getMetrics(audioFile.size, result.success, result.errorType);
    logProcessingMetrics(metrics, result.success);
    
    console.log('📊 [INBOUND] Processing completed:', {
      success: result.success,
      totalTime: metrics.totalTime,
      fileSize: metrics.fileSize,
      errorType: result.errorType,
      error: result.error
    });
    
    if (result.success) {
      console.log('✅ [INBOUND] Voice note processed successfully');
      return NextResponse.json({ 
        message: 'Voice note processed successfully',
        metrics: {
          totalTime: metrics.totalTime,
          fileSize: metrics.fileSize
        }
      });
    } else {
      console.log('❌ [INBOUND] Processing failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Processing failed' }, 
        { status: 500 }
      );
    }
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    console.error('❌ [INBOUND] Webhook processing error:', error);
    
    // Enhanced error handling with guaranteed user notification and Sentry reporting
    let userEmail: string | undefined;
    try {
      const formData = await request.formData();
      const payload = parseMailgunWebhook(formData);
      userEmail = payload.sender;
    } catch (parseError) {
      console.error('❌ [INBOUND] Could not parse form data for error handling:', parseError);
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
 * @returns Processing result
 */
async function processVoiceNote(
  audioFile: AudioFile, 
  context: ProcessingContext,
  metricsTracker: any
): Promise<{ success: boolean; error?: string; errorType?: TimeoutErrorType }> {
  
  const errorContext = createErrorContext(context, {
    filename: audioFile.filename,
    fileSize: audioFile.size,
    contentType: audioFile.contentType
  });
  
  try {
    metricsTracker.startPhase('validation');
    console.log('🔍 [PROCESS] Starting validation phase');
    
    // Validate audio file
    const validation = validateAudioFile(audioFile);
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
        audioFile.filename,
        audioFile.size
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
    console.log('⬇️ [PROCESS] Starting download phase');
    
    // Download audio file with enhanced timeout handling
    const arrayBuffer = await withTimeoutAndErrorHandling(
      () => downloadAudioFile(audioFile.url, context.abortController.signal),
      30000, // 30 second timeout
      { ...errorContext, phase: 'download' },
      'Audio Download'
    );
    
    console.log('⬇️ [PROCESS] Downloaded audio file:', {
      originalSize: audioFile.size,
      downloadedSize: arrayBuffer.byteLength,
      sizeMatch: audioFile.size === arrayBuffer.byteLength
    });
    
    // Create File object for Whisper API
    const file = createAudioFile(arrayBuffer, audioFile.filename, audioFile.contentType);
    console.log('📁 [PROCESS] Created File object for Whisper API');
    
    metricsTracker.startPhase('transcription');
    console.log('🎤 [PROCESS] Starting transcription phase');
    
    // Transcribe with Whisper API using enhanced error handling
    const transcriptionResult = await withTimeoutAndErrorHandling(
      () => fastTranscribeAudio(file, 40000),
      45000, // 45 second timeout (slightly longer than the internal timeout)
      { ...errorContext, phase: 'transcription' },
      'Audio Transcription'
    );
    
    console.log('🎤 [PROCESS] Transcription completed:', {
      duration: transcriptionResult.duration,
      textLength: transcriptionResult.text?.length || 0,
      hasText: !!transcriptionResult.text
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
        audioFile.filename
      );
    }
    
    metricsTracker.startPhase('database');
    console.log('💾 [PROCESS] Starting database phase');
    
    // Log voice event to database
    await insertVoiceEvent({
      user_id: context.userId,
      duration_sec: transcriptionResult.duration,
      bytes: arrayBuffer.byteLength
    });
    console.log('💾 [PROCESS] Voice event logged to database');
    
    metricsTracker.startPhase('email');
    console.log('📧 [PROCESS] Starting email phase');
    
    // Send success email with transcript
    const emailSent = await sendSuccessEmail(
      context.userEmail,
      cleanedTranscript,
      audioFile.filename,
      context.abortController.signal
    );
    
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
    
    return { success: true };
    
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
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
} 