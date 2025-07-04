import { EnvConfig } from '@/types';

// Ensure Node.js types are available
declare var process: {
  env: Record<string, string | undefined>;
};

/**
 * Validate required environment variables
 * @throws Error if any required environment variable is missing
 */
export function validateEnvConfig(): void {
  const requiredEnvVars = [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'D1_URL',
    'D1_DATABASE_ID',
    'D1_API_KEY',
    'ADMIN_EMAILS',
    // Phase 2 additions
    'MAILGUN_DOMAIN',
    'MAILGUN_API_KEY',
    'OPENAI_API_KEY',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
}

/**
 * Get environment configuration with validation
 * @returns EnvConfig - Validated environment configuration
 */
export function getEnvConfig(): EnvConfig {
  validateEnvConfig();

  return {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
    D1_URL: process.env.D1_URL!,
    D1_DATABASE_ID: process.env.D1_DATABASE_ID!,
    D1_API_KEY: process.env.D1_API_KEY!,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS!,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    // Phase 2 additions
    MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN!,
    MAILGUN_API_KEY: process.env.MAILGUN_API_KEY!,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    MAX_FILE_SIZE_MB: process.env.MAX_FILE_SIZE_MB,
    DOWNLOAD_TIMEOUT_SEC: process.env.DOWNLOAD_TIMEOUT_SEC,
    PROCESSING_TIMEOUT_SEC: process.env.PROCESSING_TIMEOUT_SEC,
  };
}

/**
 * Get admin email addresses as an array
 * @returns string[] - Array of admin email addresses
 */
export function getAdminEmails(): string[] {
  const adminEmails = process.env.ADMIN_EMAILS || '';
  return adminEmails
    .split(',')
    .map(email => email.trim())
    .filter(email => email.length > 0);
}

/**
 * Check if an email is an admin email
 * @param email - Email address to check
 * @returns boolean - True if email is in admin list
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = getAdminEmails();
  return adminEmails.indexOf(email.toLowerCase()) !== -1;
}

/**
 * Get the base URL for the application
 * @returns string - Base URL for the application
 */
export function getBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

/**
 * Check if we're running in production
 * @returns boolean - True if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if we're running in development
 * @returns boolean - True if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if we're running on Vercel
 * @returns boolean - True if running on Vercel
 */
export function isVercel(): boolean {
  return !!process.env.VERCEL_URL;
}

/**
 * Get audio processing configuration with defaults
 * @returns AudioProcessingConfig - Processing configuration
 */
export function getAudioProcessingConfig() {
  return {
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '15'),
    downloadTimeoutSec: parseInt(process.env.DOWNLOAD_TIMEOUT_SEC || '10'),
    processingTimeoutSec: parseInt(process.env.PROCESSING_TIMEOUT_SEC || '55'),
    supportedFormats: ['.m4a', '.mp3', '.wav', '.ogg', '.aac', '.flac'],
  };
}

/**
 * Get Mailgun configuration
 * @returns Mailgun config object
 */
export function getMailgunConfig() {
  return {
    domain: process.env.MAILGUN_DOMAIN!,
    apiKey: process.env.MAILGUN_API_KEY!,
    apiUrl: `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN!}`,
  };
}

/**
 * Get OpenAI configuration
 * @returns OpenAI config object
 */
export function getOpenAIConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY!,
    apiUrl: 'https://api.openai.com/v1',
  };
} 