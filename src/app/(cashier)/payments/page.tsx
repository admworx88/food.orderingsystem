import { createServerClient } from '@/lib/supabase/server';
import { getPendingOrders, getUnpaidBills } from '@/services/payment-service';
import { CashierPosClient } from '@/components/cashier/cashier-pos-client';

export default async function PaymentsPage() {
  // Fetch initial data server-side (both pending orders and unpaid bills)
  const [pendingResult, unpaidResult] = await Promise.all([
    getPendingOrders(),
    getUnpaidBills(),
  ]);

  const initialOrders = pendingResult.success ? pendingResult.data : [];
  const initialUnpaidBills = unpaidResult.success ? unpaidResult.data : [];

  // Get cashier ID for payment processing
  let cashierId = '';
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    cashierId = user?.id || '';
  } catch {
    // Fallback
  }

  // Check if PayMongo is configured
  const isPayMongoEnabled = !!process.env.PAYMONGO_SECRET_KEY;

  return (
    <CashierPosClient
      initialOrders={initialOrders}
      initialUnpaidBills={initialUnpaidBills}
      cashierId={cashierId}
      isPayMongoEnabled={isPayMongoEnabled}
    />
  );
}
