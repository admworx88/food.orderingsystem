'use client';

import { useState, useCallback } from 'react';
import { X, UserCircle2, Delete, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveStaffPin, clearKioskSession } from '@/services/user-service';
import { useStaffSessionStore } from '@/stores/staff-session-store';
import type { KioskType } from '@/services/user-service';

interface StaffSignOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kioskType: KioskType;
}

export function StaffSignOutDialog({ open, onOpenChange, kioskType }: StaffSignOutDialogProps) {
  const { session, clearSession } = useStaffSessionStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = useCallback(() => {
    setPin('');
    setError('');
    setLoading(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleNumPad = useCallback((digit: string) => {
    if (pin.length >= 6) return;
    setPin((prev) => prev + digit);
    setError('');
  }, [pin]);

  const handleBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!session || pin.length < 4 || loading) return;
    setLoading(true);
    setError('');

    const result = await resolveStaffPin(pin, kioskType);

    if (!result.success) {
      setError('Incorrect PIN. Please try again.');
      setPin('');
      setLoading(false);
      return;
    }

    if (result.data.id !== session.id) {
      setError("PIN doesn't match the signed-in employee.");
      setPin('');
      setLoading(false);
      return;
    }

    await clearKioskSession(session.id);
    clearSession();
    handleClose();
  }, [session, pin, loading, kioskType, clearSession, handleClose]);

  if (!open || !session) return null;

  const pinDots = Array.from({ length: 6 }, (_, i) => i < pin.length);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.60)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in">

        {/* Top accent */}
        <div className="h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400" />

        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-stone-500" strokeWidth={2} />
        </button>

        <div className="px-6 pt-6 pb-7">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-3">
              <UserCircle2 className="w-8 h-8 text-orange-500" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-stone-800">Sign Out?</h2>
            <p className="text-sm text-stone-500 mt-1">
              Signing out as <span className="font-semibold text-stone-700">{session.full_name}</span>
            </p>
            <p className="text-xs text-stone-400 mt-1">Enter your PIN to confirm.</p>
          </div>

          {/* PIN dots */}
          <div className="flex items-center justify-center gap-3 mb-1">
            {pinDots.map((filled, i) => (
              <div
                key={i}
                className={cn(
                  'w-3 h-3 rounded-full transition-all duration-150',
                  filled ? 'bg-orange-500 scale-110' : 'bg-stone-200'
                )}
              />
            ))}
          </div>

          {/* Error */}
          <div className="h-5 flex items-center justify-center mb-3">
            {error && (
              <p className="text-xs text-red-500 font-medium text-center">{error}</p>
            )}
          </div>

          {/* Number pad */}
          <div className="grid grid-cols-3 gap-2">
            {['1','2','3','4','5','6','7','8','9'].map((digit) => (
              <button
                key={digit}
                onClick={() => handleNumPad(digit)}
                disabled={loading}
                className="h-12 rounded-xl bg-stone-100 hover:bg-orange-50 active:bg-orange-100 active:scale-95 text-xl font-bold text-stone-800 transition-all duration-100 border border-stone-200 disabled:opacity-40"
              >
                {digit}
              </button>
            ))}
            <button
              onClick={handleBackspace}
              disabled={loading}
              className="h-12 rounded-xl bg-stone-100 hover:bg-red-50 active:bg-red-100 active:scale-95 transition-all duration-100 border border-stone-200 flex items-center justify-center disabled:opacity-40"
              aria-label="Backspace"
            >
              <Delete className="w-5 h-5 text-stone-500" strokeWidth={2} />
            </button>
            <button
              onClick={() => handleNumPad('0')}
              disabled={loading}
              className="h-12 rounded-xl bg-stone-100 hover:bg-orange-50 active:bg-orange-100 active:scale-95 text-xl font-bold text-stone-800 transition-all duration-100 border border-stone-200 disabled:opacity-40"
            >
              0
            </button>
            <div />
          </div>

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={pin.length < 4 || loading}
            className={cn(
              'mt-4 w-full h-12 flex items-center justify-center gap-2 rounded-xl text-base font-bold transition-all duration-200 active:scale-[0.98]',
              pin.length >= 4 && !loading
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/25'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            )}
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogOut className="w-4 h-4" strokeWidth={2} />
                Confirm Sign Out
              </>
            )}
          </button>

          {/* Cancel */}
          <button
            onClick={handleClose}
            disabled={loading}
            className="mt-2 w-full h-10 text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
