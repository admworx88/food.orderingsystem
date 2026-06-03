import { createServerClient } from '@/lib/supabase/server';
import {
  getOpenShift,
  getShiftDetails,
  getMostRecentClosedShift,
  getShiftCollections,
} from '@/services/payment-service';
import { CollectionsView } from '@/components/cashier/collections-view';

export const dynamic = 'force-dynamic';

export default async function CollectionsPage() {
  // Get cashier info
  let cashierName = 'Unknown';
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      cashierName = profile?.full_name ?? 'Unknown';
    }
  } catch { /* fallback */ }

  const [openShiftResult, historyResult] = await Promise.all([
    getOpenShift(),
    getShiftCollections(),
  ]);
  const openShift = openShiftResult.success ? openShiftResult.data : null;
  const collectionHistory = historyResult.success ? historyResult.data : [];

  if (openShift) {
    const detailsResult = await getShiftDetails(openShift.id);
    if (detailsResult.success) {
      const { shift, payments, deductions, totals } = detailsResult.data;
      return (
        <CollectionsView
          shift={shift}
          cashierName={cashierName}
          payments={payments}
          initialDeductions={deductions}
          totals={totals}
          lastClosedShift={null}
          collectionHistory={collectionHistory}
        />
      );
    }
  }

  // No open shift — show last closed shift for reference
  const lastClosedResult = await getMostRecentClosedShift();
  const lastClosedShift = lastClosedResult.success ? lastClosedResult.data : null;

  const emptyTotals = {
    grossTotal: 0,
    byMethod: {
      cash: { count: 0, total: 0 },
      gcash: { count: 0, total: 0 },
      ewallet: { count: 0, total: 0 },
      card: { count: 0, total: 0 },
      bill_later: { count: 0, total: 0 },
    },
    refundsTotal: 0,
    deductionsTotal: 0,
    netCash: 0,
    totalOrders: 0,
  };

  return (
    <CollectionsView
      shift={null}
      cashierName={cashierName}
      payments={[]}
      initialDeductions={[]}
      totals={emptyTotals}
      lastClosedShift={lastClosedShift}
      collectionHistory={collectionHistory}
    />
  );
}
