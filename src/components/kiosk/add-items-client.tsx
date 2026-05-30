'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/stores/cart-store';
import { KioskPosLayout } from './kiosk-pos-layout';
import type { Database } from '@/lib/supabase/types';

type Category = Database['public']['Tables']['categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'] & {
  category: { id: string; name: string } | null;
};

interface ExistingOrderInfo {
  id: string;
  orderNumber: string;
  tableNumber: string | null;
  currentItems: Array<{ id: string; item_name: string; quantity: number; unit_price: number; total_price: number; status: string | null }>;
  subtotal: number;
  totalAmount: number;
  paymentMethod: string | null;
}

interface AddItemsClientProps {
  order: ExistingOrderInfo;
  categories: Category[];
  menuItems: MenuItem[];
}

export function AddItemsClient({ order, categories, menuItems }: AddItemsClientProps) {
  const { setAddToOrder } = useCartStore();

  useEffect(() => {
    setAddToOrder(order.id, order.orderNumber, order.currentItems);
  }, [order.id, order.orderNumber, order.currentItems, setAddToOrder]);

  return (
    <KioskPosLayout
      categories={categories}
      menuItems={menuItems}
      addItemsContext={{
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        currentItemsCount: order.currentItems.length,
        currentTotal: order.totalAmount,
      }}
    />
  );
}
