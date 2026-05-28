'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useKioskLocation } from '@/hooks/use-kiosk-location';
import { useCartStore } from '@/stores/cart-store';
import { validateKioskPin } from '@/services/settings-service';

interface KioskAdminOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'pin' | 'config';

const MAX_ATTEMPTS = 3;

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

  // Reset all state when overlay closes
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

  // --- PIN step handlers ---

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

  // --- Config step handlers ---

  function handleSetLocation(loc: 'restaurant' | 'ocean_view') {
    setLocation(loc);
    window.location.reload();
  }

  function handleResetSession() {
    clearCart();
    localStorage.clear();
    router.push('/');
  }

  function handleClose() {
    onClose();
    setStep('pin');
  }

  const remainingAttempts = MAX_ATTEMPTS - attempts;

  // --- Render ---

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      {step === 'pin' ? (
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-6">
          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900">Staff Access</h2>

          {/* PIN dots */}
          <div className="flex gap-4" aria-label="PIN entry">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-4 h-4 rounded-full border-2 transition-colors',
                  i < pin.length
                    ? 'bg-amber-500 border-amber-500'
                    : 'bg-transparent border-gray-400'
                )}
              />
            ))}
          </div>

          {/* Error / attempts warning */}
          <div className="min-h-6 text-center">
            {error && (
              <p className="text-red-500 text-sm font-medium">{error}</p>
            )}
            {attempts >= 1 && !error && (
              <p className="text-amber-600 text-sm font-medium">
                {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
              </p>
            )}
            {attempts >= 1 && error && (
              <p className="text-amber-600 text-sm font-medium mt-1">
                {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
              </p>
            )}
          </div>

          {/* Numeric keypad */}
          <div className="grid grid-cols-3 gap-3 w-full">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                className="min-h-16 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 text-2xl font-semibold transition-colors"
              >
                {digit}
              </button>
            ))}

            {/* Backspace */}
            <button
              type="button"
              onClick={handleBackspace}
              disabled={pin.length === 0}
              className={cn(
                'min-h-16 rounded-xl text-xl font-semibold transition-colors',
                pin.length === 0
                  ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                  : 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700'
              )}
              aria-label="Backspace"
            >
              ⌫
            </button>

            {/* 0 */}
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="min-h-16 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 text-2xl font-semibold transition-colors"
            >
              0
            </button>

            {/* Submit */}
            <button
              type="button"
              onClick={handlePinSubmit}
              disabled={pin.length !== 4 || isSubmitting}
              className={cn(
                'min-h-16 rounded-xl text-white text-lg font-semibold transition-colors',
                pin.length === 4 && !isSubmitting
                  ? 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700'
                  : 'bg-amber-300 cursor-not-allowed opacity-60'
              )}
            >
              {isSubmitting ? '...' : 'OK'}
            </button>
          </div>
        </div>
      ) : (
        /* Config panel */
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col gap-6">
          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 text-center">Kiosk Settings</h2>

          {/* Current location badge */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">
              Current Location
            </p>
            {location === 'restaurant' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold">
                Restaurant
              </span>
            )}
            {location === 'ocean_view' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
                Ocean View
              </span>
            )}
            {location === null && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-sm font-medium">
                Not set
              </span>
            )}
          </div>

          {/* Switch location */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-gray-700">Switch Location</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleSetLocation('restaurant')}
                disabled={location === 'restaurant'}
                className={cn(
                  'flex-1 min-h-12 rounded-xl text-sm font-semibold transition-colors',
                  location === 'restaurant'
                    ? 'bg-green-100 text-green-400 opacity-50 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white'
                )}
              >
                Set to Restaurant
              </button>
              <button
                type="button"
                onClick={() => handleSetLocation('ocean_view')}
                disabled={location === 'ocean_view'}
                className={cn(
                  'flex-1 min-h-12 rounded-xl text-sm font-semibold transition-colors',
                  location === 'ocean_view'
                    ? 'bg-blue-100 text-blue-400 opacity-50 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white'
                )}
              >
                Set to Ocean View
              </button>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-gray-200" />

          {/* Reset session */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-gray-700">Session</p>
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="w-full min-h-12 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-sm font-semibold transition-colors"
              >
                Reset Session
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-red-600 font-medium text-center">
                  Are you sure? This will clear the cart and return to the home screen.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 min-h-12 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResetSession}
                    className="flex-1 min-h-12 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-sm font-semibold transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={handleClose}
            className="w-full min-h-12 rounded-xl border-2 border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-700 text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
