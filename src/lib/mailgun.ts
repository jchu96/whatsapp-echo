// @ts-ignore
import { createHmac } from 'crypto';

// Declare Buffer for Node.js environment
declare var Buffer: {
  from(data: string): { toString(encoding: string): string };
};
import { getMailgunConfig } from '@/utils/env';
import { 
  MailgunWebhookPayload, 
  MailgunAttachment, 
  EmailTemplate, 
  TimeoutErrorType 
} from '@/types';

// Email templates for different scenarios
const EMAIL_TEMPLATES = {
  success: (transcript: string, filename: string): EmailTemplate => ({
    subject: `Voice Note Transcription: ${filename}`,
    text: `Here's your voice note transcription:\n\n${transcript}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Voice Note Transcription</h2>
        <p><strong>File:</strong> ${filename}</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; line-height: 1.6;">${transcript}</p>
        </div>
        <p style="color: #666; font-size: 12px;">
          Transcribed by Voice Note Transcription Service
        </p>
      </div>
    `
  }),

  error: (errorType: TimeoutErrorType, filename?: string): EmailTemplate => {
    const templates = {
      file_too_large: {
        subject: 'Voice Note Too Large',
        text: `Sorry, your voice note "${filename}" is too large. Please try a file smaller than 15MB.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">File Too Large</h2>
            <p>Sorry, your voice note <strong>"${filename}"</strong> is too large.</p>
            <p>Please try a file smaller than <strong>15MB</strong>.</p>
            <p style="color: #666; font-size: 12px;">
              Voice Note Transcription Service
            </p>
          </div>
        `
      },
      
      download_timeout: {
        subject: 'Voice Note Download Timeout',
        text: `Sorry, we couldn't download your voice note "${filename}" in time. Please try a shorter recording.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">Download Timeout</h2>
            <p>Sorry, we couldn't download your voice note <strong>"${filename}"</strong> in time.</p>
            <p>Please try a shorter recording or check your internet connection.</p>
            <p style="color: #666; font-size: 12px;">
              Voice Note Transcription Service
            </p>
          </div>
        `
      },
      
      processing_timeout: {
        subject: 'Voice Note Processing Timeout',
        text: `Sorry, processing your voice note "${filename}" took too long. Please try a shorter recording.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">Processing Timeout</h2>
            <p>Sorry, processing your voice note <strong>"${filename}"</strong> took too long.</p>
            <p>Please try a shorter recording (under 5 minutes works best).</p>
            <p style="color: #666; font-size: 12px;">
              Voice Note Transcription Service
            </p>
          </div>
        `
      },
      
      invalid_format: {
        subject: 'Unsupported Audio Format',
        text: `Sorry, we don't support the format of "${filename}". Please use .m4a, .mp3, .wav, or .ogg files.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">Unsupported Format</h2>
            <p>Sorry, we don't support the format of <strong>"${filename}"</strong>.</p>
            <p>Please use one of these formats:</p>
            <ul>
              <li>.m4a (recommended)</li>
              <li>.mp3</li>
              <li>.wav</li>
              <li>.ogg</li>
            </ul>
            <p style="color: #666; font-size: 12px;">
              Voice Note Transcription Service
            </p>
          </div>
        `
      },
      
      whisper_timeout: {
        subject: 'Voice Note Transcription Timeout',
        text: `Sorry, transcribing your voice note "${filename}" took too long. Please try a shorter recording.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">Transcription Timeout</h2>
            <p>Sorry, transcribing your voice note <strong>"${filename}"</strong> took too long.</p>
            <p>Please try a shorter recording (under 3 minutes works best).</p>
            <p style="color: #666; font-size: 12px;">
              Voice Note Transcription Service
            </p>
          </div>
        `
      },
      
      user_not_approved: {
        subject: 'Account Not Approved',
        text: 'Your account is not yet approved for voice note transcription.',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">Account Not Approved</h2>
            <p>Your account is not yet approved for voice note transcription.</p>
            <p>Please contact support to request approval.</p>
            <p style="color: #666; font-size: 12px;">
              Voice Note Transcription Service
            </p>
          </div>
        `
      },
      
      user_not_found: {
        subject: 'User Not Found',
        text: 'We could not find your account. Please check the email address.',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">User Not Found</h2>
            <p>We could not find your account. Please check the email address.</p>
            <p>Make sure you're sending to the correct slug@domain.com address.</p>
            <p style="color: #666; font-size: 12px;">
              Voice Note Transcription Service
            </p>
          </div>
        `
      },
      
      general_error: {
        subject: 'Voice Note Processing Error',
        text: `Sorry, we encountered an error processing your voice note "${filename}". Please try again later.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">Processing Error</h2>
            <p>Sorry, we encountered an error processing your voice note <strong>"${filename}"</strong>.</p>
            <p>Please try again later. If the problem persists, contact support.</p>
            <p style="color: #666; font-size: 12px;">
              Voice Note Transcription Service
            </p>
          </div>
        `
      }
    };
    
    return templates[errorType] || templates.general_error;
  }
};

