import { getWaiterOrders } from '@/services/order-service';
import { WaiterOrderQueue } from '@/components/waiter/waiter-order-queue';

export const dynamic = 'force-dynamic';

export default async function WaiterOrdersPage() {
  const result = await getWaiterOrders();

  if (!result.success) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600">Error Loading Orders</h2>
          <p className="text-muted-foreground">{result.error}</p>
        </div>
      </div>
    );
  }

  return <WaiterOrderQueue initialOrders={result.data} />;
}
