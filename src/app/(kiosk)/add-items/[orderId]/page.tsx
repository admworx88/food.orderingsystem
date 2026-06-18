import { redirect } from 'next/navigation';
import { AddItemsClient } from '@/components/kiosk/add-items-client';
import { getAddItemsPageData } from '@/services/order-service';

interface AddItemsMenuPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function AddItemsMenuPage({ params }: AddItemsMenuPageProps) {
  const { orderId } = await params;
  const result = await getAddItemsPageData(orderId);

  if (!result.success || !('data' in result) || !result.data) redirect('/add-items');

  type PageData = (typeof result & { data: unknown })['data'];
  const { order, categories, menuItems } = result.data as NonNullable<PageData>;

  return (
    <AddItemsClient
      order={{
        id: order.id,
        orderNumber: order.order_number,
        tableNumber: order.table_number,
        currentItems: order.order_items,
        subtotal: order.subtotal,
        totalAmount: order.total_amount,
        paymentMethod: order.payment_method,
      }}
      categories={categories}
      menuItems={menuItems}
    />
  );
}
