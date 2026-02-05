import { z } from 'zod';

// Password requirements regex patterns
const PASSWORD_UPPERCASE = /[A-Z]/;
const PASSWORD_LOWERCASE = /[a-z]/;
const PASSWORD_NUMBER = /[0-9]/;
const PASSWORD_SPECIAL = /[!@#$%^&*(),.?":{}|<>]/;

// Email schema
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email must be less than 255 characters')
  .transform((val) => val.toLowerCase().trim());

// Password schema with strength requirements
export const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be less than 72 characters') // bcrypt limit
  .refine((val) => PASSWORD_UPPERCASE.test(val), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((val) => PASSWORD_LOWERCASE.test(val), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((val) => PASSWORD_NUMBER.test(val), {
    message: 'Password must contain at least one number',
  });

// Full name schema
export const fullNameSchema = z
  .string()
  .min(1, 'Full name is required')
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters')
  .transform((val) => val.trim());

// Login form schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Signup form schema
export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    fullName: fullNameSchema,
    acceptTerms: z
      .boolean()
      .refine((val) => val === true, {
        message: 'You must accept the terms and conditions',
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

// Password strength result type
export interface PasswordStrengthResult {
  score: number; // 0-4
  label: 'weak' | 'fair' | 'good' | 'strong';
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

// Password strength calculator
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    length: password.length >= 8,
    uppercase: PASSWORD_UPPERCASE.test(password),
    lowercase: PASSWORD_LOWERCASE.test(password),
    number: PASSWORD_NUMBER.test(password),
    special: PASSWORD_SPECIAL.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  const labels: Record<number, 'weak' | 'fair' | 'good' | 'strong'> = {
    0: 'weak',
    1: 'weak',
    2: 'fair',
    3: 'good',
    4: 'strong',
    5: 'strong',
  };

  return {
    score: Math.min(score, 4),
    label: labels[score] || 'weak',
    checks,
  };
}
