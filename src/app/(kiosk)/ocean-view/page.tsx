'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowRight, UtensilsCrossed,
  UserCircle2, RefreshCw, ClipboardList, CreditCard,
} from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { cn } from '@/lib/utils';
import { BurgerLoader } from '@/components/shared/burger-loader';
import { KioskAdminOverlay } from '@/components/kiosk/kiosk-admin-overlay';
import { OceanViewIdentifierDialog } from '@/components/kiosk/ocean-view-identifier-dialog';
import { EmployeePinDialog } from '@/components/kiosk/employee-pin-dialog';
import { StaffSignOutDialog } from '@/components/kiosk/staff-signout-dialog';
import { useStaffSessionStore } from '@/stores/staff-session-store';

const CAROUSEL_IMAGES = [
  '/ocean-view/1.png',
  '/ocean-view/2.png',
  '/ocean-view/3.png',
  '/ocean-view/4.png',
];

const CAROUSEL_INTERVAL = 5000;

export default function OceanViewPage() {
  const router = useRouter();
  const { setOrderType, setTableNumber, setGuestName } = useCartStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [adminOverlayOpen, setAdminOverlayOpen] = useState(false);
  const [identifierDialogOpen, setIdentifierDialogOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [, setLogoTapCount] = useState(0);
  const [tapTimer, setTapTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);
  const { session } = useStaffSessionStore();
  const showOrders = session?.role === 'waiter' || session?.role === 'cashier';
  const showPayments = session?.role === 'cashier';
  const hasSideButtons = showOrders || showPayments;

  const handleLogoTap = () => {
    setLogoTapCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setAdminOverlayOpen(true);
        return 0;
      }
      return next;
    });
    if (tapTimer) clearTimeout(tapTimer);
    const timer = setTimeout(() => setLogoTapCount(0), 3000);
    setTapTimer(timer);
  };

  useEffect(() => {
    return () => { if (tapTimer) clearTimeout(tapTimer); };
  }, [tapTimer]);

  useEffect(() => {
    const t = setTimeout(() => setIsMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
      setAnimationKey((prev) => prev + 1);
    }, CAROUSEL_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const handleStartOrder = useCallback(() => {
    setIdentifierDialogOpen(true);
  }, []);

  const handleNavigate = useCallback((href: string) => {
    setIsNavigating(true);
    router.push(href);
  }, [router]);

  const handleIdentifierConfirm = useCallback((tableNumber: string | null, guestName: string | null) => {
    setOrderType('ocean_view');
    if (tableNumber) setTableNumber(tableNumber);
    if (guestName) setGuestName(guestName);
    setIdentifierDialogOpen(false);
    router.push('/menu');
  }, [setOrderType, setTableNumber, setGuestName, router]);

  return (
    <div
      className={cn(
        'relative h-[100dvh] overflow-hidden transition-opacity duration-500',
        isMounted ? 'opacity-100' : 'opacity-0'
      )}
    >
      <BurgerLoader isLoading={isNavigating} message="Loading…" variant="dark" />
      {/* ── CAROUSEL BACKGROUNDS ── */}
      {CAROUSEL_IMAGES.map((src, index) => (
        <div
          key={src}
          className={cn(
            'absolute inset-0 transition-opacity duration-1000',
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          )}
        >
          {/* Inner wrapper keyed by animationKey forces animation restart on every slide change */}
          <div
            key={index === currentIndex ? animationKey : `idle-${index}`}
            className="absolute inset-0"
            style={index === currentIndex ? {
              animation: `carousel-zoom-out ${CAROUSEL_INTERVAL + 800}ms ease-out forwards`,
            } : undefined}
          >
            <Image
              src={src}
              alt={`Ocean View ${index + 1}`}
              fill
              className="object-cover"
              priority={index === 0}
            />
          </div>
        </div>
      ))}

      {/* ── LAYERED OVERLAYS ── */}
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

      {/* ── HERO CONTENT — centered ── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6">

        {/* Pill badge */}
        <div className="mb-6 flex items-center gap-2 px-5 py-2 rounded-full backdrop-blur-md bg-white/12 border border-white/20 shadow-lg">
          <UtensilsCrossed className="w-3.5 h-3.5 text-white/80" strokeWidth={1.5} />
          <span className="text-white/90 text-[11px] font-bold tracking-[0.26em] uppercase">
            Floating Restaurant · Arena Blanca Resort
          </span>
        </div>

        {/* Logo — tappable for admin */}
        <button
          onClick={handleLogoTap}
          className="mb-5 active:scale-95 cursor-default"
          aria-label="Arena Blanca logo"
          style={{ animation: 'ocean-float 3.8s ease-in-out infinite' }}
        >
          <Image
            src="/arenalogo.png"
            alt="Arena Blanca Resort"
            width={80}
            height={80}
            className="w-[72px] h-[72px] xl:w-[80px] xl:h-[80px] object-contain drop-shadow-[0_6px_24px_rgba(0,0,0,0.55)]"
          />
        </button>

        {/* Headline */}
        <div className="text-center mb-5">
          <h1
            className="font-bold text-white leading-[0.88]"
            style={{
              fontFamily: "'Playfair Display SC', 'Playfair Display', serif",
              fontSize: 'clamp(68px, 7.5vw, 104px)',
              textShadow: '0 6px 32px rgba(0,0,0,0.65), 0 2px 6px rgba(0,0,0,0.5)',
              letterSpacing: '-0.01em',
              animation: 'ocean-float 5s ease-in-out infinite',
              animationDelay: '-1.2s',
            }}
          >
            Ocean
          </h1>
          <h1
            className="font-bold leading-[0.88]"
            style={{
              fontFamily: "'Playfair Display SC', 'Playfair Display', serif",
              fontSize: 'clamp(68px, 7.5vw, 104px)',
              color: '#3EC9BE',
              textShadow: '0 6px 32px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.35)',
              letterSpacing: '-0.01em',
              animation: 'ocean-float 5s ease-in-out infinite',
              animationDelay: '-3s',
            }}
          >
            View
          </h1>
        </div>

        {/* Orange separator */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-12 h-[2px] bg-orange-400/70 rounded-full" />
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.7)]" />
          <div className="w-12 h-[2px] bg-orange-400/70 rounded-full" />
        </div>

        {/* Subtitle */}
        <p
          className="text-white/80 text-center font-light mb-8 leading-[1.65]"
          style={{
            fontSize: 'clamp(14px, 1.3vw, 17px)',
            maxWidth: '320px',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          }}
        >
          Dine above the paradise.<br />
          Memories that last a lifetime.
        </p>

        {/* CTA column — centered */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleStartOrder}
            className={cn(
              'flex items-center gap-2 text-white rounded-full',
              'bg-orange-500 hover:bg-orange-600 active:scale-[0.96]',
              'pl-[8px] pr-6 py-[8px] min-h-[66px]',
              'shadow-[0_8px_36px_rgba(234,88,12,0.55),0_2px_12px_rgba(234,88,12,0.30)]',
              'hover:shadow-[0_10px_44px_rgba(234,88,12,0.65)]',
              'transition-all duration-200'
            )}
          >
            <div className="w-12 h-12 flex-shrink-0 rounded-full bg-white/20 flex items-center justify-center">
              <UtensilsCrossed className="w-[19px] h-[19px] text-white" strokeWidth={1.75} />
            </div>
            <span className="text-[17px] xl:text-[19px] font-bold tracking-wide leading-none mx-2 whitespace-nowrap">
              Start Your Order
            </span>
            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-white/15 flex items-center justify-center">
              <ArrowRight className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
            </div>
          </button>

              {/* Staff shortcut buttons — row, centered below main CTA */}
          {hasSideButtons && (
            <div className="flex flex-row gap-3">
              {showOrders && (
                <button
                  onClick={() => handleNavigate('/menu?view=orders')}
                  className="flex flex-col items-center justify-center gap-2 bg-white/15 backdrop-blur-md border border-white/30 hover:bg-white/25 active:scale-[0.97] text-white px-8 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 h-[70px] min-w-[120px]"
                >
                  <ClipboardList className="w-6 h-6" strokeWidth={1.75} />
                  <span className="text-[13px] font-semibold whitespace-nowrap">Orders</span>
                </button>
              )}
              {showPayments && (
                <button
                  onClick={() => handleNavigate('/menu?view=payments')}
                  className="flex flex-col items-center justify-center gap-2 bg-white/15 backdrop-blur-md border border-white/30 hover:bg-white/25 active:scale-[0.97] text-white px-8 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 h-[70px] min-w-[120px]"
                >
                  <CreditCard className="w-6 h-6" strokeWidth={1.75} />
                  <span className="text-[13px] font-semibold whitespace-nowrap">Payments</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── EMPLOYEE CHIP — top right ── */}
      <div className="absolute top-5 right-6 z-20">
        {session ? (
          <button
            onClick={() => setSignOutDialogOpen(true)}
            title="Click to sign out"
            className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md border border-white/25 hover:border-white/50 text-white pl-1.5 pr-3 py-1.5 rounded-full shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.97]"
          >
            <div className="w-8 h-8 rounded-full bg-orange-500/80 flex items-center justify-center flex-shrink-0">
              <UserCircle2 className="w-4 h-4 text-white" strokeWidth={1.75} />
            </div>
            <span className="text-[13px] font-semibold text-white whitespace-nowrap">{session.full_name}</span>
            <RefreshCw className="w-3 h-3 text-white/60 flex-shrink-0" strokeWidth={2} />
          </button>
        ) : (
          <button
            onClick={() => setPinDialogOpen(true)}
            title="Employee sign-in"
            className="flex items-center gap-1.5 bg-white/12 backdrop-blur-md border border-white/20 hover:border-white/40 text-white/80 hover:text-white pl-1.5 pr-3 py-1.5 rounded-full shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.97]"
          >
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
              <UserCircle2 className="w-4 h-4 text-white/60" strokeWidth={1.75} />
            </div>
            <span className="text-[13px] font-medium whitespace-nowrap">Staff Sign-in</span>
          </button>
        )}
      </div>

      <KioskAdminOverlay isOpen={adminOverlayOpen} onClose={() => setAdminOverlayOpen(false)} />
      <EmployeePinDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen} kioskType="ocean_view" />
      <StaffSignOutDialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen} kioskType="ocean_view" />

      <OceanViewIdentifierDialog
        open={identifierDialogOpen}
        onOpenChange={setIdentifierDialogOpen}
        onConfirm={handleIdentifierConfirm}
      />
    </div>
  );
}
