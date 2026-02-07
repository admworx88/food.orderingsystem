'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';
import { loginSchema } from '@/lib/validators/auth';
import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  createRateLimitKey,
} from '@/lib/utils/rate-limiter';
import type { AuthResult, UserProfile } from '@/types/auth';

/**
 * Get client IP for rate limiting
 */
async function getClientIdentifier(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  return forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
}

/**
 * Sign in with email and password
 * Includes rate limiting and role-based redirect
 */
export async function signInWithEmail(
  email: string,
  password: string,
  redirectTo?: string
): Promise<AuthResult> {
  try {
    // Get rate limit identifier (IP + email for security)
    const clientIp = await getClientIdentifier();
    const rateLimitKey = createRateLimitKey('login', clientIp, email);

    // Check rate limit first
    const rateLimitStatus = checkRateLimit(rateLimitKey);
    if (!rateLimitStatus.allowed) {
      console.warn(`Rate limit exceeded for ${rateLimitKey}`);
      const minutes = Math.ceil((rateLimitStatus.retryAfterSeconds || 0) / 60);
      return {
        success: false,
        error: `Too many login attempts. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
        rateLimitInfo: {
          remainingAttempts: rateLimitStatus.remainingAttempts,
          lockedUntil: rateLimitStatus.lockedUntil,
          retryAfterSeconds: rateLimitStatus.retryAfterSeconds,
        },
      };
    }

    // Validate input
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || 'Invalid input',
        rateLimitInfo: {
          remainingAttempts: rateLimitStatus.remainingAttempts,
          lockedUntil: null,
          retryAfterSeconds: null,
        },
      };
    }

    const supabase = await createServerClient();

    // Attempt sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validation.data.email,
      password: validation.data.password,
    });

    if (error) {
      // Record failed attempt
      const newRateLimitStatus = recordFailedAttempt(rateLimitKey);
      console.error('Sign in failed:', error.message);

      return {
        success: false,
        error: 'Invalid email or password',
        rateLimitInfo: {
          remainingAttempts: newRateLimitStatus.remainingAttempts,
          lockedUntil: newRateLimitStatus.lockedUntil,
          retryAfterSeconds: newRateLimitStatus.retryAfterSeconds,
        },
      };
    }

    if (!data.user) {
      const newRateLimitStatus = recordFailedAttempt(rateLimitKey);
      return {
        success: false,
        error: 'Sign in failed',
        rateLimitInfo: {
          remainingAttempts: newRateLimitStatus.remainingAttempts,
          lockedUntil: newRateLimitStatus.lockedUntil,
          retryAfterSeconds: newRateLimitStatus.retryAfterSeconds,
        },
      };
    }

    // Success - clear rate limit
    clearRateLimit(rateLimitKey);

    // Get user profile to determine redirect
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', data.user.id)
      .single();

    if (!profile?.is_active) {
      // Sign out inactive user
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Your account has been deactivated. Please contact an administrator.',
      };
    }

    // Determine redirect based on role
    let defaultRedirect = '/menu';
    switch (profile.role) {
      case 'admin':
        defaultRedirect = '/admin';
        break;
      case 'cashier':
        defaultRedirect = '/cashier';
        break;
      case 'kitchen':
        defaultRedirect = '/orders';
        break;
    }

    revalidatePath('/', 'layout');

    return {
      success: true,
      redirectTo: redirectTo || defaultRedirect,
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Sign up with email, password, and full name
 * Note: New users default to 'kitchen' role via database trigger
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<AuthResult> {
  try {
    // Rate limit signup attempts by IP only
    const clientIp = await getClientIdentifier();
    const rateLimitKey = createRateLimitKey('signup', clientIp);

    const rateLimitStatus = checkRateLimit(rateLimitKey);
    if (!rateLimitStatus.allowed) {
      const minutes = Math.ceil((rateLimitStatus.retryAfterSeconds || 0) / 60);
      return {
        success: false,
        error: `Too many signup attempts. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
      };
    }

    // Validate input (simplified - full validation done on client)
    const validation = z
      .object({
        email: z.string().email().max(255).transform((v) => v.toLowerCase().trim()),
        password: z.string().min(8).max(72),
        fullName: z.string().min(2).max(100).transform((v) => v.trim()),
      })
      .safeParse({ email, password, fullName });

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || 'Invalid input',
      };
    }

    const supabase = await createServerClient();

    // Create user with metadata (profile created via database trigger)
    const { data, error } = await supabase.auth.signUp({
      email: validation.data.email,
      password: validation.data.password,
      options: {
        data: {
          full_name: validation.data.fullName,
        },
      },
    });

    if (error) {
      recordFailedAttempt(rateLimitKey);
      console.error('Sign up failed:', error.message);

      // Map common errors to user-friendly messages
      if (error.message.includes('already registered')) {
        return {
          success: false,
          error: 'An account with this email already exists',
        };
      }

      if (error.message.includes('password')) {
        return {
          success: false,
          error: 'Password does not meet requirements',
        };
      }

      return {
        success: false,
        error: 'Sign up failed. Please try again.',
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Sign up failed. Please try again.',
      };
    }

    // Note: Database trigger handles creating the profile
    // New users default to 'kitchen' role and need admin approval for other roles

    revalidatePath('/', 'layout');

    return {
      success: true,
      redirectTo: '/login?message=Account created successfully. Please sign in.',
    };
  } catch (error) {
    console.error('Sign up error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

/**
 * Get current authenticated user with profile
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role, is_active')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    return {
      id: user.id,
      email: user.email,
      fullName: profile.full_name,
      role: profile.role as UserProfile['role'],
      isActive: profile.is_active ?? false,
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}
