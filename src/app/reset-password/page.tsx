import { AuthLayout } from '@/components/auth/auth-layout';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata = {
  title: 'Set New Password - OrderFlow',
  description: 'Choose a new password for your OrderFlow account.',
};

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Set new password"
      subtitle="Choose a strong password for your account"
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
}
