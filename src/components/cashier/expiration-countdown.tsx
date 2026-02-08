'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EXPIRATION_THRESHOLDS } from '@/lib/constants/payment-methods';

interface ExpirationCountdownProps {
  expiresAt: string | null;
}

/**
 * Reusable countdown badge showing time remaining before order expires.
 * Green >5min, Yellow 2-5min, Red <2min, EXPIRED badge when past.
 */
export function ExpirationCountdown({ expiresAt }: ExpirationCountdownProps) {
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;

    function update() {
      const remaining = (new Date(expiresAt!).getTime() - Date.now()) / 60_000;
      setMinutesLeft(remaining);
    }

    update();
    const interval = setInterval(update, 10_000); // Update every 10s for smooth countdown
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt || minutesLeft === null) {
    return null;
  }

  if (minutesLeft <= 0) {
    return (
      <Badge variant="destructive" className="animate-pulse font-semibold">
        EXPIRED
      </Badge>
    );
  }

  const minutes = Math.floor(minutesLeft);
  const seconds = Math.floor((minutesLeft - minutes) * 60);

  let colorClass = 'bg-green-100 text-green-800';
  if (minutesLeft <= EXPIRATION_THRESHOLDS.warning) {
    colorClass = 'bg-red-100 text-red-800 animate-pulse';
  } else if (minutesLeft <= EXPIRATION_THRESHOLDS.safe) {
    colorClass = 'bg-yellow-100 text-yellow-800';
  }

  return (
    <Badge variant="outline" className={cn('font-mono text-xs', colorClass)}>
      {minutes}:{seconds.toString().padStart(2, '0')} left
    </Badge>
  );
}
