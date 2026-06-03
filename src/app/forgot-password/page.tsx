import { Suspense } from 'react';
import { AuthLayout } from '@/components/auth/auth-layout';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata = {
  title: 'Forgot Password - OrderFlow',
  description: 'Reset your OrderFlow account password.',
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email and we'll send you a reset link"
    >
      <Suspense fallback={<ForgotPasswordFormSkeleton />}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}

function ForgotPasswordFormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-28 bg-gray-200 rounded" />
        <div className="h-12 bg-gray-100 rounded-xl" />
      </div>
      <div className="h-12 bg-gray-200 rounded-xl" />
      <div className="flex justify-center">
        <div className="h-4 w-28 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
