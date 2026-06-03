'use client';

import { useEffect, useRef, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const RESHOW_AFTER_MS = 30_000;

interface NetworkOfflineDialogProps {
  isOnline: boolean;
  isChecking: boolean;
  onRetry: () => void;
}

export function NetworkOfflineDialog({ isOnline, isChecking, onRetry }: NetworkOfflineDialogProps) {
  const [dismissed, setDismissed] = useState(false);
  const reshowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOnline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(false);
      if (reshowTimerRef.current) clearTimeout(reshowTimerRef.current);
    }
  }, [isOnline]);

  useEffect(() => {
    if (dismissed && !isOnline) {
      reshowTimerRef.current = setTimeout(() => setDismissed(false), RESHOW_AFTER_MS);
    }
    return () => {
      if (reshowTimerRef.current) clearTimeout(reshowTimerRef.current);
    };
  }, [dismissed, isOnline]);

  const visible = !isOnline && !dismissed;
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-50 flex items-center justify-center">
          <WifiOff className="w-8 h-8 text-red-500" strokeWidth={1.75} />
        </div>

        <h2 className="text-xl font-bold text-stone-800 mb-2">No Internet Connection</h2>
        <p className="text-stone-500 text-sm mb-7 leading-relaxed">
          Please check your network connection. Ordering, payments, and order status require an active connection.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onRetry}
            disabled={isChecking}
            className={cn(
              'w-full h-12 rounded-xl font-semibold text-sm transition-all',
              'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-2'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', isChecking && 'animate-spin')} strokeWidth={2} />
            {isChecking ? 'Checking…' : 'Retry Connection'}
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="w-full h-11 rounded-xl font-medium text-sm text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-all"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
