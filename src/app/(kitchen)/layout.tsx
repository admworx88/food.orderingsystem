import { AuthGuard } from '@/components/auth/auth-guard';
import { KitchenLayoutClient } from './layout-client';

export default function KitchenLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGuard allowedRoles={['kitchen', 'admin']}>
      <KitchenLayoutClient>{children}</KitchenLayoutClient>
    </AuthGuard>
  );
}
