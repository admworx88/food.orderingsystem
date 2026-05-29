'use client';

import { useState, useCallback } from 'react';
import { Key, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { updateStaffPin } from '@/services/user-service';
import { cn } from '@/lib/utils';

interface ResetPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  hasPin: boolean;
}

export function ResetPinDialog({
  open,
  onOpenChange,
  userId,
  userName,
  hasPin,
}: ResetPinDialogProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = useCallback(() => {
    setPin('');
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSave = useCallback(async () => {
    if (pin.length < 4) return;
    setLoading(true);
    try {
      const result = await updateStaffPin(userId, pin);
      if (result.success) {
        toast.success(`PIN updated for ${userName}`);
        handleClose();
      } else {
        toast.error(result.error);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, pin, userName, handleClose]);

  const handleClearPin = useCallback(async () => {
    setLoading(true);
    try {
      const result = await updateStaffPin(userId, null);
      if (result.success) {
        toast.success(`PIN removed for ${userName}`);
        handleClose();
      } else {
        toast.error(result.error);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, userName, handleClose]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && pin.length >= 4) handleSave();
  };

  const canSave = pin.length >= 4 && !loading;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-2xl border-slate-200 p-6">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Key className="w-5 h-5 text-amber-600" strokeWidth={2} />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-slate-800 leading-tight">
                Reset PIN
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                {userName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-2">
          <p className="text-xs text-slate-500 mb-3 text-center">Enter a new 4–6 digit PIN</p>
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
              'w-full h-20 text-5xl font-bold text-center tracking-[0.4em] rounded-xl border',
              'placeholder:text-slate-200 placeholder:tracking-widest placeholder:text-3xl',
              'focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400',
              'border-slate-200 text-slate-800 bg-slate-50'
            )}
          />
          <p className="text-xs text-slate-400 text-center mt-2">
            {pin.length > 0 ? `${pin.length} digit${pin.length !== 1 ? 's' : ''} entered` : 'Digits only'}
          </p>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={cn(
              'w-full h-11 rounded-xl font-semibold text-sm transition-all',
              'bg-amber-500 hover:bg-amber-600 text-white shadow-sm',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none'
            )}
          >
            {loading ? 'Saving…' : 'Save New PIN'}
          </button>

          {hasPin && (
            <button
              onClick={handleClearPin}
              disabled={loading}
              className={cn(
                'w-full h-10 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2',
                'border border-rose-200 text-rose-600 hover:bg-rose-50',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove PIN
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
