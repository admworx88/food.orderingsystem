'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { emailSchema } from '@/lib/validators/auth';
import { requestPasswordReset } from '@/services/auth-service';
import { cn } from '@/lib/utils';

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError(null);
    if (rateLimitError) setRateLimitError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setRateLimitError(null);

    // Client-side validation
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setEmailError(validation.error.issues[0]?.message || 'Invalid email address');
      return;
    }

    startTransition(async () => {
      const result = await requestPasswordReset(validation.data);

      if (!result.success) {
        // Only surface rate limit errors — all other failures show success for security
        if (result.error?.toLowerCase().includes('too many')) {
          setRateLimitError(result.error);
        } else {
          toast.error(result.error || 'Something went wrong. Please try again.');
        }
        return;
      }

      setSubmitted(true);
    });
  };

  // Success state — replace the form
  if (submitted) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-start gap-4 p-5 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          <div className="text-sm font-body">
            <p className="font-semibold text-green-800 text-base">Check your email</p>
            <p className="text-green-700 mt-1">
              A reset link has been sent. If <span className="font-medium">{email}</span> is
              registered, you will receive it within a few minutes.
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-500 font-body text-center">
          Didn&apos;t receive it? Check your spam folder or{' '}
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="text-gray-900 font-medium hover:underline transition-colors"
          >
            try again
          </button>
          .
        </p>

        <Link
          href="/login"
          className={cn(
            'flex items-center justify-center gap-2 w-full h-12 font-body font-semibold text-base rounded-xl',
            'border-2 border-gray-200 text-gray-700',
            'hover:border-gray-300 hover:bg-gray-50 transition-all duration-200'
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Rate limit warning */}
      {rateLimitError && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-scale-in">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm font-body">
            <p className="font-semibold text-amber-800">Too many attempts</p>
            <p className="text-amber-700 mt-0.5">{rateLimitError}</p>
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
          autoFocus
          value={email}
          onChange={handleChange}
          disabled={isPending}
          placeholder="you@example.com"
          className={cn(
            'h-12 px-4 font-body text-base transition-all rounded-xl border-gray-200',
            'focus:border-gray-400 focus:ring-gray-400/20',
            emailError && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
          )}
        />
        {emailError && (
          <p className="text-sm text-red-600 font-body animate-fade-in">{emailError}</p>
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
            Sending reset link...
          </>
        ) : (
          <>
            <Mail className="w-5 h-5 mr-2" />
            Send reset link
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
