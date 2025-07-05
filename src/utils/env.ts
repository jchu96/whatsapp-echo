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
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'ADMIN_EMAILS',
  ];

  // In development, only require core auth variables
  if (process.env.NODE_ENV === 'production') {
    requiredEnvVars.push(
      'D1_URL',
      'D1_DATABASE_ID',
      'D1_API_KEY',
      'MAILGUN_DOMAIN',
      'MAILGUN_API_KEY',
      'MAILGUN_EMAIL',
      'MAILGUN_WEBHOOK_SIGNING_KEY'
    );
    
    // Require either AI/ML API key or OpenAI API key
    if (!process.env.AIMLAPI_KEY && !process.env.OPENAI_API_KEY) {
      requiredEnvVars.push('AIMLAPI_KEY');
    }
  }

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn(
      `Missing environment variables: ${missingVars.join(', ')}`
    );
    
    // Only throw in production
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}`
      );
    }
  }
}

/**
 * Get environment configuration with validation
 * @returns EnvConfig - Validated environment configuration
 */
export function getEnvConfig(): EnvConfig {
  validateEnvConfig();

  return {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || getBaseUrl(),
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || undefined,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    D1_URL: process.env.D1_URL || undefined,
    D1_DATABASE_ID: process.env.D1_DATABASE_ID || undefined,
    D1_API_KEY: process.env.D1_API_KEY || undefined,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS || undefined,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    // Phase 2 additions
    MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN || undefined,
    MAILGUN_API_KEY: process.env.MAILGUN_API_KEY || undefined,
    MAILGUN_EMAIL: process.env.MAILGUN_EMAIL || undefined,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || undefined,
    AIMLAPI_KEY: process.env.AIMLAPI_KEY,
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
  
  // Handle development with different ports
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXTAUTH_URL || 'http://localhost:3000';
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
  const domain = process.env.MAILGUN_DOMAIN;
  if (!domain) {
    throw new Error('MAILGUN_DOMAIN is required');
  }
  
  return {
    domain,
    apiKey: process.env.MAILGUN_API_KEY || undefined,
    email: process.env.MAILGUN_EMAIL || `noreply@${domain}`,
    apiUrl: `https://api.mailgun.net/v3/${domain}`,
    webhookKey: process.env.MAILGUN_WEBHOOK_SIGNING_KEY || undefined,
  };
}

/**
 * Get OpenAI configuration for direct OpenAI API
 * @returns OpenAI config object
 */
export function getOpenAIConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY || undefined,
    apiUrl: 'https://api.openai.com/v1',
  };
} 