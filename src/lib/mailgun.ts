// @ts-ignore
import Mailgun from 'mailgun.js';
import formData from 'form-data';
import { createHmac } from 'crypto';
import { getMailgunConfig } from '@/utils/env';
import { markdownToHtml, containsMarkdown } from '@/lib/markdown';
import { 
  MailgunWebhookPayload, 
  MailgunAttachment, 
  EmailTemplate, 
  TimeoutErrorType 
} from '@/types';

// Initialize Mailgun client following official documentation
let mailgunClient: any = null;

function getMailgunClient() {
  if (!mailgunClient) {
    const config = getMailgunConfig();
    
    // Validate required configuration
    if (!config.apiKey) {
      throw new Error('MAILGUN_API_KEY is not configured');
    }
    
    // Official pattern: new Mailgun(formData) then client()
    const mailgun = new Mailgun(formData);
    mailgunClient = mailgun.client({
      username: 'api',
      key: config.apiKey,
      url: 'https://api.mailgun.net' // Use US servers (default)
    });
    
    console.log('📧 [MAILGUN] Client initialized with domain:', config.domain);
  }
  return mailgunClient;
}

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

  adminNotification: (userEmail: string, userSlug: string, userName?: string): EmailTemplate => ({
    subject: `New User Signup: ${userEmail}`,
    text: `A new user has signed up for the Voice Note Transcription Service.\n\nEmail: ${userEmail}\nSlug: ${userSlug}\nName: ${userName || 'Not provided'}\n\nPlease review and approve this user in the admin dashboard.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">New User Signup</h2>
        <p>A new user has signed up for the Voice Note Transcription Service.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3498db;">
          <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${userEmail}</p>
          <p style="margin: 0 0 10px 0;"><strong>Slug:</strong> ${userSlug}</p>
          <p style="margin: 0;"><strong>Name:</strong> ${userName || 'Not provided'}</p>
        </div>
        
        <p>Please review and approve this user in the admin dashboard.</p>
        
        <div style="margin: 20px 0;">
          <a href="${process.env.NEXTAUTH_URL}/admin" 
             style="background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Go to Admin Dashboard
          </a>
        </div>
        
        <p style="color: #666; font-size: 12px;">
          Voice Note Transcription Service - Admin Notification
        </p>
      </div>
    `
  }),

  userApprovalStatus: (userEmail: string, isApproved: boolean): EmailTemplate => ({
    subject: `Account ${isApproved ? 'Approved' : 'Access Revoked'}: Voice Note Transcription Service`,
    text: `Your account has been ${isApproved ? 'approved' : 'revoked'} for the Voice Note Transcription Service.\n\nEmail: ${userEmail}\nStatus: ${isApproved ? 'Approved' : 'Access Revoked'}\n\n${isApproved ? 'You can now send voice notes to your personal email address. Visit your dashboard to get started.' : 'If you believe this was an error, please contact support.'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isApproved ? '#27ae60' : '#e74c3c'};">Account ${isApproved ? 'Approved' : 'Access Revoked'}</h2>
        <p>Your account has been ${isApproved ? 'approved' : 'revoked'} for the Voice Note Transcription Service.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${isApproved ? '#27ae60' : '#e74c3c'};">
          <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${userEmail}</p>
          <p style="margin: 0;"><strong>Status:</strong> ${isApproved ? 'Approved' : 'Access Revoked'}</p>
        </div>
        
        ${isApproved ? `
          <p>You can now send voice notes to your personal email address. Visit your dashboard to get started.</p>
          <div style="margin: 20px 0;">
            <a href="${process.env.NEXTAUTH_URL}/dashboard" 
               style="background: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
        ` : `
          <p>If you believe this was an error, please contact support.</p>
        `}
        
        <p style="color: #666; font-size: 12px;">
          Voice Note Transcription Service
        </p>
      </div>
    `
  }),

  enhanced: (data: {
    originalTranscript: string;
    enhancedContent: string;
    processingType: 'cleanup' | 'summary' | 'quickSummary';
    filename: string;
  }): EmailTemplate => {
    const getProcessingLabel = (type: string): string => {
      switch (type) {
        case 'cleanup': return 'Cleaned';
        case 'summary': return 'Summary';
        case 'quickSummary': return 'Quick Summary';
        default: return 'Enhanced';
      }
    };

    const getProcessingDescription = (type: string): string => {
      switch (type) {
        case 'cleanup': return 'Grammar & formatting cleanup';
        case 'summary': return 'Key points summary';
        case 'quickSummary': return 'Quick summary';
        default: return 'Enhanced transcript';
      }
    };

    const getProcessingColor = (type: string): string => {
      switch (type) {
        case 'cleanup': return '#3498db';
        case 'summary': return '#27ae60';
        case 'quickSummary': return '#f39c12';
        default: return '#9b59b6';
      }
    };

    const enhancedFilename = `[${getProcessingLabel(data.processingType)}] ${data.filename}`;
    const processingColor = getProcessingColor(data.processingType);
    const processingLabel = getProcessingLabel(data.processingType);
    const processingDescription = getProcessingDescription(data.processingType);

    // Convert markdown to HTML if the content contains markdown
    const enhancedContentHtml = containsMarkdown(data.enhancedContent) 
      ? markdownToHtml(data.enhancedContent)
      : data.enhancedContent.replace(/\n/g, '<br>');

    return {
      subject: `${processingLabel}: ${data.filename}`,
      text: `Voice Note: ${data.filename}\nProcessing: ${processingLabel}\n\n${processingLabel}:\n${data.enhancedContent}\n\n---\n\n📋 Enhancement Details:\n• Processing Type: ${processingDescription}\n• Original Length: ${data.originalTranscript.length} characters\n• Enhanced Length: ${data.enhancedContent.length} characters\n• Processed: ${new Date().toLocaleString()}\n\n🎤 Original Transcript:\n${data.originalTranscript}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, ${processingColor}, ${processingColor}dd); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">${processingLabel}</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">${processingDescription}</p>
          </div>
          
          <div style="background: white; padding: 20px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px;">
            <div style="margin-bottom: 20px;">
              <h3 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 18px;">Voice Note</h3>
              <p style="color: #666; margin: 0; font-size: 14px;"><strong>${data.filename}</strong></p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${processingColor};">
              <div style="color: #2c3e50; line-height: 1.6; font-size: 15px;">
                ${enhancedContentHtml}
              </div>
            </div>
            
            <div style="background: #f1f3f4; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h4 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 14px;">📋 Enhancement Details</h4>
              <div style="font-size: 13px; color: #666; line-height: 1.5;">
                <p style="margin: 5px 0;"><strong>Processing Type:</strong> ${processingDescription}</p>
                <p style="margin: 5px 0;"><strong>Original Length:</strong> ${data.originalTranscript.length} characters</p>
                <p style="margin: 5px 0;"><strong>Enhanced Length:</strong> ${data.enhancedContent.length} characters</p>
                <p style="margin: 5px 0;"><strong>Processed:</strong> ${new Date().toLocaleString()}</p>
              </div>
            </div>
            
            <div style="border-top: 1px solid #e1e5e9; padding-top: 20px; margin-top: 20px;">
              <h4 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 16px;">🎤 Original Transcript</h4>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; border: 1px solid #e1e5e9;">
                <p style="margin: 0; line-height: 1.6; color: #555; font-size: 14px; white-space: pre-wrap;">${data.originalTranscript}</p>
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              Voice Note Transcription Service
            </p>
          </div>
        </div>
      `
    };
  },

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
 * Verify Mailgun webhook signature using manual verification
 * Based on official Mailgun webhook security documentation
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
    
    // Validate required configuration
    if (!config.webhookKey) {
      console.error('🔐 [MAILGUN] Webhook key not configured, cannot verify signature');
      return false;
    }
    
    console.log('🔐 [MAILGUN] Signature verification details:', {
      timestamp: timestamp,
      timestampDate: new Date(parseInt(timestamp) * 1000),
      token: token?.substring(0, 10) + '...',
      signature: signature?.substring(0, 10) + '...',
      webhookKey: 'Present'
    });

    // Manual verification using the webhook signing key
    // This is the official Mailgun pattern for webhook verification
    const data = timestamp + token;
    const hash = createHmac('sha256', config.webhookKey)
      .update(data)
      .digest('hex');
    
    const isValid = hash === signature;
    
    console.log('🔐 [MAILGUN] Manual verification result:', {
      calculatedHash: hash.substring(0, 10) + '...',
      receivedSignature: signature?.substring(0, 10) + '...',
      dataToSign: `${timestamp}${token?.substring(0, 5)}...`,
      usingWebhookKey: true,
      isValid
    });
    
    return isValid;
  } catch (error) {
    console.error('🔐 [MAILGUN] Signature verification failed:', error);
    return false;
  }
}

