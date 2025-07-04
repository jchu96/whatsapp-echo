// @ts-ignore
import cuid from 'cuid';
// @ts-ignore
import { nanoid, customAlphabet } from 'nanoid';

/**
 * Generate a unique CUID for database primary keys
 * @returns string - A unique CUID
 */
export function generateCuid(): string {
  return cuid();
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
 * Uses only URL-safe characters (no special characters)
 * @returns string - A 6-character URL-safe slug
 */
export function generateEmailSlug(): string {
  // Use URL-safe alphabet (no special characters)
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const customNanoid = customAlphabet(alphabet, 6);
  return customNanoid();
}

/**
 * Validate if a string is a valid CUID
 * @param id - The string to validate
 * @returns boolean - True if valid CUID format
 */
export function isValidCuid(id: string): boolean {
  // CUID format: c + timestamp + counter + fingerprint + random
  // Should start with 'c' and be 25 characters long
  return /^c[a-z0-9]{24}$/.test(id);
}

/**
 * Validate if a string is a valid slug
 * @param slug - The string to validate
 * @returns boolean - True if valid slug format
 */
export function isValidSlug(slug: string): boolean {
  // Must be exactly 6 characters, alphanumeric
  return /^[a-zA-Z0-9]{6}$/.test(slug);
}

/**
 * Generate a unique identifier for voice events
 * @returns string - A unique CUID for voice events
 */
export function generateVoiceEventId(): string {
  return generateCuid();
}

/**
 * Generate a unique identifier for users
 * @returns string - A unique CUID for users
 */
export function generateUserId(): string {
  return generateCuid();
} 