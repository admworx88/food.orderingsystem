/**
 * Authentication-related TypeScript types
 */

export interface RateLimitInfo {
  remainingAttempts: number;
  lockedUntil: Date | null;
  retryAfterSeconds: number | null;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
  rateLimitInfo?: RateLimitInfo;
}

export interface UserProfile {
  id: string;
  email: string | undefined;
  fullName: string;
  role: 'admin' | 'cashier' | 'kitchen' | 'kiosk';
  isActive: boolean;
}

export type UserRole = 'admin' | 'cashier' | 'kitchen' | 'kiosk';

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
}
