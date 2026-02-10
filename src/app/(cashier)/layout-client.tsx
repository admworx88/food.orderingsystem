'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

function LiveClock() {
  const [time, setTime] = useState<{ hours: string; minutes: string; seconds: string; period: string }>({
    hours: '--',
    minutes: '--',
    seconds: '--',
    period: '--',
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const h = hours % 12 || 12;
      const m = now.getMinutes();
      const s = now.getSeconds();

      setTime({
        hours: h.toString().padStart(2, '0'),
        minutes: m.toString().padStart(2, '0'),
        seconds: s.toString().padStart(2, '0'),
        period: hours >= 12 ? 'PM' : 'AM',
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pos-clock flex items-center gap-0.5">
      <span>{time.hours}</span>
      <span className="pos-clock-separator">:</span>
      <span>{time.minutes}</span>
      <span className="pos-clock-separator">:</span>
      <span>{time.seconds}</span>
      <span className="ml-1.5 text-sm opacity-60">{time.period}</span>
    </div>
  );
}

const NAV_ITEMS = [
  { href: '/payments', label: 'Payments' },
  { href: '/reports', label: 'Reports' },
];

interface CashierLayoutClientProps {
  children: React.ReactNode;
  cashierName: string;
}

export function CashierLayoutClient({
  children,
  cashierName,
}: CashierLayoutClientProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col pos-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 pos-header relative">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left: Logo */}
          <div className="flex items-center gap-4">
            <Link href="/payments" className="flex items-center gap-3">
              <div className="pos-logo">TERMINAL</div>
              <span className="text-[var(--pos-text-muted)] text-sm font-medium">
                Point of Sale
              </span>
            </Link>
          </div>

          {/* Center: Navigation */}
          <nav className="pos-nav">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'pos-nav-item',
                  pathname === item.href && 'pos-nav-item-active'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right: Clock & Cashier */}
          <div className="flex items-center gap-5">
            <LiveClock />

            <div className="h-6 w-px bg-[var(--pos-border)]" />

            <div className="pos-cashier-badge">
              <span className="pos-cashier-badge-dot" />
              <User className="w-4 h-4" />
              <span>{cashierName}</span>
            </div>
          </div>
        </div>

        {/* Subtle glow line */}
        <div className="pos-header-glow" />
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
