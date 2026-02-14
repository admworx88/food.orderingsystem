import { getRecentCompletedOrders } from '@/services/payment-service';
import { RecentOrdersClient } from '@/components/cashier/recent-orders-client';

export default async function RecentOrdersPage() {
  const result = await getRecentCompletedOrders();
  const orders = result.success ? result.data : [];

  return <RecentOrdersClient initialOrders={orders} />;
}
