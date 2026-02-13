'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Plus, Loader2, ShoppingBag } from 'lucide-react';
import { MenuGrid } from './menu-grid';
import { useCartStore } from '@/stores/cart-store';
import { addItemsToOrder } from '@/services/order-service';
import { formatCurrency } from '@/lib/utils/currency';
import { Button } from '@/components/ui/button';
import type { Database } from '@/lib/supabase/types';

type Category = Database['public']['Tables']['categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'] & {
  category: { id: string; name: string } | null;
};

interface ExistingOrderInfo {
  id: string;
  orderNumber: string;
  tableNumber: string | null;
  currentItems: Array<{ id: string; item_name: string; quantity: number; unit_price: number; total_price: number }>;
  subtotal: number;
  totalAmount: number;
}

interface AddItemsClientProps {
  order: ExistingOrderInfo;
  categories: Category[];
  menuItems: MenuItem[];
}

export function AddItemsClient({ order, categories, menuItems }: AddItemsClientProps) {
  const router = useRouter();
  const { items: cartItems, getItemCount, getSubtotal, clearCart } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const newItemCount = getItemCount();
  const newItemsSubtotal = getSubtotal();

  const handleSubmit = async () => {
    if (cartItems.length === 0) return;

    setIsSubmitting(true);
    setError('');

    const result = await addItemsToOrder(
      order.id,
      cartItems.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        basePrice: item.basePrice,
        quantity: item.quantity,
        addons: item.addons,
        specialInstructions: item.specialInstructions,
      }))
    );

    if (result.success) {
      clearCart();
      router.push(
        `/confirmation?orderNumber=${result.data.orderNumber}&total=0&paymentMethod=bill_later&addedItems=${result.data.newItemCount}`
      );
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Order context banner */}
      <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/add-items"
              className="w-9 h-9 rounded-lg bg-amber-100 hover:bg-amber-200 flex items-center justify-center active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-amber-700" strokeWidth={2} />
            </Link>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-amber-900">
                Adding to Order #{order.orderNumber}
              </h2>
              <p className="text-xs text-amber-700">
                Table {order.tableNumber} &middot; {order.currentItems.length} existing item{order.currentItems.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-amber-700">Current total</p>
            <p className="text-sm sm:text-base font-bold text-amber-900">{formatCurrency(order.totalAmount)}</p>
          </div>
        </div>
      </div>

      {/* Menu browsing (reuse existing MenuGrid) */}
      <div className="flex-1 overflow-hidden">
        <MenuGrid categories={categories} menuItems={menuItems} />
      </div>

      {/* Bottom bar with new items summary + submit */}
      {newItemCount > 0 && (
        <div className="flex-shrink-0 bg-white border-t border-stone-200 px-4 sm:px-6 py-3 sm:py-4 safe-area-inset-bottom">
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-stone-600">
              <ShoppingBag className="w-5 h-5" />
              <span className="text-sm font-semibold">
                {newItemCount} new item{newItemCount !== 1 ? 's' : ''}
              </span>
              <span className="text-sm font-bold text-stone-800">
                {formatCurrency(newItemsSubtotal)}
              </span>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-base rounded-xl"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Adding Items...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Add to Order
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
