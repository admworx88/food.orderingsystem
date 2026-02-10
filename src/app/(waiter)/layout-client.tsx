'use client';

import { useState, useEffect, useSyncExternalStore, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Volume2, VolumeX, User } from 'lucide-react';

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

/**
 * Diamond icon mark - elegant brand element
 */
function DiamondMark() {
  return (
    <svg
      className="waiter-diamond"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}

function LiveClock() {
  const [time, setTime] = useState<{ main: string; ampm: string }>({
    main: '',
    ampm: '',
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      // Split time and AM/PM
      const [main, ampm] = timeStr.split(' ');
      setTime({ main: main || '--:--', ampm: ampm || '' });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="waiter-clock">
      {time.main}
      <span className="waiter-clock-ampm">{time.ampm}</span>
    </div>
  );
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

  const toggleSound = () => {
    const newValue = !soundEnabled;
    localStorage.setItem(STORAGE_KEY, String(newValue));
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('waiter-sound-change'));
  };

  return (
    <div className="flex min-h-screen flex-col waiter-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 waiter-header">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left: Brand */}
          <Link href="/service" className="group">
            <h1
              className="text-xl font-semibold tracking-tight flex items-center gap-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              <DiamondMark />
              <span>Service Station</span>
            </h1>
          </Link>

          {/* Right: Sound Toggle, Clock & Waiter Badge */}
          <div className="flex items-center gap-4">
            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className={cn(
                'waiter-sound-toggle',
                soundEnabled && 'waiter-sound-toggle-on'
              )}
              aria-label={soundEnabled ? 'Mute notifications' : 'Enable notifications'}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              <span className="hidden sm:inline text-sm">
                {soundEnabled ? 'Sound On' : 'Sound Off'}
              </span>
            </button>

            {/* Divider */}
            <div className="h-8 w-px bg-[var(--waiter-border)]" />

            {/* Clock */}
            <LiveClock />

            {/* Waiter Badge */}
            <div className="waiter-badge">
              <User className="h-4 w-4" />
              <span>{waiterName}</span>
            </div>
          </div>
        </div>

        {/* Subtle gold-tinted border */}
        <div className="waiter-header-border" />
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
