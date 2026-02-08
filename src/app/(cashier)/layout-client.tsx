'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

function LiveClock() {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono text-lg font-semibold tabular-nums">
      {time || '--:--:--'}
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
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left: Title */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-blue-700">POS</h1>
            <span className="text-sm text-muted-foreground">Point of Sale</span>
          </div>

          {/* Center: Navigation */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-muted-foreground hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right: Clock & Cashier */}
          <div className="flex items-center gap-4">
            <LiveClock />
            <div className="rounded-md bg-gray-100 px-3 py-1.5 text-sm">
              {cashierName}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
