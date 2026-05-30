import { createServerClient } from '@/lib/supabase/server';
import { getPendingOrders, getUnpaidBills } from '@/services/payment-service';
import { KioskPosLayout } from '@/components/kiosk/kiosk-pos-layout';

export default async function KioskMenuPage({ searchParams }: { searchParams: Promise<{ view?: string; selectOrder?: string }> }) {
  const supabase = await createServerClient();
  const { view, selectOrder } = await searchParams;

  const [{ data: categories }, { data: menuItems }, pendingResult, unpaidResult] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order'),
    supabase
      .from('menu_items')
      .select('*, category:categories(id, name)')
      .is('deleted_at', null)
      .order('display_order'),
    getPendingOrders(),
    getUnpaidBills(),
  ]);

  const initialView = view === 'payments' || view === 'orders' ? view : undefined;

  return (
    <div className="h-full">
      <KioskPosLayout
        categories={categories || []}
        menuItems={menuItems || []}
        initialPendingOrders={pendingResult.success ? pendingResult.data : []}
        initialUnpaidBills={unpaidResult.success ? unpaidResult.data : []}
        initialView={initialView}
        initialSelectedOrderId={selectOrder}
      />
    </div>
  );
}
