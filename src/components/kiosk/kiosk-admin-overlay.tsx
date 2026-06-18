'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, MapPin, UtensilsCrossed, Waves, RotateCcw, X, ChevronRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKioskLocation } from '@/hooks/use-kiosk-location';
import { useCartStore } from '@/stores/cart-store';
import { validateKioskPin } from '@/services/settings-service';

interface KioskAdminOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'pin' | 'config';

const MAX_ATTEMPTS = 5; // Matches server-side rate limiter in rate-limiter.ts

export function KioskAdminOverlay({ isOpen, onClose }: KioskAdminOverlayProps) {
  const router = useRouter();
  const { location, setLocation } = useKioskLocation();
  const clearCart = useCartStore((state) => state.clearCart);

  const [step, setStep] = useState<Step>('pin');
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep('pin');
      setPin('');
      setAttempts(0);
      setError('');
      setIsSubmitting(false);
      setConfirmReset(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleDigit(digit: string) {
    if (pin.length >= 4) return;
    setPin((prev) => prev + digit);
    setError('');
  }

  function handleBackspace() {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  }

  async function handlePinSubmit() {
    if (pin.length !== 4 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await validateKioskPin(pin);
      if (result.success) {
        setStep('config');
        setPin('');
        setError('');
        setAttempts(0);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin('');
        if (newAttempts >= MAX_ATTEMPTS) {
          onClose();
        } else {
          setError('Incorrect PIN');
        }
      }
    } catch {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');
      if (newAttempts >= MAX_ATTEMPTS) {
        onClose();
      } else {
        setError('Incorrect PIN');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSetLocation(loc: 'restaurant' | 'ocean_view') {
    setLocation(loc);
    window.location.reload();
  }

  function handleResetSession() {
    clearCart();
    localStorage.removeItem('orderflow-cart');
    router.push(location === 'ocean_view' ? '/ocean-view' : '/');
  }

  function handleClose() {
    onClose();
    setStep('pin');
  }

  const remainingAttempts = MAX_ATTEMPTS - attempts;

  return (
    <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-md flex items-center justify-center p-6">

      {/* ── PIN STEP ── */}
      {step === 'pin' && (
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden">
          {/* Header band */}
          <div className="bg-stone-900 px-6 pt-8 pb-6 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-400" strokeWidth={2} />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-white tracking-tight">Staff Access</h2>
              <p className="text-stone-400 text-sm mt-0.5">Enter your 4-digit PIN</p>
            </div>

            {/* PIN dots */}
            <div className="flex gap-3 mt-1" aria-label="PIN entry">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-3 h-3 rounded-full transition-all duration-150',
                    i < pin.length
                      ? 'bg-amber-400 scale-110'
                      : 'bg-stone-600'
                  )}
                />
              ))}
            </div>

            {/* Error / attempts */}
            <div className="min-h-5 text-center">
              {error && (
                <p className="text-red-400 text-xs font-medium">{error}</p>
              )}
              {attempts >= 1 && (
                <p className="text-amber-400/80 text-xs mt-0.5">
                  {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                </p>
              )}
            </div>
          </div>

          {/* Keypad */}
          <div className="p-4 bg-stone-50">
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  className="h-14 rounded-xl bg-white hover:bg-stone-100 active:bg-stone-200 active:scale-95 text-stone-900 text-xl font-semibold transition-all shadow-sm border border-stone-200 cursor-pointer"
                >
                  {digit}
                </button>
              ))}

              {/* Backspace */}
              <button
                type="button"
                onClick={handleBackspace}
                disabled={pin.length === 0}
                aria-label="Backspace"
                className={cn(
                  'h-14 rounded-xl text-lg font-semibold transition-all shadow-sm border cursor-pointer',
                  pin.length === 0
                    ? 'bg-stone-100 text-stone-300 border-stone-100 cursor-not-allowed'
                    : 'bg-white hover:bg-stone-100 active:bg-stone-200 active:scale-95 text-stone-600 border-stone-200'
                )}
              >
                ⌫
              </button>

              {/* 0 */}
              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="h-14 rounded-xl bg-white hover:bg-stone-100 active:bg-stone-200 active:scale-95 text-stone-900 text-xl font-semibold transition-all shadow-sm border border-stone-200 cursor-pointer"
              >
                0
              </button>

              {/* Submit */}
              <button
                type="button"
                onClick={handlePinSubmit}
                disabled={pin.length !== 4 || isSubmitting}
                className={cn(
                  'h-14 rounded-xl text-white text-sm font-bold transition-all shadow-sm cursor-pointer',
                  pin.length === 4 && !isSubmitting
                    ? 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 active:scale-95 shadow-amber-200'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                )}
              >
                {isSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  'OK'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIG PANEL ── */}
      {step === 'config' && (
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden">
          {/* Header */}
          <div className="bg-stone-900 px-6 pt-6 pb-5 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-amber-400" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Kiosk Settings</h2>
                <p className="text-stone-400 text-xs mt-0.5">Device configuration</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-stone-700 hover:bg-stone-600 active:bg-stone-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-stone-300" strokeWidth={2} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">

            {/* Current location pill */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-50 border border-stone-100">
              <MapPin className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" strokeWidth={2} />
              <span className="text-xs text-stone-500 font-medium">Active location:</span>
              {location === 'restaurant' && (
                <span className="ml-auto text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Restaurant
                </span>
              )}
              {location === 'ocean_view' && (
                <span className="ml-auto text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  Ocean View
                </span>
              )}
              {!location && (
                <span className="ml-auto text-xs font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                  Not set
                </span>
              )}
            </div>

            {/* Switch location */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider px-0.5">
                Switch Location
              </p>

              <button
                type="button"
                onClick={() => handleSetLocation('restaurant')}
                disabled={location === 'restaurant'}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all cursor-pointer',
                  location === 'restaurant'
                    ? 'border-stone-200 bg-stone-50 opacity-50 cursor-not-allowed'
                    : 'border-stone-200 bg-white hover:border-stone-900 hover:bg-stone-900 group active:scale-[0.98]'
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                  location === 'restaurant' ? 'bg-stone-100' : 'bg-emerald-50 group-hover:bg-emerald-500/20'
                )}>
                  <UtensilsCrossed className={cn(
                    'w-4 h-4 transition-colors',
                    location === 'restaurant' ? 'text-stone-400' : 'text-emerald-600 group-hover:text-emerald-400'
                  )} strokeWidth={1.75} />
                </div>
                <div className="flex-1 text-left">
                  <p className={cn(
                    'text-sm font-semibold transition-colors',
                    location === 'restaurant' ? 'text-stone-400' : 'text-stone-800 group-hover:text-white'
                  )}>
                    Restaurant
                  </p>
                  <p className={cn(
                    'text-xs transition-colors',
                    location === 'restaurant' ? 'text-stone-300' : 'text-stone-500 group-hover:text-stone-300'
                  )}>
                    Main dining area
                  </p>
                </div>
                {location !== 'restaurant' && (
                  <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-400 flex-shrink-0" strokeWidth={2} />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSetLocation('ocean_view')}
                disabled={location === 'ocean_view'}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all cursor-pointer',
                  location === 'ocean_view'
                    ? 'border-stone-200 bg-stone-50 opacity-50 cursor-not-allowed'
                    : 'border-stone-200 bg-white hover:border-stone-900 hover:bg-stone-900 group active:scale-[0.98]'
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                  location === 'ocean_view' ? 'bg-stone-100' : 'bg-blue-50 group-hover:bg-blue-500/20'
                )}>
                  <Waves className={cn(
                    'w-4 h-4 transition-colors',
                    location === 'ocean_view' ? 'text-stone-400' : 'text-blue-600 group-hover:text-blue-400'
                  )} strokeWidth={1.75} />
                </div>
                <div className="flex-1 text-left">
                  <p className={cn(
                    'text-sm font-semibold transition-colors',
                    location === 'ocean_view' ? 'text-stone-400' : 'text-stone-800 group-hover:text-white'
                  )}>
                    Ocean View
                  </p>
                  <p className={cn(
                    'text-xs transition-colors',
                    location === 'ocean_view' ? 'text-stone-300' : 'text-stone-500 group-hover:text-stone-300'
                  )}>
                    Floating restaurant
                  </p>
                </div>
                {location !== 'ocean_view' && (
                  <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-400 flex-shrink-0" strokeWidth={2} />
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-stone-100" />

            {/* Reset session */}
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 text-sm font-medium transition-all cursor-pointer active:scale-[0.98]"
              >
                <RotateCcw className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                <span>Reset Session</span>
                <span className="ml-auto text-xs text-red-400">Clears cart & returns home</span>
              </button>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-3">
                <p className="text-sm text-red-700 font-medium text-center">
                  Clear cart and return to home screen?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 h-10 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm font-semibold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResetSession}
                    className="flex-1 h-10 rounded-lg bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-sm font-semibold transition-all cursor-pointer"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
