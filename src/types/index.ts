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
  NEXTAUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  D1_URL: string;
  D1_DATABASE_ID: string;
  D1_API_KEY: string;
  ADMIN_EMAILS: string;
  VERCEL_URL?: string;
  VERCEL_ENV?: string;
  // Phase 2 additions
  MAILGUN_DOMAIN: string;
  MAILGUN_API_KEY: string;
  MAILGUN_EMAIL: string;
  OPENAI_API_KEY: string;
  MAX_FILE_SIZE_MB?: string;
  DOWNLOAD_TIMEOUT_SEC?: string;
  PROCESSING_TIMEOUT_SEC?: string;
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