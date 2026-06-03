'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { z } from 'zod';
import { PasswordStrengthIndicator } from '@/components/auth/password-strength-indicator';
import { updatePassword } from '@/services/auth-service';
import { createBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type SessionState = 'loading' | 'valid' | 'invalid';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be less than 72 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sessionState, setSessionState] = useState<SessionState>('loading');
  const [succeeded, setSucceeded] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ResetPasswordInput, string>>>({});

  const [formData, setFormData] = useState<ResetPasswordInput>({
    password: '',
    confirmPassword: '',
  });

  // Track whether we've received the recovery event; use a ref to avoid
  // stale-closure issues inside the auth-state-change listener.
  const recoveryReceivedRef = useRef(false);

  useEffect(() => {
    const supabase = createBrowserClient();

    // Supabase handles the #access_token hash fragment automatically on
    // initialisation. We listen for the PASSWORD_RECOVERY event to confirm
    // a valid recovery session has been established.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryReceivedRef.current = true;
        setSessionState('valid');
      }
    });

    // Fallback: if the session is already set (e.g. page refresh after
    // Supabase exchanged the token), check for an existing session.
    const checkExistingSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session && !recoveryReceivedRef.current) {
        // A session exists even without the PASSWORD_RECOVERY event firing
        // (can happen on some browser/OS combinations). Treat it as valid
        // only if the URL still contains the recovery token hint or if the
        // session was recently created (type indicator).
        // We optimistically accept any existing session here; Supabase's
        // updateUser call will fail if the session is not a recovery one.
        recoveryReceivedRef.current = true;
        setSessionState('valid');
      } else if (!session && !recoveryReceivedRef.current) {
        // Give the auth-state listener a moment to fire before declaring invalid
        const timer = setTimeout(() => {
          if (!recoveryReceivedRef.current) {
            setSessionState('invalid');
          }
        }, 2000);
        return () => clearTimeout(timer);
      }
    };

    checkExistingSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ResetPasswordInput]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = resetPasswordSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof ResetPasswordInput, string>> = {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof ResetPasswordInput;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      const result = await updatePassword(validation.data.password);

      if (!result.success) {
        toast.error(result.error || 'Failed to update password. Please try again.');
        return;
      }

      setSucceeded(true);
      toast.success('Password updated successfully!');

      // Auto-redirect after 2 seconds
      setTimeout(() => {
        router.push('/login?message=Password updated successfully');
      }, 2000);
    });
  };

  const passwordsMatch =
    formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;

  // Loading state
  if (sessionState === 'loading') {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-12 bg-gray-100 rounded-xl" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-12 bg-gray-100 rounded-xl" />
        </div>
        <div className="h-12 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  // Invalid / expired token state
  if (sessionState === 'invalid') {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-start gap-4 p-5 bg-red-50 border border-red-200 rounded-xl">
          <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm font-body">
            <p className="font-semibold text-red-800 text-base">Invalid or expired link</p>
            <p className="text-red-700 mt-1">
              This password reset link has expired or has already been used. Please request a
              new one.
            </p>
          </div>
        </div>

        <Link
          href="/forgot-password"
          className={cn(
            'flex items-center justify-center gap-2 w-full h-12 font-body font-semibold text-base rounded-xl',
            'bg-gray-900 hover:bg-gray-800 text-white transition-all duration-200',
            'hover:shadow-lg hover:shadow-gray-900/20'
          )}
        >
          Request a new reset link
        </Link>

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-gray-500 hover:text-gray-900 font-body font-medium transition-colors"
          >
            <span className="inline-flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </span>
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (succeeded) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-start gap-4 p-5 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          <div className="text-sm font-body">
            <p className="font-semibold text-green-800 text-base">Password updated!</p>
            <p className="text-green-700 mt-1">
              Your password has been changed successfully. Redirecting you to sign in...
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  // Main form
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* New password field */}
      <div className="space-y-2">
        <Label htmlFor="password" className="font-body font-medium text-gray-700">
          New password
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            autoFocus
            value={formData.password}
            onChange={handleChange}
            disabled={isPending}
            placeholder="Create a strong password"
            className={cn(
              'h-12 px-4 pr-12 font-body text-base transition-all rounded-xl border-gray-200',
              'focus:border-gray-400 focus:ring-gray-400/20',
              errors.password && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-600 font-body animate-fade-in">{errors.password}</p>
        )}
        <PasswordStrengthIndicator password={formData.password} />
      </div>

      {/* Confirm password field */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="font-body font-medium text-gray-700">
          Confirm password
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={isPending}
            placeholder="Confirm your new password"
            className={cn(
              'h-12 px-4 pr-12 font-body text-base transition-all rounded-xl border-gray-200',
              'focus:border-gray-400 focus:ring-gray-400/20',
              errors.confirmPassword &&
                'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              passwordsMatch &&
                'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20'
            )}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
          >
            {showConfirmPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-red-600 font-body animate-fade-in">
            {errors.confirmPassword}
          </p>
        )}
        {passwordsMatch && !errors.confirmPassword && (
          <p className="text-sm text-emerald-600 font-body flex items-center gap-1.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} /> Passwords match
          </p>
        )}
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        disabled={isPending}
        className={cn(
          'w-full h-12 font-body font-semibold text-base rounded-xl transition-all duration-200',
          'bg-gray-900 hover:bg-gray-800 text-white',
          'hover:shadow-lg hover:shadow-gray-900/20',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isPending ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Updating password...
          </>
        ) : (
          <>
            <ShieldCheck className="w-5 h-5 mr-2" />
            Set new password
          </>
        )}
      </Button>

      {/* Back to sign in */}
      <div className="text-center">
        <Link
          href="/login"
          className="text-sm text-gray-500 hover:text-gray-900 font-body font-medium transition-colors"
        >
          <span className="inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </span>
        </Link>
      </div>
    </form>
  );
}