/**
 * Verify Mailgun webhook signature for security
 * @param timestamp - Request timestamp
 * @param token - Request token
 * @param signature - Request signature
 * @returns boolean - True if signature is valid
 */
export function verifyMailgunSignature(
  timestamp: string, 
  token: string, 
  signature: string
): boolean {
  try {
    const config = getMailgunConfig();
    const data = timestamp + token;
    const hash = createHmac('sha256', config.apiKey)
      .update(data)
      .digest('hex');
    
    return hash === signature;
  } catch (error) {
    console.error('Mailgun signature verification failed:', error);
    return false;
  }
}

/**
 * Parse Mailgun webhook payload
 * @param formData - Form data from webhook
 * @returns MailgunWebhookPayload - Parsed payload
 */
export function parseMailgunWebhook(formData: FormData): MailgunWebhookPayload {
  return {
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
}

/**
 * Extract user slug from recipient email
 * @param recipient - Email recipient (e.g., "abc123@yourdomain.com")
 * @returns string - User slug or empty string
 */
export function extractUserSlug(recipient: string): string {
  try {
    const match = recipient.match(/^([a-zA-Z0-9]{6})@/);
    return match ? match[1] : '';
  } catch (error) {
    console.error('Failed to extract user slug:', error);
    return '';
  }
}

/**
 * Get audio attachments from Mailgun webhook
 * @param formData - Form data from webhook
 * @returns MailgunAttachment[] - Array of audio attachments
 */
export function getAudioAttachments(formData: FormData): MailgunAttachment[] {
  const attachments: MailgunAttachment[] = [];
  const attachmentCount = parseInt(formData.get('attachment-count') as string || '0');
  
  for (let i = 1; i <= attachmentCount; i++) {
    const filename = formData.get(`attachment-${i}`) as string;
    const contentType = formData.get(`attachment-${i}-content-type`) as string;
    
    if (filename && contentType && isAudioFile(filename, contentType)) {
      // In Mailgun, attachments are accessible via signed URLs
      const url = formData.get(`attachment-${i}-url`) as string;
      const size = parseInt(formData.get(`attachment-${i}-size`) as string || '0');
      
      attachments.push({
        filename,
        'content-type': contentType,
        size,
        url,
      });
    }
  }
  
  return attachments;
}

/**
 * Check if file is an audio file
 * @param filename - File name
 * @param contentType - MIME type
 * @returns boolean - True if audio file
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
    'audio/flac'
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
 * Send email via Mailgun API with timeout handling
 * @param to - Recipient email
 * @param template - Email template
 * @param abortSignal - Abort signal for timeout
 * @returns Promise<boolean> - Success status
 */
export async function sendEmail(
  to: string, 
  template: EmailTemplate,
  abortSignal?: AbortSignal
): Promise<boolean> {
  try {
    const config = getMailgunConfig();
    
    const formData = new FormData();
    formData.append('from', `Voice Transcription <noreply@${config.domain}>`);
    formData.append('to', to);
    formData.append('subject', template.subject);
    formData.append('text', template.text);
    formData.append('html', template.html);
    
    const response = await fetch(`${config.apiUrl}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${config.apiKey}`).toString('base64')}`,
      },
      body: formData,
      signal: abortSignal,
    });
    
    if (!response.ok) {
      console.error('Mailgun API error:', await response.text());
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send success email with transcript
 * @param to - Recipient email
 * @param transcript - Transcribed text
 * @param filename - Original filename
 * @param abortSignal - Abort signal for timeout
 * @returns Promise<boolean> - Success status
 */
export async function sendSuccessEmail(
  to: string,
  transcript: string,
  filename: string,
  abortSignal?: AbortSignal
): Promise<boolean> {
  const template = EMAIL_TEMPLATES.success(transcript, filename);
  return sendEmail(to, template, abortSignal);
}

/**
 * Send error email for various failure scenarios
 * @param to - Recipient email
 * @param errorType - Type of error
 * @param filename - Original filename
 * @param abortSignal - Abort signal for timeout
 * @returns Promise<boolean> - Success status
 */
export async function sendErrorEmail(
  to: string,
  errorType: TimeoutErrorType,
  filename?: string,
  abortSignal?: AbortSignal
): Promise<boolean> {
  const template = EMAIL_TEMPLATES.error(errorType, filename);
  return sendEmail(to, template, abortSignal);
} 