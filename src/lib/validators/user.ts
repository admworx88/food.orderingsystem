import { z } from 'zod';

/**
 * Schema for creating a new staff user
 */
export const createUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  role: z.enum(['admin', 'cashier', 'kitchen'], {
    message: 'Please select a valid role',
  }),
  pin: z
    .string()
    .regex(/^\d{4,6}$/, 'PIN must be 4-6 digits')
    .optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * Schema for updating a user's role
 */
export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'cashier', 'kitchen'], {
    message: 'Please select a valid role',
  }),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

/**
 * Schema for updating a user's PIN
 */
export const updatePinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
});

export type UpdatePinInput = z.infer<typeof updatePinSchema>;

/**
 * Schema for updating a user's profile
 */
export const updateUserProfileSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  avatar_url: z.string().url().optional().nullable(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
