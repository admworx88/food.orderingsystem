import { AuthLayout } from '@/components/auth/auth-layout';
import { SignupForm } from '@/components/auth/signup-form';

export const metadata = {
  title: 'Create Account - OrderFlow',
  description: 'Create your OrderFlow account to access the restaurant management system.',
};

export default function SignupPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join OrderFlow to streamline your restaurant operations"
    >
      <SignupForm />
    </AuthLayout>
  );
}
