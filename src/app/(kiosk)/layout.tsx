'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { CartDrawer } from '@/components/kiosk/cart-drawer';
import { useCartStore } from '@/stores/cart-store';
import { formatCurrency } from '@/lib/utils/currency';

interface KioskLayoutProps {
  children: React.ReactNode;
}

function CurrentTime() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span className="text-stone-500 text-sm font-medium tabular-nums">{time}</span>;
}

export default function KioskLayout({ children }: KioskLayoutProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Only show floating cart button on menu page
  const showCartButton = pathname === '/menu';

  // Get cart state from Zustand store
  const {
    items: cartItems,
    promoCode,
    discountAmount,
    updateQuantity,
    removeItem,
    clearCart,
    getItemCount,
    getTotal,
  } = useCartStore();

  const cartItemCount = getItemCount();
  const cartTotal = getTotal();

  // Cart actions
  const handleUpdateQuantity = (index: number, quantity: number) => {
    updateQuantity(index, quantity);
  };

  const handleRemoveItem = (index: number) => {
    removeItem(index);
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    router.push('/cart');
  };

  // Idle timer logic
  useEffect(() => {
    const handleInteraction = () => {
      setLastInteraction(Date.now());
      setShowIdleWarning(false);
    };

    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('mousedown', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    const idleChecker = setInterval(() => {
      const idleTime = Date.now() - lastInteraction;
      if (idleTime > 60000 && idleTime < 90000) {
        setShowIdleWarning(true);
      } else if (idleTime >= 90000) {
        setShowIdleWarning(false);
        clearCart();
        router.push('/');
      }
    }, 1000);

    return () => {
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      clearInterval(idleChecker);
    };
  }, [lastInteraction]);

  return (
    <div className="h-screen flex flex-col bg-[var(--kiosk-bg)] overflow-hidden">
      {/* Premium Header - 72px */}
      <header className="flex-shrink-0 h-[72px] px-6 flex items-center justify-between bg-white border-b border-stone-200 shadow-sm">
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center gap-3 active:scale-[0.98] transition-transform">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-lg tracking-tight">OF</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-stone-800 leading-tight tracking-tight">
              OrderFlow
            </h1>
            <p className="text-xs text-stone-400 font-medium">Hotel Restaurant</p>
          </div>
        </Link>

        {/* Right side: Language + Time */}
        <div className="flex items-center gap-5">
          {/* Language Toggle */}
          <div className="flex bg-stone-100 rounded-lg p-1">
            <button className="px-3 py-1.5 text-sm font-semibold rounded-md bg-white text-amber-600 shadow-sm transition-all">
              EN
            </button>
            <button className="px-3 py-1.5 text-sm font-medium rounded-md text-stone-400 hover:text-stone-600 transition-colors">
              TL
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-stone-200" />

          {/* Current Time */}
          <CurrentTime />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {/* Premium Floating Cart Button — only on menu page */}
      {showCartButton && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white pl-4 pr-5 h-14 rounded-full shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 active:scale-[0.98] transition-all"
        >
          <div className="relative flex items-center justify-center w-9 h-9 bg-white/20 rounded-full">
            <ShoppingBag className="w-5 h-5" strokeWidth={2} />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-amber-600 text-xs font-bold rounded-full flex items-center justify-center shadow">
                {cartItemCount > 9 ? '9+' : cartItemCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold">View Cart</span>
            {cartItemCount > 0 && (
              <>
                <div className="w-px h-5 bg-white/30" />
                <span className="font-bold">{formatCurrency(cartTotal)}</span>
              </>
            )}
          </div>
        </button>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        promoCode={promoCode}
        discountAmount={discountAmount}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
      />

      {/* Idle Warning Overlay */}
      {showIdleWarning && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-10 max-w-sm w-full text-center shadow-2xl animate-scale-in">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-50 flex items-center justify-center">
              <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-stone-800 mb-3">
              Still there?
            </h2>
            <p className="text-stone-500 mb-8">
              Your session will reset in 30 seconds due to inactivity.
            </p>
            <button
              onClick={() => {
                setLastInteraction(Date.now());
                setShowIdleWarning(false);
              }}
              className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-lg rounded-xl active:scale-[0.98] transition-all"
            >
              Continue Ordering
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
