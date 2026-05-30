'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Clock, Home, Receipt, Plus, CreditCard, Smartphone, UtensilsCrossed } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { formatCurrency } from '@/lib/utils/currency';

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clearCart = useCartStore((state) => state.clearCart);

  // Read paymentMethod from URL params (reliable) — survives clearCart()
  const paymentMethod = searchParams.get('paymentMethod') || 'cash';
  const orderNumber = searchParams.get('orderNumber') || '0000';
  const totalAmount = searchParams.get('total') ? parseFloat(searchParams.get('total')!) : 0;
  const orderId = searchParams.get('orderId') || '';
  const tableNumberParam = searchParams.get('tableNumber') || '';
  const addedItems = searchParams.get('addedItems');
  const isAddedItems = !!addedItems;
  const kioskLocation = searchParams.get('kioskLocation') || '';
  const homeUrl = kioskLocation === 'ocean_view' ? '/ocean-view' : '/';
  const [autoRedirect, setAutoRedirect] = useState(30);

  useEffect(() => {
    // Auto-redirect countdown - only for digital payments (gcash, card)
    if (paymentMethod === 'gcash' || paymentMethod === 'card') {
      const interval = setInterval(() => {
        setAutoRedirect((prev) => {
          if (prev <= 1) { clearCart(); router.push(homeUrl); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [router, paymentMethod, homeUrl, clearCart]);

  const paymentLabel =
    paymentMethod === 'bill_later' ? 'Pay Later'
    : paymentMethod === 'gcash' ? 'GCash'
    : paymentMethod === 'card' ? 'Card'
    : 'Cash';

  const PaymentIcon =
    paymentMethod === 'gcash' ? Smartphone
    : paymentMethod === 'card' ? CreditCard
    : Receipt;

  return (
    <div className="h-full flex flex-col bg-[#FEF7EE] overflow-y-auto">
      {/* Top brand stripe */}
      <div className="h-1 flex-shrink-0 bg-gradient-to-r from-[#1A3D2B] via-amber-500 to-[#1A3D2B]" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-md">

          {/* ── Success mark ── */}
          <div className="flex flex-col items-center mb-7 sm:mb-9">
            <div className="relative mb-5">
              {/* Pulse ring */}
              <div
                className="absolute inset-0 rounded-full bg-[#1A3D2B]/15"
                style={{ transform: 'scale(1.55)', animation: 'ping 2s cubic-bezier(0,0,0.2,1) 2' }}
              />
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#1A3D2B] flex items-center justify-center shadow-xl shadow-[#1A3D2B]/25">
                <Check className="w-9 h-9 sm:w-11 sm:h-11 text-white" strokeWidth={3} />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 mb-2 text-center">
              {isAddedItems ? 'Items Added!' : 'Order Confirmed'}
            </h1>
            <p className="text-sm sm:text-base text-stone-500 text-center">
              {isAddedItems
                ? `${addedItems} new item${Number(addedItems) !== 1 ? 's' : ''} added to your order`
                : 'Your order has been received by our kitchen'}
            </p>
          </div>

          {/* ── Order number card ── */}
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xl overflow-hidden mb-4">
            {/* Dark green header */}
            <div className="bg-[#1A3D2B] px-5 py-3 flex items-center justify-between">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.18em]">
                Order Number
              </span>
              <span className="text-[10px] text-white/40 font-medium">Arena Blanca Resort</span>
            </div>

            {/* Number */}
            <div className="px-6 py-8 sm:py-10 text-center bg-gradient-to-b from-white to-amber-50/40">
              <p className="text-6xl sm:text-8xl font-black text-stone-800 tracking-tight tabular-nums leading-none">
                {orderNumber}
              </p>
              <p className="text-xs sm:text-sm text-stone-400 mt-4 font-medium">
                Show this number when collecting your order
              </p>
            </div>
          </div>

          {/* ── Details row ── */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            <div className="bg-white rounded-2xl border border-stone-100 p-3 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" strokeWidth={2} />
              </div>
              <p className="text-[10px] text-stone-400 font-semibold tracking-wide">Est. Wait</p>
              <p className="text-lg sm:text-xl font-black text-stone-800 leading-none">15m</p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-100 p-3 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-amber-600" strokeWidth={2} />
              </div>
              <p className="text-[10px] text-stone-400 font-semibold tracking-wide">Total</p>
              <p className="text-sm sm:text-base font-black text-stone-800 leading-none tabular-nums">
                {formatCurrency(totalAmount)}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-100 p-3 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <PaymentIcon className="w-4 h-4 text-amber-600" strokeWidth={2} />
              </div>
              <p className="text-[10px] text-stone-400 font-semibold tracking-wide">Payment</p>
              <p className="text-sm sm:text-base font-black text-stone-800 leading-none truncate max-w-full">
                {paymentLabel}
              </p>
            </div>
          </div>

          {/* ── Payment status banners ── */}
          {paymentMethod === 'cash' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Receipt className="w-4 h-4 text-amber-800" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900 mb-0.5">Pay at the Counter</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Please proceed to the cashier to complete payment. Your order will be prepared once confirmed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'bill_later' && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 sm:p-5 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-green-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <UtensilsCrossed className="w-4 h-4 text-green-800" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-900 mb-0.5">Sent to Kitchen</p>
                  <p className="text-xs text-green-700 leading-relaxed">
                    Your order is being prepared. Pay whenever you&apos;re ready at the cashier.
                  </p>
                </div>
              </div>
            </div>
          )}

          {(paymentMethod === 'gcash' || paymentMethod === 'card') && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-5 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-blue-800" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-900 mb-0.5">Payment Confirmed</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Your payment has been processed and your order is now being prepared.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex flex-col xs:flex-row gap-3">
            {paymentMethod === 'bill_later' && orderId && (
              <Link
                href={`/add-items?order=${orderNumber}&table=${tableNumberParam}`}
                className="flex-1 flex items-center justify-center gap-2 h-12 sm:h-14 bg-[#1A3D2B] hover:bg-[#143020] text-white text-sm sm:text-base font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                Add More Items
              </Link>
            )}
            <Link
              href={homeUrl}
              onClick={clearCart}
              className="flex-1 flex items-center justify-center gap-2 h-12 sm:h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-sm sm:text-base font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all"
            >
              <Home className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
              New Order
            </Link>
          </div>

          {/* Auto-redirect */}
          {(paymentMethod === 'gcash' || paymentMethod === 'card') && (
            <p className="text-center text-xs text-stone-400 mt-4">
              Returning to home in{' '}
              <span className="font-bold text-amber-600 tabular-nums">{autoRedirect}</span>s
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 pb-5 text-center">
        <p className="text-xs text-stone-400">Thank you for dining with Arena Blanca Resort</p>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center bg-[#FEF7EE]">
        <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
