import { AuthGuard } from '@/components/auth/auth-guard';
import { AdminLayoutClient } from './layout-client';

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGuard allowedRoles={['admin']}>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </AuthGuard>
  );
}
