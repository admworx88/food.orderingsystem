import { Suspense } from 'react';
import { AuthLayout } from '@/components/auth/auth-layout';
import { LoginForm } from '@/components/auth/login-form';

export const metadata = {
  title: 'Sign In - OrderFlow',
  description: 'Sign in to your OrderFlow account to access the restaurant management system.',
};

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Enter your credentials to access your account"
    >
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Email field skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-12 bg-gray-100 rounded-xl" />
      </div>
      {/* Password field skeleton */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-4 w-28 bg-gray-200 rounded" />
        </div>
        <div className="h-12 bg-gray-100 rounded-xl" />
      </div>
      {/* Button skeleton */}
      <div className="h-12 bg-gray-200 rounded-xl" />
      {/* Divider skeleton */}
      <div className="py-4">
        <div className="h-px bg-gray-200" />
      </div>
      {/* Secondary button skeleton */}
      <div className="h-12 bg-gray-100 rounded-xl border-2 border-gray-200" />
    </div>
  );
}
