'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { verifyAdminPin } from '@/services/payment-service';

interface KioskPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const MAX_ATTEMPTS = 5; // Matches server-side rate limiter in rate-limiter.ts

export function KioskPinDialog({
  open,
  onOpenChange,
  onSuccess,
}: KioskPinDialogProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setPin('');
    setError('');
    setAttempts(0);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleVerify = useCallback(async () => {
    if (!pin.trim() || isVerifying) return;
    setIsVerifying(true);
    setError('');

    try {
      const result = await verifyAdminPin(pin);
      if (result.success) {
        setPin('');
        setAttempts(0);
        onOpenChange(false);
        onSuccess();
      } else {
        const next = attempts + 1;
        setAttempts(next);
        setPin('');
        if (next >= MAX_ATTEMPTS) {
          handleClose();
        } else {
          setError(
            `Incorrect PIN. ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next === 1 ? '' : 's'} remaining.`
          );
          inputRef.current?.focus();
        }
      }
    } finally {
      setIsVerifying(false);
    }
  }, [pin, attempts, isVerifying, onOpenChange, onSuccess, handleClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleVerify();
    },
    [handleVerify]
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-2xl p-8">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl font-bold text-stone-800">
            Admin PIN Required
          </DialogTitle>
          <DialogDescription className="text-stone-500">
            Enter your admin PIN to change kiosk location
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="••••"
            autoFocus
            className={cn(
              'w-full h-20 text-5xl font-bold text-center rounded-xl border-2 outline-none transition-colors tracking-widest',
              'placeholder:text-stone-300 placeholder:text-2xl placeholder:font-normal',
              error
                ? 'border-red-400 focus:border-red-500'
                : 'border-stone-300 focus:border-amber-500'
            )}
          />
          {error && (
            <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
          )}
        </div>

        <button
          onClick={handleVerify}
          disabled={!pin.trim() || isVerifying}
          className={cn(
            'mt-4 w-full h-14 rounded-xl font-bold text-base transition-all',
            'bg-amber-500 bg-gradient-to-r from-amber-500 to-amber-600 text-white',
            'shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
            'hover:scale-[1.02] active:scale-[0.98]',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100'
          )}
        >
          {isVerifying ? 'Verifying…' : 'Verify PIN'}
        </button>
      </DialogContent>
    </Dialog>
  );
}
