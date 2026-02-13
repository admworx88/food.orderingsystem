'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Clock, Home, Receipt, Plus } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { formatCurrency } from '@/lib/utils/currency';
import { Button } from '@/components/ui/button';

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
  const [autoRedirect, setAutoRedirect] = useState(30);

  useEffect(() => {
    // Clear cart on successful order
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    // Auto-redirect countdown
    const interval = setInterval(() => {
      setAutoRedirect((prev) => {
        if (prev <= 1) {
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [router]);


  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-amber-50 px-4 sm:px-6 py-6 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 sm:top-20 left-5 sm:left-10 w-48 sm:w-96 h-48 sm:h-96 bg-green-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 sm:bottom-20 right-5 sm:right-10 w-48 sm:w-96 h-48 sm:h-96 bg-amber-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-3xl w-full overflow-y-auto">
        {/* Success icon */}
        <div className="text-center mb-5 sm:mb-6 lg:mb-8 animate-scale-in">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 lg:w-28 lg:h-28 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-2xl shadow-green-500/30 mb-4 sm:mb-6">
            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-stone-800 mb-2 sm:mb-3">
            {isAddedItems ? 'Items Added Successfully!' : 'Order Placed Successfully!'}
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-stone-600">
            {isAddedItems
              ? `${addedItems} new item${Number(addedItems) !== 1 ? 's' : ''} added to your order`
              : 'Thank you for your order'}
          </p>
        </div>

        {/* Order number - responsive sizing */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 p-5 sm:p-8 lg:p-10 mb-5 sm:mb-6 lg:mb-8 text-center animate-fade-in-up animation-delay-200">
          <p className="text-[10px] sm:text-xs lg:text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2 sm:mb-4">
            Your Order Number
          </p>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 opacity-10 blur-2xl rounded-full" />
            <p className="relative text-5xl sm:text-7xl lg:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-700 tracking-tight tabular-nums">
              {orderNumber}
            </p>
          </div>
          <p className="text-[10px] sm:text-xs lg:text-sm text-stone-500 mt-3 sm:mt-6">
            Please keep this number for order tracking
          </p>
        </div>

        {/* Order details grid - stack on mobile */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 mb-5 sm:mb-6 lg:mb-8 animate-fade-in-up animation-delay-400">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-stone-200 text-center">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 mx-auto mb-2 sm:mb-3 rounded-lg sm:rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-amber-600" strokeWidth={2} />
            </div>
            <p className="text-[10px] sm:text-xs lg:text-sm text-stone-500 mb-0.5 sm:mb-1">Est. Wait</p>
            <p className="text-base sm:text-xl lg:text-2xl font-bold text-stone-800">15m</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-stone-200 text-center">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 mx-auto mb-2 sm:mb-3 rounded-lg sm:rounded-xl bg-amber-100 flex items-center justify-center">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-amber-600" strokeWidth={2} />
            </div>
            <p className="text-[10px] sm:text-xs lg:text-sm text-stone-500 mb-0.5 sm:mb-1">Total</p>
            <p className="text-sm sm:text-xl lg:text-2xl font-bold text-stone-800">{formatCurrency(totalAmount)}</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-stone-200 text-center">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 mx-auto mb-2 sm:mb-3 rounded-lg sm:rounded-xl bg-amber-100 flex items-center justify-center">
              <span className="text-base sm:text-xl lg:text-2xl">
                {paymentMethod === 'cash' ? '💵' : paymentMethod === 'gcash' ? '📱' : paymentMethod === 'bill_later' ? '🍽️' : '💳'}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs lg:text-sm text-stone-500 mb-0.5 sm:mb-1">Payment</p>
            <p className="text-sm sm:text-lg lg:text-xl font-bold text-stone-800 capitalize truncate">
              {paymentMethod === 'bill_later' ? 'Pay Later' : paymentMethod || 'Cash'}
            </p>
          </div>
        </div>

        {/* Payment-specific message */}
        {paymentMethod === 'cash' && (
          <div className="bg-amber-50 rounded-xl sm:rounded-2xl border border-amber-200 p-4 sm:p-5 lg:p-6 mb-5 sm:mb-6 lg:mb-8 animate-fade-in-up animation-delay-500">
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-amber-900 mb-1 sm:mb-2 flex items-center gap-2">
              <span>💵</span>
              <span className="hidden xs:inline">Cash Payment -</span> Pay at Counter
            </h3>
            <p className="text-xs sm:text-sm lg:text-base text-amber-800">
              Please proceed to the cashier to complete your payment. Your order will be prepared once payment is confirmed.
            </p>
          </div>
        )}

        {paymentMethod === 'bill_later' && (
          <div className="bg-green-50 rounded-xl sm:rounded-2xl border border-green-200 p-4 sm:p-5 lg:p-6 mb-5 sm:mb-6 lg:mb-8 animate-fade-in-up animation-delay-500">
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-green-900 mb-1 sm:mb-2 flex items-center gap-2">
              <span>🍽️</span>
              Order Sent to Kitchen
            </h3>
            <p className="text-xs sm:text-sm lg:text-base text-green-800">
              Your order has been sent to the kitchen. Pay when you&apos;re ready at the cashier.
            </p>
          </div>
        )}

        {(paymentMethod === 'gcash' || paymentMethod === 'card') && (
          <div className="bg-blue-50 rounded-xl sm:rounded-2xl border border-blue-200 p-4 sm:p-5 lg:p-6 mb-5 sm:mb-6 lg:mb-8 animate-fade-in-up animation-delay-500">
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-blue-900 mb-1 sm:mb-2 flex items-center gap-2">
              <span>{paymentMethod === 'gcash' ? '📱' : '💳'}</span>
              Payment Confirmed
            </h3>
            <p className="text-xs sm:text-sm lg:text-base text-blue-800">
              Your payment has been processed. Your order is now being prepared.
            </p>
          </div>
        )}

        {/* Action buttons - stack on mobile */}
        <div className="flex flex-col xs:flex-row gap-3 sm:gap-4 animate-fade-in-up animation-delay-600">
          {paymentMethod === 'bill_later' && orderId && (
            <Link
              href={`/add-items?order=${orderNumber}&table=${tableNumberParam}`}
              className="flex-1 flex items-center justify-center gap-2 h-12 sm:h-14 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
              Add More Items
            </Link>
          )}
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 h-12 sm:h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all text-sm sm:text-base"
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
            Start New Order
          </Link>
        </div>

        {/* Auto-redirect notice */}
        <div className="mt-5 sm:mt-6 lg:mt-8 text-center animate-fade-in animation-delay-700">
          <p className="text-xs sm:text-sm text-stone-400">
            Returning to home in{' '}
            <span className="font-bold text-amber-600 tabular-nums">{autoRedirect}</span>s
          </p>
        </div>
      </div>

      {/* Footer message */}
      <div className="absolute bottom-4 sm:bottom-8 left-0 right-0 text-center animate-fade-in animation-delay-800 safe-area-inset-bottom">
        <p className="text-xs sm:text-sm text-stone-500 mb-1 sm:mb-2">
          Thank you for dining with us!
        </p>
        <p className="text-[10px] sm:text-xs text-stone-400">
          Need help? Ask our staff at the counter
        </p>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
