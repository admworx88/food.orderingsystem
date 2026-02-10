import { AuthGuard } from '@/components/auth/auth-guard';
import { createServerClient } from '@/lib/supabase/server';
import { WaiterLayoutClient } from './layout-client';

export default async function WaiterLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Fetch waiter name for the header
  let waiterName = 'Waiter';
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      waiterName = profile?.full_name || 'Waiter';
    }
  } catch {
    // Fallback to default name
  }

  return (
    <AuthGuard allowedRoles={['waiter', 'admin']}>
      <WaiterLayoutClient waiterName={waiterName}>
        {children}
      </WaiterLayoutClient>
    </AuthGuard>
  );
}
