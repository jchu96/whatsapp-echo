// @ts-ignore
import { NextRequest, NextResponse } from 'next/server';
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
  
  // Create abort controller with safety margin
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, config.processingTimeoutSec * 1000);
  
  const metricsTracker = createMetricsTracker(startTime);
  
  try {
    metricsTracker.startPhase('webhook_parsing');
    
    // Parse the form data from Mailgun
    const formData = await request.formData();
    const payload = parseMailgunWebhook(formData);
    
    // Verify Mailgun signature for security
    if (!verifyMailgunSignature(payload.timestamp, payload.token, payload.signature)) {
      console.error('Invalid Mailgun signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    // Extract user slug from recipient email
    const slug = extractUserSlug(payload.recipient);
    if (!slug) {
      console.error('No valid slug found in recipient:', payload.recipient);
      return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 });
    }
    
    metricsTracker.startPhase('user_lookup');
    
    // Look up user and verify approval
    const userResult = await getUserBySlug(slug);
    if (!userResult.success || !userResult.data) {
      console.error('User not found for slug:', slug);
      // Don't send error email for unknown users (security)
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const user = userResult.data;
    if (!user.approved) {
      console.error('User not approved:', user.google_email);
      // Send error email for unapproved users
      await sendErrorEmail(payload.sender, 'user_not_approved', undefined, controller.signal);
      return NextResponse.json({ error: 'User not approved' }, { status: 403 });
    }
    
    // Get audio attachments
    const audioAttachments = getAudioAttachments(formData);
    if (audioAttachments.length === 0) {
      console.error('No audio attachments found');
      await sendErrorEmail(payload.sender, 'invalid_format', 'No audio file', controller.signal);
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
    
    // Create processing context
    const context: ProcessingContext = {
      userId: user.id,
      userEmail: user.google_email,
      slug: user.slug,
      startTime,
      abortController: controller,
      timeoutId
    };
    
    // Process the audio file
    const result = await processVoiceNote(audioFile, context, metricsTracker);
    
    clearTimeout(timeoutId);
    
    // Log metrics
    const metrics = metricsTracker.getMetrics(audioFile.size, result.success, result.errorType);
    logProcessingMetrics(metrics, result.success);
    
    if (result.success) {
      return NextResponse.json({ 
        message: 'Voice note processed successfully',
        metrics: {
          totalTime: metrics.totalTime,
          fileSize: metrics.fileSize
        }
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Processing failed' }, 
        { status: 500 }
      );
    }
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    console.error('Webhook processing error:', error);
    
    const errorType = categorizeError(error);
    const metrics = metricsTracker.getMetrics(0, false, errorType);
    logProcessingMetrics(metrics, false);
    
    // Try to send error email if we have enough context
    try {
      const formData = await request.formData();
      const payload = parseMailgunWebhook(formData);
      await sendErrorEmail(payload.sender, errorType, 'unknown', controller.signal);
    } catch (emailError) {
      console.error('Failed to send error email:', emailError);
    }
    
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
  
  try {
    metricsTracker.startPhase('validation');
    
    // Validate audio file
    const validation = validateAudioFile(audioFile);
    if (!validation.isValid) {
      await sendErrorEmail(
        context.userEmail, 
        validation.errorType!, 
        audioFile.filename, 
        context.abortController.signal
      );
      return { 
        success: false, 
        error: validation.errorMessage, 
        errorType: validation.errorType 
      };
    }
    
    metricsTracker.startPhase('download');
    
    // Download audio file with timeout
    const arrayBuffer = await downloadAudioFile(audioFile.url, context.abortController.signal);
    
    // Create File object for Whisper API
    const file = createAudioFile(arrayBuffer, audioFile.filename, audioFile.contentType);
    
    metricsTracker.startPhase('transcription');
    
    // Transcribe with Whisper API
    const transcriptionResult = await fastTranscribeAudio(file, 40000); // 40 second timeout
    const cleanedTranscript = cleanTranscription(transcriptionResult.text);
    
    if (!cleanedTranscript) {
      throw new AudioProcessingError(
        'Empty transcription result',
        'general_error',
        audioFile.filename
      );
    }
    
    metricsTracker.startPhase('database');
    
    // Log voice event to database
    await insertVoiceEvent({
      user_id: context.userId,
      duration_sec: transcriptionResult.duration,
      bytes: arrayBuffer.byteLength
    });
    
    metricsTracker.startPhase('email');
    
    // Send success email with transcript
    const emailSent = await sendSuccessEmail(
      context.userEmail,
      cleanedTranscript,
      audioFile.filename,
      context.abortController.signal
    );
    
    if (!emailSent) {
      console.error('Failed to send success email');
      // Don't fail the entire process for email issues
    }
    
    metricsTracker.endPhase();
    
    return { success: true };
    
  } catch (error) {
    console.error('Voice note processing error:', error);
    
    let errorType: TimeoutErrorType = 'general_error';
    let errorMessage = 'Unknown processing error';
    
    if (error instanceof AudioProcessingError || error instanceof ProcessingTimeoutError) {
      errorType = error.errorType;
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorType = categorizeWhisperError(error);
      errorMessage = error.message;
    }
    
    // Send error email to user
    try {
      await sendErrorEmail(
        context.userEmail,
        errorType,
        audioFile.filename,
        context.abortController.signal
      );
    } catch (emailError) {
      console.error('Failed to send error email:', emailError);
    }
    
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