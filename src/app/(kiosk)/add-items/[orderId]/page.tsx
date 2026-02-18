import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AddItemsClient } from '@/components/kiosk/add-items-client';

interface AddItemsMenuPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function AddItemsMenuPage({ params }: AddItemsMenuPageProps) {
  const { orderId } = await params;
  const supabase = await createServerClient();

  // Verify order exists and is active dine-in
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, table_number, status, order_type, subtotal, total_amount, payment_method, order_items(id, item_name, quantity, unit_price, total_price, status)')
    .eq('id', orderId)
    .is('deleted_at', null)
    .single();

  if (orderError || !order || order.order_type !== 'dine_in' || !['paid', 'preparing', 'ready'].includes(order.status)) {
    redirect('/add-items');
  }

  // Fetch menu data
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*, category:categories(id, name)')
    .eq('is_available', true)
    .is('deleted_at', null)
    .order('display_order');

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
      categories={categories || []}
      menuItems={menuItems || []}
    />
  );
}
