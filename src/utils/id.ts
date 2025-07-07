// @ts-ignore
import { nanoid, customAlphabet } from 'nanoid';

/**
 * Generate a unique ID for database primary keys
 * Uses nanoid instead of cuid for better server-side compatibility
 * @returns string - A unique ID
 */
export function generateCuid(): string {
  // Generate a 21-character nanoid (similar length to cuid)
  return nanoid(21);
}

/**
 * Generate a 6-character nanoid for user slugs
 * @returns string - A 6-character nanoid
 */
export function generateSlug(): string {
  return nanoid(6);
}

/**
 * Generate a unique slug that's safe for email addresses
 * Uses only lowercase letters and numbers for consistent formatting
 * @returns string - A 6-character lowercase slug
 */
export function generateEmailSlug(): string {
  // Use only lowercase letters and numbers for consistent formatting
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
  const customNanoid = customAlphabet(alphabet, 6);
  return customNanoid();
}

/**
 * Generate a permanent API key for a user
 * Creates a hex UUID-like string without dashes (32 characters)
 * @returns string - A unique API key
 */
export function generateApiKey(): string {
  // Use hex characters only (0-9, a-f) for UUID-like format
  const hexAlphabet = '0123456789abcdef';
  const customHex = customAlphabet(hexAlphabet, 32);
  return customHex();
}

/**
 * Validate if a string is a valid ID
 * Updated to validate nanoid format instead of cuid
 * @param id - The string to validate
 * @returns boolean - True if valid ID format
 */
export function isValidCuid(id: string): boolean {
  // nanoid uses URL-safe characters and is typically 21 characters
  return /^[a-zA-Z0-9_-]{21}$/.test(id);
}

/**
 * Validate if a string is a valid slug
 * @param slug - The string to validate
 * @returns boolean - True if valid slug format (lowercase only)
 */
export function isValidSlug(slug: string): boolean {
  // Must be exactly 6 characters, lowercase alphanumeric only
  return /^[a-z0-9]{6}$/.test(slug);
}

/**
 * Validate if a string is a valid API key
 * @param apiKey - The string to validate
 * @returns boolean - True if valid API key format (32 hex characters)
 */
export function isValidApiKey(apiKey: string): boolean {
  // Must be exactly 32 characters, hex only
  return /^[a-f0-9]{32}$/.test(apiKey);
}

/**
 * Generate a unique identifier for voice events
 * @returns string - A unique ID for voice events
 */
export function generateVoiceEventId(): string {
  return generateCuid();
}

/**
 * Generate a unique identifier for users
 * @returns string - A unique ID for users
 */
export function generateUserId(): string {
  return generateCuid();
} 