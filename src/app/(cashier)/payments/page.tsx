import { createServerClient } from '@/lib/supabase/server';
import { getPendingOrders } from '@/services/payment-service';
import { CashierPosClient } from '@/components/cashier/cashier-pos-client';

export default async function PaymentsPage() {
  // Fetch initial data server-side
  const pendingResult = await getPendingOrders();
  const initialOrders = pendingResult.success ? pendingResult.data : [];

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
      cashierId={cashierId}
      isPayMongoEnabled={isPayMongoEnabled}
    />
  );
}
