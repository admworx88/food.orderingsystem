'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { loginSchema, type LoginInput } from '@/lib/validators/auth';
import { signInWithEmail } from '@/services/auth-service';
import { cn } from '@/lib/utils';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || undefined;
  const message = searchParams.get('message');

  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remainingAttempts: number;
    lockedUntil: Date | null;
  } | null>(null);

  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: '',
  });

  // Show success message from redirect (e.g., after signup)
  useEffect(() => {
    if (message) {
      toast.success(message);
      // Clear the message from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('message');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [message]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name as keyof LoginInput]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    const validation = loginSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof LoginInput, string>> = {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof LoginInput;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      const result = await signInWithEmail(formData.email, formData.password, redirectTo);

      if (result.rateLimitInfo) {
        setRateLimitInfo({
          remainingAttempts: result.rateLimitInfo.remainingAttempts,
          lockedUntil: result.rateLimitInfo.lockedUntil,
        });
      }

      if (result.success && result.redirectTo) {
        toast.success('Welcome back!');
        router.push(result.redirectTo);
        router.refresh();
      } else {
        toast.error(result.error || 'Sign in failed');
      }
    });
  };

  const isLocked = rateLimitInfo?.lockedUntil && new Date() < rateLimitInfo.lockedUntil;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Rate limit warning */}
      {rateLimitInfo && !isLocked && rateLimitInfo.remainingAttempts <= 3 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-scale-in">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm font-body">
            <p className="font-semibold text-amber-800">
              {rateLimitInfo.remainingAttempts} attempt
              {rateLimitInfo.remainingAttempts !== 1 ? 's' : ''} remaining
            </p>
            <p className="text-amber-700 mt-0.5">
              Your account will be temporarily locked after{' '}
              {rateLimitInfo.remainingAttempts} more failed attempt
              {rateLimitInfo.remainingAttempts !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      )}

      {/* Locked warning */}
      {isLocked && rateLimitInfo?.lockedUntil && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl animate-scale-in">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm font-body">
            <p className="font-semibold text-red-800">Account temporarily locked</p>
            <p className="text-red-700 mt-0.5">
              Too many failed attempts. Please try again at{' '}
              {rateLimitInfo.lockedUntil.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              .
            </p>
          </div>
        </div>
      )}

      {/* Email field */}
      <div className="space-y-2">
        <Label htmlFor="email" className="font-body font-medium text-gray-700">
          Email address
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          disabled={isPending || !!isLocked}
          placeholder="you@example.com"
          className={cn(
            'h-12 px-4 font-body text-base transition-all rounded-xl border-gray-200',
            'focus:border-gray-400 focus:ring-gray-400/20',
            errors.email && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
          )}
        />
        {errors.email && (
          <p className="text-sm text-red-600 font-body animate-fade-in">{errors.email}</p>
        )}
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="font-body font-medium text-gray-700">
            Password
          </Label>
          <Link
            href="/forgot-password"
            className="text-sm text-gray-500 hover:text-gray-900 font-body font-medium transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            disabled={isPending || !!isLocked}
            placeholder="Enter your password"
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
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        disabled={isPending || !!isLocked}
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
            Signing in...
          </>
        ) : (
          <>
            Sign in
            <ArrowRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 text-gray-400 font-body">New to OrderFlow?</span>
        </div>
      </div>

      {/* Sign up link */}
      <Link
        href="/signup"
        className={cn(
          'flex items-center justify-center w-full h-12 font-body font-semibold text-base rounded-xl',
          'border-2 border-gray-200 text-gray-700',
          'hover:border-gray-300 hover:bg-gray-50 transition-all duration-200'
        )}
      >
        Create an account
      </Link>
    </form>
  );
}
