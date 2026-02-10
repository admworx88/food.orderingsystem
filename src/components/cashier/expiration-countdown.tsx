'use client';

import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EXPIRATION_THRESHOLDS } from '@/lib/constants/payment-methods';

interface ExpirationCountdownProps {
  expiresAt: string | null;
}

/**
 * Countdown timer - Terminal Command Center theme
 * Mint >5min, Amber 2-5min, Red <2min, EXPIRED when past
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
    const interval = setInterval(update, 1_000); // Update every second for smooth countdown
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt || minutesLeft === null) {
    return null;
  }

  if (minutesLeft <= 0) {
    return (
      <span className="pos-timer pos-timer-expired">
        <AlertTriangle className="w-3 h-3" />
        EXPIRED
      </span>
    );
  }

  const minutes = Math.floor(minutesLeft);
  const seconds = Math.floor((minutesLeft - minutes) * 60);

  const isWarning = minutesLeft <= EXPIRATION_THRESHOLDS.warning;
  const isCaution = minutesLeft <= EXPIRATION_THRESHOLDS.safe && !isWarning;

  return (
    <span className={cn(
      'pos-timer',
      isWarning && 'pos-timer-warning',
      isCaution && 'pos-timer-caution',
      !isWarning && !isCaution && 'pos-timer-safe'
    )}>
      <Clock className="w-3 h-3" />
      {minutes}:{seconds.toString().padStart(2, '0')}
    </span>
  );
}
