'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Clock, Home, Receipt } from 'lucide-react';
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
  const expiresAt = searchParams.get('expiresAt');
  const [autoRedirect, setAutoRedirect] = useState(30);
  const [expiryCountdown, setExpiryCountdown] = useState<number | null>(null);

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

  // Expiry countdown for cash orders
  useEffect(() => {
    if (!expiresAt) return;

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setExpiryCountdown(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-amber-50 px-6 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-green-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-3xl w-full">
        {/* Success icon */}
        <div className="text-center mb-8 animate-scale-in">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-2xl shadow-green-500/30 mb-6">
            <CheckCircle2 className="w-16 h-16 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-4xl font-bold text-stone-800 mb-3">
            Order Placed Successfully!
          </h1>
          <p className="text-lg text-stone-600">
            Thank you for your order
          </p>
        </div>

        {/* Order number - HUGE */}
        <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 p-10 mb-8 text-center animate-fade-in-up animation-delay-200">
          <p className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">
            Your Order Number
          </p>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 opacity-10 blur-2xl rounded-full" />
            <p className="relative text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-700 tracking-tight tabular-nums">
              {orderNumber}
            </p>
          </div>
          <p className="text-sm text-stone-500 mt-6">
            Please keep this number for order tracking
          </p>
        </div>

        {/* Order details grid */}
        <div className="grid grid-cols-3 gap-4 mb-8 animate-fade-in-up animation-delay-400">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-stone-200 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" strokeWidth={2} />
            </div>
            <p className="text-sm text-stone-500 mb-1">Estimated Wait</p>
            <p className="text-2xl font-bold text-stone-800">15 min</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-stone-200 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-100 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-amber-600" strokeWidth={2} />
            </div>
            <p className="text-sm text-stone-500 mb-1">Total Amount</p>
            <p className="text-2xl font-bold text-stone-800">{formatCurrency(totalAmount)}</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-stone-200 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-100 flex items-center justify-center">
              <span className="text-2xl">
                {paymentMethod === 'cash' ? '💵' : paymentMethod === 'gcash' ? '📱' : '💳'}
              </span>
            </div>
            <p className="text-sm text-stone-500 mb-1">Payment</p>
            <p className="text-xl font-bold text-stone-800 capitalize">
              {paymentMethod || 'Cash'}
            </p>
          </div>
        </div>

        {/* Payment-specific message */}
        {paymentMethod === 'cash' && expiryCountdown !== null && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 mb-8 animate-fade-in-up animation-delay-500">
            <h3 className="text-lg font-bold text-amber-900 mb-2 flex items-center gap-2">
              <span>💵</span>
              Cash Payment - Please pay at the counter
            </h3>
            <p className="text-amber-800 mb-3">
              Your order will be prepared once payment is confirmed. Please proceed to the cashier.
            </p>
            {expiryCountdown > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-700" />
                <span className="text-sm font-semibold text-amber-900">
                  Time remaining: {formatCountdown(expiryCountdown)}
                </span>
              </div>
            )}
            {expiryCountdown === 0 && (
              <p className="text-sm font-semibold text-red-700">
                Order expired. Please place a new order.
              </p>
            )}
          </div>
        )}

        {(paymentMethod === 'gcash' || paymentMethod === 'card') && (
          <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6 mb-8 animate-fade-in-up animation-delay-500">
            <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2">
              <span>{paymentMethod === 'gcash' ? '📱' : '💳'}</span>
              Payment Confirmed
            </h3>
            <p className="text-blue-800">
              Your payment has been processed. Your order is now being prepared.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-4 animate-fade-in-up animation-delay-600">
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all"
          >
            <Home className="w-5 h-5" strokeWidth={2} />
            Start New Order
          </Link>
          <Button
            variant="outline"
            className="flex-1 h-14 border-2 border-stone-300 hover:bg-stone-50 font-semibold rounded-xl"
            disabled
          >
            <Receipt className="w-5 h-5 mr-2" strokeWidth={2} />
            Print Receipt
          </Button>
        </div>

        {/* Auto-redirect notice */}
        <div className="mt-8 text-center animate-fade-in animation-delay-700">
          <p className="text-sm text-stone-400">
            Returning to home screen in{' '}
            <span className="font-bold text-amber-600 tabular-nums">{autoRedirect}</span> seconds
          </p>
        </div>
      </div>

      {/* Footer message */}
      <div className="absolute bottom-8 left-0 right-0 text-center animate-fade-in animation-delay-800">
        <p className="text-sm text-stone-500 mb-2">
          Thank you for dining with us!
        </p>
        <p className="text-xs text-stone-400">
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
