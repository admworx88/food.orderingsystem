import { AuthGuard } from '@/components/auth/auth-guard';
import { createServerClient } from '@/lib/supabase/server';
import { CashierLayoutClient } from './layout-client';

export default async function CashierLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Fetch cashier name for the header
  let cashierName = 'Cashier';
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      cashierName = profile?.full_name || 'Cashier';
    }
  } catch {
    // Fallback to default name
  }

  return (
    <AuthGuard allowedRoles={['cashier', 'admin']}>
      <CashierLayoutClient cashierName={cashierName}>
        {children}
      </CashierLayoutClient>
    </AuthGuard>
  );
}
