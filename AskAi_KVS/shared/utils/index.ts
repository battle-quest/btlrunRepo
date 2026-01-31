/**
 * Utility Functions
 *
 * Common helper functions for logging, token generation, and validation.
 */

import * as crypto from 'crypto';

// ============================================================================
// ID GENERATION
// ============================================================================

/**
 * Generates a random ID with an optional prefix.
 *
 * @param prefix - Optional prefix for the ID
 * @returns Random ID string
 *
 * @example
 * ```typescript
 * generateId('user');    // "user-a1b2c3d4e5f6g7h8"
 * generateId();          // "a1b2c3d4e5f6g7h8"
 * ```
 */
export function generateId(prefix?: string): string {
  const random = crypto.randomBytes(16).toString('hex').slice(0, 16);
  return prefix ? `${prefix}-${random}` : random;
}

// ============================================================================
// TOKEN GENERATION & VALIDATION
// ============================================================================

/**
 * Generate a secure random token
 *
 * @param length - Number of random bytes (default: 32)
 * @returns Base64URL-encoded token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Hash a token for secure storage using SHA-256
 *
 * @param token - The token to hash
 * @returns Hex-encoded hash
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate HMAC signature for signed payloads
 *
 * @param payload - Data to sign
 * @param secret - HMAC secret key
 * @returns Base64URL-encoded signature
 */
export function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

/**
 * Verify HMAC signature
 *
 * @param payload - Original data
 * @param signature - Signature to verify
 * @param secret - HMAC secret key
 * @returns true if signature is valid
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = signPayload(payload, secret);
  if (signature.length !== expected.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ============================================================================
// TIME UTILITIES
// ============================================================================

/**
 * Returns the current timestamp in ISO 8601 format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Adds hours to a Date and returns a new Date instance
 */
export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Adds days to a Date and returns a new Date instance
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * Truncates a string to a maximum length with an optional suffix
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Sanitizes strings to prevent unsafe characters
 */
export function sanitize(input: string): string {
  return input
    .trim()
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .slice(0, 100);
}

// ============================================================================
// ERROR UTILITIES
// ============================================================================

/**
 * Custom error class with status code support
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Creates a structured error with status code
 */
export function createError(message: string, code: string, statusCode: number = 400): AppError {
  return new AppError(message, code, statusCode);
}

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

export interface Logger {
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
}

/**
 * Creates a structured logger with optional request ID prefix
 */
export function createLogger(requestId?: string): Logger {
  const prefix = requestId ? `[${requestId}]` : '';

  return {
    info: (message: string, ...args: unknown[]) => {
      console.log(`${prefix} INFO:`, message, ...args);
    },
    warn: (message: string, ...args: unknown[]) => {
      console.warn(`${prefix} WARN:`, message, ...args);
    },
    error: (message: string, ...args: unknown[]) => {
      console.error(`${prefix} ERROR:`, message, ...args);
    },
    debug: (message: string, ...args: unknown[]) => {
      if (process.env.DEBUG) {
        console.debug(`${prefix} DEBUG:`, message, ...args);
      }
    },
  };
}

// ============================================================================
// SIGNED LINK UTILITIES
// ============================================================================

export interface SignedLink {
  id: string;
  exp: number;
  nonce: string;
  sig: string;
}

/**
 * Creates a signed link with expiration and nonce
 *
 * @param id - Resource identifier
 * @param secret - HMAC secret
 * @param ttlSeconds - Time to live in seconds (default: 3600 = 1 hour)
 * @returns Signed link object
 */
export function createSignedLink(
  id: string,
  secret: string,
  ttlSeconds: number = 3600
): SignedLink {
  const nonce = generateToken(16);
  const exp = Date.now() + ttlSeconds * 1000;
  const payload = `${id}:${exp}:${nonce}`;
  const sig = signPayload(payload, secret);

  return { id, exp, nonce, sig };
}

/**
 * Verifies a signed link
 *
 * @param link - The signed link to verify
 * @param secret - HMAC secret
 * @returns Validation result with error message if invalid
 */
export function verifySignedLink(
  link: SignedLink,
  secret: string
): { valid: boolean; error?: string } {
  // Check expiry
  if (Date.now() > link.exp) {
    return { valid: false, error: 'Link expired' };
  }

  // Verify signature
  const payload = `${link.id}:${link.exp}:${link.nonce}`;
  const expectedSig = signPayload(payload, secret);

  if (!timingSafeEqual(link.sig, expectedSig)) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true };
}

/**
 * Encodes a signed link as URL query parameters
 */
export function encodeSignedLink(link: SignedLink, baseUrl: string): string {
  const params = new URLSearchParams({
    id: link.id,
    exp: link.exp.toString(),
    nonce: link.nonce,
    sig: link.sig,
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Decodes a signed link from URL query parameters
 */
export function decodeSignedLink(queryParams: URLSearchParams): SignedLink | null {
  const id = queryParams.get('id');
  const expStr = queryParams.get('exp');
  const nonce = queryParams.get('nonce');
  const sig = queryParams.get('sig');

  if (!id || !expStr || !nonce || !sig) {
    return null;
  }

  const exp = parseInt(expStr, 10);
  if (isNaN(exp)) {
    return null;
  }

  return { id, exp, nonce, sig };
}
