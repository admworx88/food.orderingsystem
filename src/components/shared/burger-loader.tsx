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
        src={isDark ? '/burger-loading-white.gif' : '/burger-loading.gif'}
        alt="Loading…"
        width={120}
        height={120}
        className="object-contain drop-shadow-md"
        unoptimized
      />
      {message && (
        <p
          className={cn(
            'text-sm font-medium',
            isDark ? 'text-neutral-200' : 'text-neutral-600'
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
