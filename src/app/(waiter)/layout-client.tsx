'use client';

import { useSyncExternalStore, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Volume2, VolumeX, User, UtensilsCrossed, ClipboardList, CreditCard, BellRing } from 'lucide-react';
import { FullscreenToggle } from '@/components/shared/fullscreen-toggle';
import { useStaffSessionStore } from '@/stores/staff-session-store';

const BASE_NAV = [
  { icon: UtensilsCrossed, label: 'Menu',     href: '/menu' },
  { icon: ClipboardList,   label: 'Orders',   href: '/service' },
];
const PAYMENTS_NAV = { icon: CreditCard, label: 'Payments', href: '/menu?view=payments' };

const STORAGE_KEY = 'waiter-sound-enabled';

// Custom hook for localStorage with SSR support
function useWaiterSoundPreference() {
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return 'true';
    return localStorage.getItem(STORAGE_KEY) ?? 'true';
  }, []);

  const getServerSnapshot = useCallback(() => 'true', []);

  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener('storage', callback);
    // Also listen for custom events for same-tab updates
    window.addEventListener('waiter-sound-change', callback);
    return () => {
      window.removeEventListener('storage', callback);
      window.removeEventListener('waiter-sound-change', callback);
    };
  }, []);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return value === 'true';
}

interface WaiterLayoutClientProps {
  children: React.ReactNode;
  waiterName: string;
}

export function WaiterLayoutClient({
  children,
  waiterName,
}: WaiterLayoutClientProps) {
  const soundEnabled = useWaiterSoundPreference();
  const pathname = usePathname();
  const staffRole = useStaffSessionStore((s) => s.session?.role);
  const staffName = useStaffSessionStore((s) => s.session?.full_name);

  const navItems = (staffRole === 'cashier' || staffRole === 'admin')
    ? [...BASE_NAV, PAYMENTS_NAV]
    : BASE_NAV;

  const toggleSound = () => {
    const newValue = !soundEnabled;
    localStorage.setItem(STORAGE_KEY, String(newValue));
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('waiter-sound-change'));
  };

  return (
    <div className="flex flex-col min-h-screen waiter-bg">
      {/* ── Header — Arena Blanca kiosk style ── */}
      <header className="sticky top-0 z-50 flex-shrink-0 h-14 sm:h-16 md:h-[72px] px-3 sm:px-4 md:px-6 flex items-center justify-between bg-[#FEF7EE] border-b border-orange-100/40">
        {/* Left: Logo & Brand */}
        <Link href="/service" className="flex items-center gap-2 sm:gap-3 active:scale-[0.98] transition-transform">
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
            <p className="text-[10px] sm:text-xs text-stone-400 font-medium hidden sm:block">Service Station</p>
          </div>
        </Link>

        {/* Right: Sound Toggle, Fullscreen, Staff Badge */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={toggleSound}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-stone-500 hover:text-stone-700 hover:bg-stone-100 active:bg-stone-200 transition-colors"
            aria-label={soundEnabled ? 'Mute notifications' : 'Enable notifications'}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {soundEnabled ? 'Sound On' : 'Sound Off'}
            </span>
          </button>

          <FullscreenToggle variant="header" />

          <div className="hidden sm:block w-px h-5 sm:h-6 bg-stone-200" />

          <div className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-stone-600">
            <User className="h-4 w-4 text-stone-400" />
            <span>{staffName?.split(' ')[0] ?? waiterName}</span>
          </div>
        </div>
      </header>

      {/* ── Below header: sidebar + content row ── */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar nav */}
        <nav className="w-[76px] flex-shrink-0 flex flex-col items-center pt-3 pb-3" style={{ background: '#1A3D2B' }}>
          <div className="flex flex-col items-center gap-1 w-full px-2">
            {navItems.map(({ icon: Icon, label, href }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={label}
                  href={href}
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-1 w-full py-2.5 rounded-xl transition-all duration-200',
                    isActive ? 'bg-white/[0.13]' : 'hover:bg-white/[0.06] active:bg-white/[0.10]'
                  )}
                  aria-label={label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-orange-400 rounded-r-full" />
                  )}
                  <Icon
                    className={cn('w-5 h-5 transition-colors duration-200', isActive ? 'text-orange-400' : 'text-white/70')}
                    strokeWidth={isActive ? 2 : 1.75}
                  />
                  <span className={cn(
                    'text-[9px] font-semibold leading-none tracking-wide transition-colors duration-200',
                    isActive ? 'text-orange-400' : 'text-white/55'
                  )}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="flex-1" />
          <div className="w-8 h-px bg-white/[0.12] mb-2" />

          {/* Staff name — pinned bottom */}
          <div className="w-full px-2">
            <div className="flex flex-col items-center justify-center gap-1 w-full py-2.5 rounded-xl">
              <BellRing className="w-5 h-5 text-white/55" strokeWidth={1.75} />
              <span className="text-[9px] font-semibold leading-none text-orange-400 tracking-wide whitespace-nowrap max-w-[52px] truncate">
                {(staffName ?? waiterName).split(' ')[0]}
              </span>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
