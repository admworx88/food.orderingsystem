/**
 * In-memory rate limiter for login attempts
 *
 * Features:
 * - 5 max attempts per 15-minute window
 * - Auto-cleanup of stale entries
 * - Combines IP + identifier for security
 *
 * Note: For production with multiple server instances,
 * replace with Redis-based solution (e.g., Upstash Ratelimit)
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory store (resets on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Set up auto-cleanup (only runs on server)
if (typeof globalThis !== 'undefined') {
  // Use globalThis to persist interval across hot reloads
  const globalStore = globalThis as typeof globalThis & {
    __rateLimitCleanupInterval?: NodeJS.Timeout;
  };

  if (!globalStore.__rateLimitCleanupInterval) {
    globalStore.__rateLimitCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of rateLimitStore.entries()) {
        // Remove if lock expired or window expired
        if (entry.lockedUntil && now > entry.lockedUntil) {
          rateLimitStore.delete(key);
        } else if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
          rateLimitStore.delete(key);
        }
      }
    }, CLEANUP_INTERVAL_MS);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntil: Date | null;
  retryAfterSeconds: number | null;
}

/**
 * Check if an identifier is rate limited
 */
export function checkRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No previous attempts
  if (!entry) {
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
      lockedUntil: null,
      retryAfterSeconds: null,
    };
  }

  // Check if currently locked
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: new Date(entry.lockedUntil),
      retryAfterSeconds,
    };
  }

  // Check if window has expired
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.delete(identifier);
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
      lockedUntil: null,
      retryAfterSeconds: null,
    };
  }

  // Calculate remaining attempts
  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - entry.attempts);

  return {
    allowed: remainingAttempts > 0,
    remainingAttempts,
    lockedUntil: entry.lockedUntil ? new Date(entry.lockedUntil) : null,
    retryAfterSeconds: null,
  };
}

/**
 * Record a failed login attempt and return updated status
 */
export function recordFailedAttempt(identifier: string): RateLimitResult {
  const now = Date.now();
  let entry = rateLimitStore.get(identifier);

  // Reset if no entry or window expired
  if (!entry || now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    entry = {
      attempts: 1,
      firstAttempt: now,
      lockedUntil: null,
    };
  } else {
    entry.attempts += 1;
  }

  // Lock if max attempts reached
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + RATE_LIMIT_WINDOW_MS;
  }

  rateLimitStore.set(identifier, entry);

  return checkRateLimit(identifier);
}

/**
 * Clear rate limit for an identifier (call on successful login)
 */
export function clearRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Create a rate limit key combining IP and email
 * This prevents both IP-based and account-based brute force attacks
 */
export function createRateLimitKey(
  type: 'login' | 'signup',
  ip: string,
  email?: string
): string {
  if (email) {
    return `${type}:${ip}:${email.toLowerCase()}`;
  }
  return `${type}:${ip}`;
}
