'use server';

import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  createUserSchema,
  updateUserRoleSchema,
  type CreateUserInput,
  type UpdateUserRoleInput,
} from '@/lib/validators/user';
import type { Database } from '@/lib/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = Database['public']['Enums']['user_role'];

// Extended profile with email from auth.users
export interface StaffUser extends Profile {
  email?: string;
}

// UUID validation helper
const uuidSchema = z.string().uuid('Invalid ID format');

function validateId(id: string): { valid: true } | { valid: false; error: string } {
  const result = uuidSchema.safeParse(id);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'Invalid ID' };
}

// Service result types
type ServiceSuccess<T> = {
  success: true;
  data: T;
};

type ServiceError = {
  success: false;
  error: string;
  validationErrors?: Record<string, string[]>;
};

type ServiceResult<T> = ServiceSuccess<T> | ServiceError;

/**
 * Get all staff users (profiles with their email from auth)
 */
export async function getStaffUsers(): Promise<ServiceResult<StaffUser[]>> {
  try {
    const supabase = await createServerClient();
    const adminClient = createAdminClient();

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;

    // Get auth users to map emails
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers();

    if (authError) throw authError;

    // Map emails to profiles
    const emailMap = new Map<string, string>();
    authUsers.users.forEach((user) => {
      if (user.email) {
        emailMap.set(user.id, user.email);
      }
    });

    const staffUsers: StaffUser[] = (profiles || []).map((profile) => ({
      ...profile,
      email: emailMap.get(profile.id),
    }));

    return { success: true, data: staffUsers };
  } catch (error) {
    console.error('getStaffUsers failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch staff users',
    };
  }
}

/**
 * Get a single staff user by ID
 */
export async function getStaffUser(id: string): Promise<ServiceResult<StaffUser>> {
  try {
    const idValidation = validateId(id);
    if (!idValidation.valid) {
      return { success: false, error: idValidation.error };
    }

    const supabase = await createServerClient();
    const adminClient = createAdminClient();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (profileError) throw profileError;

    // Get email from auth
    const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(id);

    if (authError) throw authError;

    const staffUser: StaffUser = {
      ...profile,
      email: authUser.user.email,
    };

    return { success: true, data: staffUser };
  } catch (error) {
    console.error('getStaffUser failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch staff user',
    };
  }
}

/**
 * Create a new staff user
 * Uses admin client to create auth user, then creates profile
 */
export async function createStaffUser(input: CreateUserInput): Promise<ServiceResult<StaffUser>> {
  try {
    const validated = createUserSchema.parse(input);
    const adminClient = createAdminClient();
    const supabase = await createServerClient();

    // Check if email is already in use
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const emailExists = existingUsers?.users.some(
      (user) => user.email?.toLowerCase() === validated.email.toLowerCase()
    );

    if (emailExists) {
      return { success: false, error: 'A user with this email already exists' };
    }

    // Create auth user with a random password (they'll need to reset it)
    const tempPassword = `Temp${Math.random().toString(36).slice(2)}${Date.now()}!`;

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: validated.email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: validated.full_name,
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create auth user');

    // Create profile with the new user's ID
    const profileData: Database['public']['Tables']['profiles']['Insert'] = {
      id: authData.user.id,
      full_name: validated.full_name,
      role: validated.role as UserRole,
      is_active: true,
    };

    // If PIN provided, hash it (in a real app, you'd use bcrypt on the server)
    // For now, we'll store the PIN hash placeholder - implement proper hashing
    if (validated.pin) {
      // TODO: Use bcrypt to hash the PIN
      // For now, we'll just note that PIN was set
      console.log('PIN provided for user - implement bcrypt hashing');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (profileError) {
      // Rollback: delete the auth user if profile creation fails
      await adminClient.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    revalidatePath('/users');
    return {
      success: true,
      data: {
        ...profile,
        email: validated.email,
      },
    };
  } catch (error) {
    console.error('createStaffUser failed:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        validationErrors: error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create staff user',
    };
  }
}

/**
 * Update a user's role
 */
export async function updateStaffRole(
  userId: string,
  input: UpdateUserRoleInput
): Promise<ServiceResult<Profile>> {
  try {
    const idValidation = validateId(userId);
    if (!idValidation.valid) {
      return { success: false, error: idValidation.error };
    }

    const validated = updateUserRoleSchema.parse(input);
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('profiles')
      .update({ role: validated.role as UserRole })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/users');
    return { success: true, data };
  } catch (error) {
    console.error('updateStaffRole failed:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        validationErrors: error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user role',
    };
  }
}

/**
 * Deactivate a user (soft delete)
 */
export async function deactivateUser(userId: string): Promise<ServiceResult<null>> {
  try {
    const idValidation = validateId(userId);
    if (!idValidation.valid) {
      return { success: false, error: idValidation.error };
    }

    const supabase = await createServerClient();

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId);

    if (error) throw error;

    revalidatePath('/users');
    return { success: true, data: null };
  } catch (error) {
    console.error('deactivateUser failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deactivate user',
    };
  }
}

/**
 * Reactivate a user
 */
export async function reactivateUser(userId: string): Promise<ServiceResult<null>> {
  try {
    const idValidation = validateId(userId);
    if (!idValidation.valid) {
      return { success: false, error: idValidation.error };
    }

    const supabase = await createServerClient();

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: true })
      .eq('id', userId);

    if (error) throw error;

    revalidatePath('/users');
    return { success: true, data: null };
  } catch (error) {
    console.error('reactivateUser failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reactivate user',
    };
  }
}

/**
 * Delete a user permanently (use with caution)
 */
export async function deleteUser(userId: string): Promise<ServiceResult<null>> {
  try {
    const idValidation = validateId(userId);
    if (!idValidation.valid) {
      return { success: false, error: idValidation.error };
    }

    const adminClient = createAdminClient();

    // Delete from auth (this will cascade to profile via trigger or we handle it)
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) throw error;

    revalidatePath('/users');
    return { success: true, data: null };
  } catch (error) {
    console.error('deleteUser failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user',
    };
  }
}
