'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Check, ArrowRight } from 'lucide-react';
import { signupSchema, type SignupInput } from '@/lib/validators/auth';
import { signUpWithEmail } from '@/services/auth-service';
import { PasswordStrengthIndicator } from './password-strength-indicator';
import { cn } from '@/lib/utils';

export function SignupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof SignupInput, string>>>({});

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    acceptTerms: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error on change
    if (errors[name as keyof SignupInput]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    const validation = signupSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof SignupInput, string>> = {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof SignupInput;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);

      // Focus first error field
      const firstErrorField = Object.keys(fieldErrors)[0];
      if (firstErrorField) {
        document.getElementById(firstErrorField)?.focus();
      }
      return;
    }

    startTransition(async () => {
      const result = await signUpWithEmail(
        formData.email,
        formData.password,
        formData.fullName
      );

      if (result.success && result.redirectTo) {
        toast.success('Account created successfully!');
        router.push(result.redirectTo);
      } else {
        toast.error(result.error || 'Sign up failed');
      }
    });
  };

  const passwordsMatch =
    formData.confirmPassword && formData.password === formData.confirmPassword;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Full name field */}
      <div className="space-y-2">
        <Label htmlFor="fullName" className="font-body font-medium text-gray-700">
          Full name
        </Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          value={formData.fullName}
          onChange={handleChange}
          disabled={isPending}
          placeholder="John Doe"
          className={cn(
            'h-12 px-4 font-body text-base transition-all rounded-xl border-gray-200',
            'focus:border-gray-400 focus:ring-gray-400/20',
            errors.fullName && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
          )}
        />
        {errors.fullName && (
          <p className="text-sm text-red-600 font-body animate-fade-in">{errors.fullName}</p>
        )}
      </div>

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
          disabled={isPending}
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
        <Label htmlFor="password" className="font-body font-medium text-gray-700">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
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
            placeholder="Confirm your password"
            className={cn(
              'h-12 px-4 pr-12 font-body text-base transition-all rounded-xl border-gray-200',
              'focus:border-gray-400 focus:ring-gray-400/20',
              errors.confirmPassword &&
                'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              passwordsMatch && 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20'
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
        {passwordsMatch && (
          <p className="text-sm text-emerald-600 font-body flex items-center gap-1.5 animate-fade-in">
            <Check className="w-4 h-4" strokeWidth={3} /> Passwords match
          </p>
        )}
      </div>

      {/* Terms acceptance */}
      <div className="space-y-2 pt-2">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            name="acceptTerms"
            checked={formData.acceptTerms}
            onChange={handleChange}
            disabled={isPending}
            className={cn(
              'mt-1 w-5 h-5 rounded-md border-2 border-gray-300 text-gray-900',
              'focus:ring-gray-400 focus:ring-offset-0 transition-all cursor-pointer',
              'checked:bg-gray-900 checked:border-gray-900'
            )}
          />
          <span className="text-sm text-gray-600 font-body group-hover:text-gray-900 transition-colors leading-relaxed">
            I agree to the{' '}
            <Link
              href="/terms"
              className="text-gray-900 hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              className="text-gray-900 hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              Privacy Policy
            </Link>
          </span>
        </label>
        {errors.acceptTerms && (
          <p className="text-sm text-red-600 font-body animate-fade-in">{errors.acceptTerms}</p>
        )}
      </div>

      {/* Submit button */}
      <div className="pt-2">
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
              Creating account...
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 text-gray-400 font-body">
            Already have an account?
          </span>
        </div>
      </div>

      {/* Sign in link */}
      <Link
        href="/login"
        className={cn(
          'flex items-center justify-center w-full h-12 font-body font-semibold text-base rounded-xl',
          'border-2 border-gray-200 text-gray-700',
          'hover:border-gray-300 hover:bg-gray-50 transition-all duration-200'
        )}
      >
        Sign in instead
      </Link>
    </form>
  );
}
