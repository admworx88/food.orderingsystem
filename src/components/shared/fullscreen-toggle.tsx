'use client';

import { useEffect, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface FullscreenToggleProps {
  /** Visual variant: 'header' for kiosk header, 'welcome' for kiosk labeled pill, 'staff' for staff module headers */
  variant?: 'header' | 'welcome' | 'staff';
  className?: string;
}

export function FullscreenToggle({ variant = 'header', className }: FullscreenToggleProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleChange);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing browser fullscreen state with React
    setIsFullscreen(!!document.fullscreenElement);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const toggle = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen not supported or blocked by browser policy
    }
  };

  const Icon = isFullscreen ? Minimize : Maximize;
  const label = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';

  if (variant === 'welcome') {
    return (
      <button
        onClick={toggle}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
          'bg-white/60 backdrop-blur-sm border border-stone-200/50',
          'text-stone-400 hover:text-stone-600 hover:bg-white/80',
          'text-[11px] sm:text-xs font-medium',
          'active:scale-95 transition-all',
          className,
        )}
        aria-label={label}
        title={label}
      >
        <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2} />
        <span>{label}</span>
      </button>
    );
  }

  if (variant === 'staff') {
    return (
      <button
        onClick={toggle}
        className={cn(
          'waiter-sound-toggle',
          className,
        )}
        aria-label={label}
        title={label}
      >
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline text-sm">{label}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        'w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg',
        'bg-stone-100 hover:bg-stone-200 active:scale-95 transition-all',
        'text-stone-500 hover:text-stone-700',
        className,
      )}
      aria-label={label}
      title={label}
    >
      <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2} />
    </button>
  );
}