/**
 * Parse Mailgun webhook payload with enhanced logging
 * @param formData - Form data from webhook
 * @returns MailgunWebhookPayload - Parsed payload
 */
export function parseMailgunWebhook(formData: FormData): MailgunWebhookPayload {
  console.log('📋 [MAILGUN] Raw form data keys:', Array.from(formData.keys()));
  console.log('📋 [MAILGUN] Form data entries:', {
    sender: formData.get('sender'),
    recipient: formData.get('recipient'),
    subject: formData.get('subject'),
    timestamp: formData.get('timestamp'),
    signature: formData.get('signature')?.toString().substring(0, 10) + '...',
    token: formData.get('token')?.toString().substring(0, 10) + '...',
    attachmentCount: formData.get('attachment-count')
  });

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
 * Extract user slug from recipient email with enhanced logging
 * @param recipient - Email recipient (e.g., "abc123@yourdomain.com")
 * @returns string - User slug or empty string
 */
export function extractUserSlug(recipient: string): string {
  try {
    console.log('🔍 [MAILGUN] Extracting slug from recipient:', recipient);
    const match = recipient.match(/^([a-zA-Z0-9]{6})@/);
    const slug = match ? match[1] : '';
    
    console.log('🔍 [MAILGUN] Slug extraction result:', {
      recipient,
      extractedSlug: slug,
      slugLength: slug?.length,
      isValidSlug: slug && slug.length === 6,
      regexMatch: !!match
    });
    
    return slug;
  } catch (error) {
    console.error('🔍 [MAILGUN] Failed to extract user slug:', error);
    return '';
  }
}

/**
 * Get audio attachments from Mailgun webhook with enhanced logging
 * @param formData - Form data from webhook
 * @returns MailgunAttachment[] - Array of audio attachments
 */
export function getAudioAttachments(formData: FormData): MailgunAttachment[] {
  const attachments: MailgunAttachment[] = [];
  const attachmentCount = parseInt(formData.get('attachment-count') as string || '0');
  
  console.log('🎵 [MAILGUN] Processing attachments:', {
    totalAttachments: attachmentCount,
    formDataKeys: Array.from(formData.keys()).filter(key => key.startsWith('attachment-'))
  });
  
  for (let i = 1; i <= attachmentCount; i++) {
    const filename = formData.get(`attachment-${i}`) as string;
    const contentType = formData.get(`attachment-${i}-content-type`) as string;
    
    console.log(`🎵 [MAILGUN] Attachment ${i}:`, {
      filename,
      contentType,
      isAudio: filename && contentType ? isAudioFile(filename, contentType) : false
    });
    
    if (filename && contentType && isAudioFile(filename, contentType)) {
      // In Mailgun, attachments are accessible via signed URLs
      const url = formData.get(`attachment-${i}-url`) as string;
      const size = parseInt(formData.get(`attachment-${i}-size`) as string || '0');
      
      console.log(`✅ [MAILGUN] Audio attachment found:`, {
        filename,
        contentType,
        size,
        url: url ? 'Present' : 'Missing'
      });
      
      attachments.push({
        filename,
        'content-type': contentType,
        size,
        url,
      });
    }
  }
  
  console.log('🎵 [MAILGUN] Audio attachments processed:', {
    totalFound: attachments.length,
    filenames: attachments.map(a => a.filename)
  });
  
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
 * Send email via Mailgun SDK following official documentation patterns
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
    const mg = getMailgunClient();
    
    console.log('📧 [MAILGUN] Sending email via official SDK:', {
      to,
      subject: template.subject,
      from: `Voice Transcription <${config.email}>`,
      domain: config.domain
    });
    
    // Official SDK pattern: mg.messages.create(domain, messageData)
    const messageData = {
      from: `Voice Transcription <${config.email}>`,
      to: [to], // Official pattern uses array for 'to' field
      subject: template.subject,
      text: template.text,
      html: template.html
    };
    
    // Use the official SDK pattern
    const result = await mg.messages.create(config.domain, messageData);
    
    console.log('✅ [MAILGUN] Email sent successfully via SDK:', {
      messageId: result.id,
      message: result.message,
      to,
      status: result.status || 'queued'
    });
    
    return true;
  } catch (error) {
    console.error('❌ [MAILGUN] Failed to send email via SDK:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      to,
      subject: template.subject
    });
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

/**
 * Send admin notification about new user signup
 * @param userEmail - New user's email
 * @param userSlug - New user's slug
 * @param userName - New user's name (optional)
 * @param abortSignal - Abort signal for timeout
 * @returns Promise<boolean> - Success status
 */
export async function sendAdminNotification(
  userEmail: string,
  userSlug: string,
  userName?: string,
  abortSignal?: AbortSignal
): Promise<boolean> {
  try {
    const { getAdminEmails } = await import('@/utils/env');
    const adminEmails = getAdminEmails();
    
    if (adminEmails.length === 0) {
      console.warn('⚠️ [ADMIN_NOTIFICATION] No admin emails configured');
      return false;
    }
    
    console.log('📧 [ADMIN_NOTIFICATION] Sending notifications to admins:', {
      adminEmails,
      newUser: { email: userEmail, slug: userSlug, name: userName }
    });
    
    const template = EMAIL_TEMPLATES.adminNotification(userEmail, userSlug, userName);
    
    // Send to all admin emails
    const sendPromises = adminEmails.map(adminEmail => 
      sendEmail(adminEmail, template, abortSignal)
    );
    
    const results = await Promise.allSettled(sendPromises);
    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value === true
    ).length;
    
    console.log('📧 [ADMIN_NOTIFICATION] Notification results:', {
      totalAdmins: adminEmails.length,
      successCount,
      failedCount: adminEmails.length - successCount
    });
    
    return successCount > 0; // Return true if at least one email was sent successfully
  } catch (error) {
    console.error('❌ [ADMIN_NOTIFICATION] Failed to send admin notifications:', error);
    return false;
  }
}

