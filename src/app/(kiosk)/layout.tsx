'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import { CartDrawer } from '@/components/kiosk/cart-drawer';
import { FullscreenToggle } from '@/components/kiosk/fullscreen-toggle';
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
  const [lastInteraction, setLastInteraction] = useState(() => Date.now());
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Show floating cart button on menu and add-items pages
  const showCartButton = pathname === '/menu' || pathname.startsWith('/add-items/');

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
    isDetailSheetOpen,
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
      if (idleTime > 45000 && idleTime < 60000) {
        setShowIdleWarning(true);
      } else if (idleTime >= 60000) {
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
    <div className="h-[100dvh] flex flex-col bg-[var(--kiosk-bg)] overflow-hidden">
      {/* Premium Header - responsive height */}
      <header className="flex-shrink-0 h-14 sm:h-16 md:h-[72px] px-3 sm:px-4 md:px-6 flex items-center justify-between bg-white border-b border-stone-200 shadow-sm safe-area-inset-top">
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 active:scale-[0.98] transition-transform">
          <Image
            src="/arenalogo.png"
            alt="Arena Blanca Resort"
            width={44}
            height={44}
            className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl object-contain shadow-md"
          />
          <div className="hidden xs:block">
            <h1 className="text-base sm:text-lg font-semibold text-stone-800 leading-tight tracking-tight">
              Arena Blanca Resort
            </h1>
            <p className="text-[10px] sm:text-xs text-stone-400 font-medium hidden sm:block">Restaurant</p>
          </div>
        </Link>

        {/* Right side: Language + Time */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-5">
          {/* Language Toggle - compact on mobile */}
          <div className="flex bg-stone-100 rounded-md sm:rounded-lg p-0.5 sm:p-1">
            <button className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold rounded-md bg-white text-amber-600 shadow-sm transition-all">
              EN
            </button>
            <button className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md text-stone-400 hover:text-stone-600 transition-colors">
              TL
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <FullscreenToggle variant="header" />

          {/* Divider - hidden on smallest screens */}
          <div className="hidden sm:block w-px h-5 sm:h-6 bg-stone-200" />

          {/* Current Time - hidden on very small screens */}
          <div className="hidden sm:block">
            <CurrentTime />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {/* Premium Floating Cart Button — only on menu page, responsive positioning */}
      {showCartButton && !isDetailSheetOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white pl-3 pr-4 sm:pl-4 sm:pr-5 h-12 sm:h-14 rounded-full shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 active:scale-[0.98] transition-all safe-area-inset-bottom"
        >
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-white/20 rounded-full">
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-white text-amber-600 text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center shadow">
                {cartItemCount > 9 ? '9+' : cartItemCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="font-semibold text-sm sm:text-base hidden xs:inline">Cart</span>
            <span className="font-semibold text-sm sm:text-base xs:hidden">{cartItemCount}</span>
            {cartItemCount > 0 && (
              <>
                <div className="hidden sm:block w-px h-4 sm:h-5 bg-white/30" />
                <span className="font-bold text-sm sm:text-base hidden sm:inline">{formatCurrency(cartTotal)}</span>
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
