'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { resolveStaffPin } from '@/services/user-service';
import { useStaffSessionStore, type StaffRole } from '@/stores/staff-session-store';
import { cn } from '@/lib/utils';

const MAX_ATTEMPTS = 3;

interface EmployeePinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeePinDialog({ open, onOpenChange }: EmployeePinDialogProps) {
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

  const handleSubmit = useCallback(async () => {
    if (pin.length < 4 || loading) return;
    setLoading(true);
    setError('');

    const result = await resolveStaffPin(pin);

    if (result.success) {
      setSession({
        id: result.data.id,
        full_name: result.data.full_name,
        role: result.data.role as StaffRole,
      });
      handleClose();
      if (result.data.role === 'kitchen') {
        router.push('/kitchen/orders');
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
  }, [pin, loading, attempts, setSession, handleClose, router]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-3xl border-orange-100/60 bg-[#FEF7EE] p-8">
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

        <div className="mt-4">
          <input
            type="password"
            inputMode="numeric"
            pattern="\d*"
            maxLength={6}
            value={pin}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="• • • •"
            autoFocus
            className={cn(
              'w-full h-24 text-6xl font-bold text-center tracking-[0.5em] rounded-2xl border bg-white',
              'placeholder:text-stone-200 placeholder:tracking-widest placeholder:text-4xl',
              'focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400',
              error ? 'border-rose-300' : 'border-stone-200'
            )}
          />
          {error && (
            <p className="text-xs text-rose-500 text-center mt-2">{error}</p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={pin.length < 4 || loading}
          className={cn(
            'mt-4 w-full h-14 rounded-2xl font-bold text-base transition-all',
            'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none'
          )}
        >
          {loading ? 'Verifying…' : 'Sign In'}
        </button>
      </DialogContent>
    </Dialog>
  );
}
