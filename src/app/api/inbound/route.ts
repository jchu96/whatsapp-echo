// @ts-ignore
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from "@sentry/nextjs";
import formidable from 'formidable';
import fs from 'fs';
import { 
  verifyMailgunSignature, 
  extractUserSlug, 
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

// Note: In App Router, body parsing is handled differently - no config needed

/**
 * Parse Mailgun webhook payload from formidable fields
 */
function parseMailgunWebhookFromFields(fields: any) {
  const getField = (name: string) => {
    const field = fields[name];
    return Array.isArray(field) ? field[0] : field;
  };

  return {
    recipient: getField('recipient') as string,
    sender: getField('sender') as string,
    subject: getField('subject') as string,
    'body-plain': getField('body-plain') as string,
    'body-html': getField('body-html') as string,
    'message-headers': getField('message-headers') as string,
    'attachment-count': getField('attachment-count') as string,
    timestamp: getField('timestamp') as string,
    signature: getField('signature') as string,
    token: getField('token') as string,
  };
}

/**
 * Extract audio attachments from formidable files and read into memory
 */
function getAudioAttachmentsFromFiles(files: any): (AudioFile & { buffer: Buffer })[] {
  const attachments: (AudioFile & { buffer: Buffer })[] = [];
  
  console.log('🎵 [FORMIDABLE] Processing files:', {
    fileKeys: Object.keys(files),
    totalFiles: Object.keys(files).length
  });
  
  // Get all attachment files
  const attachmentEntries = Object.entries(files)
    .filter(([key]) => key.startsWith('attachment-'));
    
  console.log('🎵 [FORMIDABLE] Found attachment entries:', attachmentEntries.length);
  
  attachmentEntries.forEach(([key, fileData]: [string, any]) => {
    // formidable can return single file or array
    const file = Array.isArray(fileData) ? fileData[0] : fileData;
    
    console.log(`🎵 [FORMIDABLE] Processing ${key}:`, {
      originalFilename: file.originalFilename,
      mimetype: file.mimetype,
      size: file.size,
      filepath: file.filepath
    });
    
    if (file.originalFilename && file.mimetype && isAudioFile(file.originalFilename, file.mimetype)) {
      console.log(`✅ [FORMIDABLE] Audio file detected: ${file.originalFilename}`);
      
      try {
        // Read file data immediately into memory
        const buffer = fs.readFileSync(file.filepath);
        
        // Clean up the temporary file immediately
        fs.unlinkSync(file.filepath);
        
        console.log(`📦 [FORMIDABLE] File loaded into memory: ${file.originalFilename} (${buffer.length} bytes)`);
        
        attachments.push({
          filename: file.originalFilename,
          size: file.size,
          contentType: file.mimetype,
          url: '', // We have the file directly, no URL needed
          buffer: buffer // Store file data in memory
        });
      } catch (error) {
        console.error(`❌ [FORMIDABLE] Failed to read file ${file.originalFilename}:`, error);
      }
    } else {
      console.log(`❌ [FORMIDABLE] Non-audio file skipped: ${file.originalFilename}`);
      // Clean up non-audio files too
      try {
        fs.unlinkSync(file.filepath);
      } catch (error) {
        console.warn(`⚠️ [FORMIDABLE] Failed to cleanup non-audio file: ${error}`);
      }
    }
  });
  
  console.log('🎵 [FORMIDABLE] Audio attachments loaded into memory:', attachments.length);
  return attachments;
}

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
  
  // Declare payload at function scope so it's available in catch block
  let payload: any;
  
  try {
    metricsTracker.startPhase('webhook_parsing');
    console.log('📋 [INBOUND] Starting webhook parsing phase');
    
    // Parse the multipart form data from Mailgun using formidable
    const form = formidable({ 
      multiples: true, 
      maxFileSize: 100 * 1024 * 1024, // 100MB limit
      keepExtensions: true
    });
    
    // Create a promise-based wrapper for formidable
    const parseFormData = (): Promise<[any, any]> => {
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        
        // Read the request body
        const reader = request.body?.getReader();
        if (!reader) {
          reject(new Error('No request body'));
          return;
        }
        
        const pump = async () => {
          try {
            const { done, value } = await reader.read();
            if (done) {
              // Convert chunks to buffer and parse
              const buffer = Buffer.concat(chunks);
              const contentType = request.headers.get('content-type') || '';
              
              // Create a mock request object for formidable
              const mockReq = {
                body: buffer,
                headers: {
                  'content-type': contentType,
                  'content-length': buffer.length.toString()
                },
                method: 'POST',
                url: '/'
              };
              
              // Parse with formidable
              form.parse(mockReq as any, (err, fields, files) => {
                if (err) {
                  reject(err);
                } else {
                  resolve([fields, files]);
                }
              });
            } else {
              chunks.push(Buffer.from(value));
              pump();
            }
          } catch (error) {
            reject(error);
          }
        };
        
        pump();
      });
    };
    
    const [fields, files] = await parseFormData();
    
    console.log('📋 [FORMIDABLE] Parsed form data:', {
      fieldKeys: Object.keys(fields),
      fileKeys: Object.keys(files),
      totalFields: Object.keys(fields).length,
      totalFiles: Object.keys(files).length
    });
    
    payload = parseMailgunWebhookFromFields(fields);
    
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
    
    // Get audio attachments from formidable files
    console.log('🎵 [INBOUND] Looking for audio attachments...');
    
    const audioAttachments = getAudioAttachmentsFromFiles(files);
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
          totalAttachments: payload['attachment-count'] 
        }
      }, controller.signal);
      
      return NextResponse.json({ error: 'No audio attachments found' }, { status: 400 });
    }
    
    // Process the first audio attachment
    const attachment = audioAttachments[0];
    const audioFile: AudioFile = {
      filename: attachment.filename,
      size: attachment.size,
      contentType: attachment.contentType,
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
    const result = await processVoiceNote(audioFile, attachment.buffer, context, metricsTracker);
    
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
    console.error('❌ [INBOUND] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Enhanced error handling with guaranteed user notification and Sentry reporting
    let userEmail: string | undefined;
    try {
      // Try to get user email from already parsed payload if available
      if (typeof payload !== 'undefined' && payload.sender) {
        userEmail = payload.sender;
        console.log('📧 [INBOUND] Using sender from parsed payload:', userEmail);
      } else {
        console.log('📧 [INBOUND] No parsed payload available, user email unknown');
      }
    } catch (parseError) {
      console.error('❌ [INBOUND] Could not get user email for error handling:', parseError);
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
  audioBuffer: Buffer,
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
    console.log('📦 [PROCESS] Using audio buffer from memory');
    
    // Convert Buffer to ArrayBuffer for Whisper API
    const arrayBuffer = audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength);
    
    console.log('📦 [PROCESS] Audio buffer prepared:', {
      originalSize: audioFile.size,
      bufferSize: arrayBuffer.byteLength,
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