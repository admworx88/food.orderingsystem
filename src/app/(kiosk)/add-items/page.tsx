'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { ChevronLeft, Search, Hash, MapPin, Loader2, UtensilsCrossed } from 'lucide-react';
import { lookupDineInOrder, getActiveDineInOrders } from '@/services/order-service';
import { useCartStore } from '@/stores/cart-store';
import { formatCurrency } from '@/lib/utils/currency';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ActiveOrder {
  id: string;
  order_number: string;
  table_number: string | null;
  status: string;
  total_amount: number;
  created_at: string;
  order_items: Array<{ id: string; item_name: string; quantity: number }>;
}

function AddItemsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAddToOrder, setOrderType, setTableNumber, clearCart } = useCartStore();

  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [tableNum, setTableNum] = useState(searchParams.get('table') || '');
  const [isLooking, setIsLooking] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [activeTab, setActiveTab] = useState<'lookup' | 'browse'>('lookup');

  // Fetch active dine-in orders for browse mode
  useEffect(() => {
    async function fetchActive() {
      const result = await getActiveDineInOrders();
      if (result.success) {
        setActiveOrders(result.data as ActiveOrder[]);
      }
      setIsLoadingOrders(false);
    }
    fetchActive();
  }, []);

  // If order and table params are pre-filled, auto-lookup
  useEffect(() => {
    if (searchParams.get('order') && searchParams.get('table')) {
      handleLookup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLookup = async () => {
    if (!orderNumber.trim() || !tableNum.trim()) {
      setLookupError('Please enter both order number and table number');
      return;
    }

    setIsLooking(true);
    setLookupError('');

    const result = await lookupDineInOrder(orderNumber.trim(), tableNum.trim());

    if (result.success) {
      // Clear cart and set add-to-order mode
      clearCart();
      setAddToOrder(result.data.id, result.data.order_number);
      setOrderType('dine_in');
      setTableNumber(result.data.table_number || tableNum.trim());
      router.push(`/add-items/${result.data.id}`);
    } else {
      setLookupError(result.error);
    }

    setIsLooking(false);
  };

  const handleSelectOrder = (order: ActiveOrder) => {
    clearCart();
    setAddToOrder(order.id, order.order_number);
    setOrderType('dine_in');
    setTableNumber(order.table_number || '');
    router.push(`/add-items/${order.id}`);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--kiosk-bg)]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 lg:py-5 bg-white border-b border-stone-200">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center active:scale-95 transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-stone-600" strokeWidth={2} />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-stone-800">Add Items to Order</h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">Find your existing dine-in order</p>
          </div>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-4">
        <div className="flex bg-stone-100 rounded-xl p-1 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('lookup')}
            className={cn(
              'flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all',
              activeTab === 'lookup'
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            )}
          >
            <Search className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            Look Up Order
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={cn(
              'flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all',
              activeTab === 'browse'
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            )}
          >
            <UtensilsCrossed className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            Current Orders
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {activeTab === 'lookup' ? (
          <div className="max-w-md mx-auto space-y-5">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-4">
              <p className="text-sm text-stone-600">
                Enter your order number and table number to find your existing order.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-stone-700 mb-1.5">
                    <Hash className="w-4 h-4 text-amber-500" />
                    Order Number
                  </label>
                  <Input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => {
                      setOrderNumber(e.target.value);
                      setLookupError('');
                    }}
                    placeholder="e.g. 0042"
                    className="h-12 text-base"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-stone-700 mb-1.5">
                    <MapPin className="w-4 h-4 text-amber-500" />
                    Table Number
                  </label>
                  <Input
                    type="text"
                    value={tableNum}
                    onChange={(e) => {
                      setTableNum(e.target.value);
                      setLookupError('');
                    }}
                    placeholder="e.g. 5"
                    className="h-12 text-base"
                  />
                </div>
              </div>

              {lookupError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-700 font-medium">{lookupError}</p>
                </div>
              )}

              <Button
                onClick={handleLookup}
                disabled={isLooking || !orderNumber.trim() || !tableNum.trim()}
                className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-base rounded-xl"
              >
                {isLooking ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Finding Order...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Find My Order
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-stone-400 text-center">
              Can&apos;t remember your order number? Switch to the &quot;Current Orders&quot; tab to browse.
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            <p className="text-sm text-stone-600 text-center mb-4">
              Tap your order to add more items
            </p>

            {isLoadingOrders ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              </div>
            ) : activeOrders.length === 0 ? (
              <div className="text-center py-12">
                <UtensilsCrossed className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500 font-medium">No active dine-in orders</p>
                <p className="text-sm text-stone-400 mt-1">Start a new order from the home screen</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {activeOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => handleSelectOrder(order)}
                    className="w-full bg-white rounded-xl border border-stone-200 hover:border-amber-300 hover:bg-amber-50/50 p-4 sm:p-5 text-left transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xl sm:text-2xl font-bold text-stone-800 tabular-nums">
                          #{order.order_number}
                        </span>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-semibold capitalize',
                          order.status === 'paid' && 'bg-blue-100 text-blue-700',
                          order.status === 'preparing' && 'bg-amber-100 text-amber-700',
                          order.status === 'ready' && 'bg-green-100 text-green-700',
                        )}>
                          {order.status}
                        </span>
                      </div>
                      <span className="text-base font-bold text-stone-800">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-stone-500">
                      {order.table_number && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          Table {order.table_number}
                        </span>
                      )}
                      <span>{order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}</span>
                      <span>
                        {new Date(order.created_at).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AddItemsPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    }>
      <AddItemsContent />
    </Suspense>
  );
}
