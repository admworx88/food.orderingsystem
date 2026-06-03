'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, Delete } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { resolveStaffPin, type KioskType } from '@/services/user-service';
import { useStaffSessionStore, type StaffRole } from '@/stores/staff-session-store';
import { cn } from '@/lib/utils';
import { BurgerLoader } from '@/components/shared/burger-loader';

const MAX_ATTEMPTS = 3;

interface EmployeePinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kioskType: KioskType;
}

export function EmployeePinDialog({ open, onOpenChange, kioskType }: EmployeePinDialogProps) {
  const router = useRouter();
  const setSession = useStaffSessionStore((s) => s.setSession);

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleClose = useCallback(() => {
    setPin('');
    setError('');
    setAttempts(0);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = async () => {
    if (pin.length < 4 || loading) return;
    setLoading(true);
    setError('');

    const result = await resolveStaffPin(pin, kioskType);

    if (result.success) {
      setSession({
        id: result.data.id,
        full_name: result.data.full_name,
        role: result.data.role as StaffRole,
        kioskType,
      });
      handleClose();
      if (result.data.role === 'kitchen') {
        router.push('/orders');
      }
    } else {
      const next = attempts + 1;
      setAttempts(next);
      setPin('');
      if (next >= MAX_ATTEMPTS) {
        handleClose();
      } else {
        setError(`${result.error} (${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next !== 1 ? 's' : ''} left)`);
      }
    }

    setLoading(false);
  };

  const handleNumPad = useCallback((digit: string) => {
    if (pin.length >= 6 || loading) return;
    setError('');
    setPin((prev) => prev + digit);
  }, [pin, loading]);

  const handleBackspace = useCallback(() => {
    setError('');
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const pinDots = Array.from({ length: 6 }, (_, i) => i < pin.length);

  return (
    <>
    <BurgerLoader isLoading={loading} message="Signing in…" />
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-3xl border-orange-100/60 bg-[#FEF7EE] p-6">
        <DialogHeader className="items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center mb-2">
            <User className="w-7 h-7 text-orange-500" strokeWidth={1.75} />
          </div>
          <DialogTitle className="text-xl font-bold text-stone-800">
            Employee Sign-In
          </DialogTitle>
          <DialogDescription className="text-sm text-stone-500">
            Enter your 4–6 digit PIN
          </DialogDescription>
        </DialogHeader>

        {/* PIN dots */}
        <div className="flex items-center justify-center gap-3 mt-4">
          {pinDots.map((filled, i) => (
            <div
              key={i}
              className={cn(
                'w-3.5 h-3.5 rounded-full transition-all duration-150',
                filled ? 'bg-orange-500 scale-110' : 'bg-stone-200'
              )}
            />
          ))}
        </div>

        {/* Error */}
        <div className="h-5 flex items-center justify-center">
          {error && <p className="text-xs text-rose-500 text-center">{error}</p>}
        </div>

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-2">
          {['1','2','3','4','5','6','7','8','9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleNumPad(digit)}
              disabled={loading}
              className="h-13 py-3.5 rounded-xl bg-white hover:bg-orange-50 active:bg-orange-100 active:scale-95 text-xl font-bold text-stone-800 transition-all duration-100 border border-stone-200 shadow-sm disabled:opacity-40"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleBackspace}
            disabled={loading}
            className="h-13 py-3.5 rounded-xl bg-white hover:bg-red-50 active:bg-red-100 active:scale-95 transition-all duration-100 border border-stone-200 shadow-sm flex items-center justify-center disabled:opacity-40"
            aria-label="Backspace"
          >
            <Delete className="w-5 h-5 text-stone-500" strokeWidth={2} />
          </button>
          <button
            onClick={() => handleNumPad('0')}
            disabled={loading}
            className="h-13 py-3.5 rounded-xl bg-white hover:bg-orange-50 active:bg-orange-100 active:scale-95 text-xl font-bold text-stone-800 transition-all duration-100 border border-stone-200 shadow-sm disabled:opacity-40"
          >
            0
          </button>
          <div />
        </div>

        <button
          onClick={handleSubmit}
          disabled={pin.length < 4 || loading}
          className={cn(
            'mt-3 w-full h-13 py-3.5 rounded-2xl font-bold text-base transition-all',
            'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none'
          )}
        >
          Sign In
        </button>
      </DialogContent>
    </Dialog>
    </>
  );
}
