// Database table types
export interface User {
  id: string;
  google_email: string;
  slug: string;
  approved: number; // 0 = pending, 1 = approved
  created_at: string;
}

export interface VoiceEvent {
  id: string;
  user_id: string;
  received_at: string;
  duration_sec: number | null;
  bytes: number | null;
  status: 'processing' | 'completed' | 'failed';
  processing_type: 'raw' | 'cleanup' | 'summary' | null;
  completed_at: string | null;
  error_message: string | null;
  enhancements_requested: string | null; // JSON array of enhancement types
}

export interface UserPreferences {
  user_id: string;
  // Legacy field (kept for backward compatibility)
  transcript_processing?: 'raw' | 'cleanup' | 'summary';
  // New boolean enhancement flags
  send_cleaned_transcript: number; // 0 = false, 1 = true (SQLite boolean)
  send_summary: number; // 0 = false, 1 = true (SQLite boolean)
  created_at: string;
  updated_at: string;
}

// API response types
export interface DbResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

// Session types (extends NextAuth Session)
export interface AppSession {
  user: {
    id: string;
    email: string;
    slug: string;
    approved: boolean;
    isAdmin: boolean;
    name?: string;
    image?: string;
  };
  expires: string;
}

// Database operation types
export interface CreateUserData {
  google_email: string;
  slug: string;
  approved?: boolean;
}

export interface CreateVoiceEventData {
  user_id: string;
  duration_sec?: number;
  bytes?: number;
  status?: 'processing' | 'completed' | 'failed';
  processing_type?: 'raw' | 'cleanup' | 'summary';
  enhancements_requested?: string; // JSON array of enhancement types
}

// Utility types
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

// Admin panel types
export interface UserWithStats extends User {
  voice_events_count: number;
  last_activity: string | null;
}

// Environment variables type
export interface EnvConfig {
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string | undefined;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  D1_URL: string | undefined;
  D1_DATABASE_ID: string | undefined;
  D1_API_KEY: string | undefined;
  ADMIN_EMAILS: string | undefined;
  VERCEL_URL?: string;
  VERCEL_ENV?: string;
  // Phase 2 additions
  MAILGUN_DOMAIN: string | undefined;
  MAILGUN_API_KEY: string | undefined;
  MAILGUN_EMAIL: string | undefined;
  OPENAI_API_KEY: string | undefined;
  AIMLAPI_KEY?: string;
  MAX_FILE_SIZE_MB?: string;
  DOWNLOAD_TIMEOUT_SEC?: string;
  PROCESSING_TIMEOUT_SEC?: string;
  // Company information
  PRIVACY_EMAIL?: string;
  EMAIL_SITE_CONTACT?: string;
  COMPANY_NAME?: string;
  COMPANY_ADDRESS?: string;
  COMPANY_CITY?: string;
  COMPANY_STATE?: string;
  COMPANY_ZIP?: string;
  COMPANY_FULL_ADDRESS?: string;
  // reCAPTCHA configuration
  RECAPTCHA_SITE_KEY?: string;
  RECAPTCHA_SECRET_KEY?: string;
}

// Database query result types
export interface D1QueryResult<T = any> {
  success: boolean;
  results?: T[];
  error?: string;
  meta?: {
    changes?: number;
    last_row_id?: number;
    duration?: number;
  };
}

// Phase 2: Audio processing types
export interface AudioProcessingConfig {
  maxFileSizeMB: number;
  downloadTimeoutSec: number;
  processingTimeoutSec: number;
  supportedFormats: string[];
}

export interface AudioFile {
  filename: string;
  size: number;
  contentType: string;
  url: string;
}

export interface ProcessingResult {
  success: boolean;
  transcript?: string;
  error?: string;
  duration?: number;
  fileSize?: number;
  processingTime?: number;
}

// Mailgun webhook types
export interface MailgunWebhookPayload {
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

export interface MailgunAttachment {
  filename: string;
  'content-type': string;
  size: number;
  url: string;
}

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

// OpenAI Whisper types
export interface WhisperTranscription {
  text: string;
  language?: string;
  duration?: number;
}

export interface WhisperError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

// Processing pipeline types
export interface ProcessingContext {
  userId: string;
  userEmail: string;
  slug: string;
  startTime: number;
  abortController: AbortController;
  timeoutId: any; // Timer ID from setTimeout
}

// Background processing types
export interface BackgroundProcessingMetadata {
  userId: string;
  userEmail: string;
  eventId: string;
  enhancementTypes: EnhancementType[]; // Array of enhancement types to process
  filename: string;
  duration?: number;
  fileSize?: number;
  transcript?: string; // Optional transcript text for enhancement processing
}

export interface EnhancedEmailData {
  originalTranscript: string;
  enhancedContent: string;
  processingType: EnhancementType;
  filename: string;
}

// Helper types for the new system
export type EnhancementType = 'cleanup' | 'summary' | 'quickSummary';

export interface UserEnhancementPreferences {
  sendCleanedTranscript: boolean;
  sendSummary: boolean;
}

export interface EnhancementProcessingResult {
  type: EnhancementType;
  success: boolean;
  content?: string;
  error?: string;
}

export interface ProcessingMetrics {
  totalTime: number;
  downloadTime: number;
  transcriptionTime: number;
  emailTime: number;
  fileSize: number;
  success: boolean;
  errorType?: string;
}

// Error types for different timeout scenarios
export type TimeoutErrorType = 
  | 'file_too_large'
  | 'download_timeout'
  | 'processing_timeout'
  | 'whisper_timeout'
  | 'invalid_format'
  | 'user_not_approved'
  | 'user_not_found'
  | 'general_error'; 