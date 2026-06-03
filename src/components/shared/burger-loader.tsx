'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BurgerLoaderProps {
  isLoading: boolean;
  message?: string;
  variant?: 'light' | 'dark';
}

export function BurgerLoader({ isLoading, message, variant = 'light' }: BurgerLoaderProps) {
  if (!isLoading) return null;

  const isDark = variant === 'dark';

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center gap-4',
        'animate-in fade-in duration-200',
        isDark
          ? 'bg-neutral-900/90 backdrop-blur-sm'
          : 'bg-white/90 backdrop-blur-sm'
      )}
    >
      <Image
        src={'/burger-loading-white.gif'}
        alt="Loading…"
        width={120}
        height={120}
        className="object-contain"
        unoptimized
      />
      {message && (
        <div className={cn(
          'px-5 py-2.5 rounded-full',
          isDark ? 'bg-white/10' : 'bg-stone-100'
        )}>
          <p
            className={cn(
              'text-sm font-semibold tracking-wide',
              isDark ? 'text-neutral-200' : 'text-stone-600'
            )}
            style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.03em' }}
          >
            {message}
          </p>
        </div>
      )}
    </div>
  );
}
