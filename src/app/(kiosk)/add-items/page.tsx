'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Search, Hash, MapPin, Loader2,
  UtensilsCrossed, ArrowRight, Clock,
} from 'lucide-react';
import { lookupDineInOrder, getActiveDineInOrders } from '@/services/order-service';
import { useCartStore } from '@/stores/cart-store';
import { formatCurrency } from '@/lib/utils/currency';
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

const STATUS_STYLE: Record<string, { pill: string; bar: string; label: string }> = {
  paid:      { pill: 'bg-blue-100 text-blue-700',   bar: 'bg-blue-400',   label: 'Paid' },
  preparing: { pill: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400',  label: 'Preparing' },
  ready:     { pill: 'bg-green-100 text-green-700', bar: 'bg-green-500',  label: 'Ready' },
};

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

  useEffect(() => {
    async function fetchActive() {
      const result = await getActiveDineInOrders();
      if (result.success) setActiveOrders(result.data as ActiveOrder[]);
      setIsLoadingOrders(false);
    }
    fetchActive();
  }, []);

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
    <div className="h-full flex flex-col bg-[#FEF7EE] overflow-y-auto">
      {/* Brand stripe */}
      <div className="h-1 flex-shrink-0 bg-gradient-to-r from-[#1A3D2B] via-amber-500 to-[#1A3D2B]" />

      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-stone-200/80 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3 sm:gap-4 max-w-2xl mx-auto">
          <Link
            href="/"
            className="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center active:scale-95 transition-all flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-stone-600" strokeWidth={2} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-800 leading-tight">
              Add Items to Order
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Find your existing dine-in order
            </p>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-6 pb-2">
        <div className="flex max-w-md mx-auto bg-stone-100/80 rounded-2xl p-1 gap-1">
          <button
            onClick={() => setActiveTab('lookup')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-all duration-200',
              activeTab === 'lookup'
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-700 hover:bg-white/50'
            )}
          >
            <Search className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
            Look Up Order
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-all duration-200',
              activeTab === 'browse'
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-700 hover:bg-white/50'
            )}
          >
            <UtensilsCrossed className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
            Current Orders
            {activeOrders.length > 0 && (
              <span className="ml-1 min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {activeOrders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-6 py-4">

        {/* ── Look Up tab ── */}
        {activeTab === 'lookup' && (
          <div className="max-w-md mx-auto space-y-4">

            {/* Lookup card */}
            <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden">
              {/* Card header stripe */}
              <div className="bg-[#1A3D2B] px-5 py-3.5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
                  <Search className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                </div>
                <p className="text-sm font-semibold text-white/90">Order Lookup</p>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                <p className="text-sm text-stone-500 leading-relaxed">
                  Enter your order number and table number to continue your order.
                </p>

                {/* Order Number */}
                <div className="space-y-2">
                  <label
                    htmlFor="order-number"
                    className="flex items-center gap-2 text-sm font-semibold text-stone-700"
                  >
                    <Hash className="w-4 h-4 text-amber-500" strokeWidth={2} />
                    Order Number
                  </label>
                  <input
                    id="order-number"
                    type="text"
                    inputMode="numeric"
                    value={orderNumber}
                    onChange={(e) => { setOrderNumber(e.target.value); setLookupError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                    placeholder="e.g. 0042"
                    className="w-full h-14 px-4 text-base text-stone-800 bg-stone-50 border border-stone-200 rounded-2xl placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-400 transition-all"
                  />
                </div>

                {/* Table Number */}
                <div className="space-y-2">
                  <label
                    htmlFor="table-number"
                    className="flex items-center gap-2 text-sm font-semibold text-stone-700"
                  >
                    <MapPin className="w-4 h-4 text-amber-500" strokeWidth={2} />
                    Table Number
                  </label>
                  <input
                    id="table-number"
                    type="text"
                    inputMode="numeric"
                    value={tableNum}
                    onChange={(e) => { setTableNum(e.target.value); setLookupError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                    placeholder="e.g. 5"
                    className="w-full h-14 px-4 text-base text-stone-800 bg-stone-50 border border-stone-200 rounded-2xl placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-400 transition-all"
                  />
                </div>

                {/* Error */}
                {lookupError && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-2xl">
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-[10px] font-black">!</span>
                    </div>
                    <p className="text-sm text-red-700 font-medium leading-snug">{lookupError}</p>
                  </div>
                )}

                {/* CTA button */}
                <button
                  onClick={handleLookup}
                  disabled={isLooking || !orderNumber.trim() || !tableNum.trim()}
                  className={cn(
                    'w-full h-14 flex items-center justify-center gap-2.5 font-bold text-base rounded-2xl transition-all active:scale-[0.98]',
                    isLooking || !orderNumber.trim() || !tableNum.trim()
                      ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/25'
                  )}
                >
                  {isLooking ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Finding Order...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" strokeWidth={2} />
                      Find My Order
                      <ArrowRight className="w-4 h-4 ml-1" strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Hint */}
            <p className="text-xs text-stone-400 text-center px-4 leading-relaxed">
              Can&apos;t remember your order number?{' '}
              <button
                onClick={() => setActiveTab('browse')}
                className="text-amber-600 font-semibold hover:text-amber-700 underline-offset-2 hover:underline"
              >
                Browse current orders
              </button>
            </p>
          </div>
        )}

        {/* ── Browse tab ── */}
        {activeTab === 'browse' && (
          <div className="max-w-2xl mx-auto space-y-3">
            <p className="text-sm text-stone-500 text-center mb-4">
              Select your table order to add more items
            </p>

            {isLoadingOrders ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                <p className="text-sm text-stone-400">Loading active orders…</p>
              </div>
            ) : activeOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-16 h-16 rounded-3xl bg-stone-100 flex items-center justify-center">
                  <UtensilsCrossed className="w-8 h-8 text-stone-300" strokeWidth={1.5} />
                </div>
                <p className="text-base font-semibold text-stone-500">No active dine-in orders</p>
                <p className="text-sm text-stone-400 text-center max-w-xs">
                  Start a new order from the home screen
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {activeOrders.map((order) => {
                  const s = STATUS_STYLE[order.status] ?? { pill: 'bg-stone-100 text-stone-600', bar: 'bg-stone-300', label: order.status };
                  return (
                    <button
                      key={order.id}
                      onClick={() => handleSelectOrder(order)}
                      className="w-full bg-white rounded-2xl border border-stone-200 hover:border-amber-300 hover:shadow-md active:scale-[0.98] transition-all duration-150 text-left overflow-hidden group"
                    >
                      {/* Left status bar */}
                      <div className="flex">
                        <div className={cn('w-1 flex-shrink-0', s.bar)} />
                        <div className="flex-1 p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-3">
                            {/* Order info */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2.5 mb-1.5">
                                <span className="text-xl sm:text-2xl font-black text-stone-800 tabular-nums leading-none">
                                  #{order.order_number}
                                </span>
                                <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize', s.pill)}>
                                  {s.label}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
                                {order.table_number && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-stone-400" strokeWidth={2} />
                                    Table {order.table_number}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <UtensilsCrossed className="w-3.5 h-3.5 text-stone-400" strokeWidth={2} />
                                  {order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-stone-400" strokeWidth={2} />
                                  {new Date(order.created_at).toLocaleTimeString('en-US', {
                                    hour: 'numeric', minute: '2-digit', hour12: true,
                                  })}
                                </span>
                              </div>
                            </div>

                            {/* Price + arrow */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-base sm:text-lg font-black text-stone-800 tabular-nums">
                                {formatCurrency(order.total_amount)}
                              </span>
                              <div className="w-8 h-8 rounded-xl bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center transition-colors">
                                <ArrowRight className="w-4 h-4 text-amber-600" strokeWidth={2.5} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
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
      <div className="h-full flex items-center justify-center bg-[#FEF7EE]">
        <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    }>
      <AddItemsContent />
    </Suspense>
  );
}
