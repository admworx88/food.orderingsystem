import { AuthGuard } from '@/components/auth/auth-guard';
import { AdminLayoutClient } from './layout-client';
import { getCurrentUser } from '@/services/auth-service';

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <AuthGuard allowedRoles={['admin']}>
      <AdminLayoutClient user={user}>{children}</AdminLayoutClient>
    </AuthGuard>
  );
}