/**
 * Send user notification about approval status change
 * @param userEmail - User's email
 * @param isApproved - Whether user was approved or revoked
 * @param abortSignal - Abort signal for timeout
 * @returns Promise<boolean> - Success status
 */
export async function sendUserApprovalNotification(
  userEmail: string,
  isApproved: boolean,
  abortSignal?: AbortSignal
): Promise<boolean> {
  try {
    console.log('📧 [USER_APPROVAL] Sending approval notification:', {
      userEmail,
      isApproved
    });
    
    const template = EMAIL_TEMPLATES.userApprovalStatus(userEmail, isApproved);
    const result = await sendEmail(userEmail, template, abortSignal);
    
    console.log('📧 [USER_APPROVAL] Notification result:', result);
    return result;
  } catch (error) {
    console.error('❌ [USER_APPROVAL] Failed to send approval notification:', error);
    return false;
  }
}

/**
 * Send enhanced email with processed content
 * @param to - Recipient email
 * @param data - Enhanced email data
 * @param abortSignal - Abort signal for timeout
 * @returns Promise<boolean> - Success status
 */
export async function sendEnhancedEmail(
  to: string,
  data: {
    originalTranscript: string;
    enhancedContent: string;
    processingType: 'cleanup' | 'summary' | 'quickSummary';
    filename: string;
  },
  abortSignal?: AbortSignal
): Promise<boolean> {
  try {
    console.log('📧 [ENHANCED_EMAIL] Sending enhanced email:', {
      to,
      processingType: data.processingType,
      filename: data.filename,
      originalLength: data.originalTranscript.length,
      enhancedLength: data.enhancedContent.length
    });
    
    const template = EMAIL_TEMPLATES.enhanced(data);
    const result = await sendEmail(to, template, abortSignal);
    
    console.log('📧 [ENHANCED_EMAIL] Enhanced email result:', result);
    return result;
  } catch (error) {
    console.error('❌ [ENHANCED_EMAIL] Failed to send enhanced email:', error);
    return false;
  }
} 