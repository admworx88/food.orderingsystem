'use client';

import { useState } from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { voidBill } from '@/services/payment-service';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import type { CashierOrder } from '@/types/payment';

interface VoidBillDialogProps {
  order: CashierOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onVoided: () => void;
  cashierId: string;
  cashierName: string;
}

export function VoidBillDialog({
  order,
  isOpen,
  onClose,
  onVoided,
  cashierId,
  cashierName,
}: VoidBillDialogProps) {
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !order) return null;

  const canSubmit = pin.length >= 4 && reason.trim().length >= 5 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    const result = await voidBill({
      orderId: order.id,
      cashierPin: pin,
      voidReason: reason.trim(),
      cashierId,
      cashierName,
    });
    setIsSubmitting(false);

    if (result.success) {
      toast.success(`Order #${order.order_number} voided`);
      setPin('');
      setReason('');
      onVoided();
    } else {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to void bill');
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setPin('');
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-red-900/50 rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-white/[0.08]">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-red-400" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100">Void Bill</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Order #{order.order_number} · {formatCurrency(order.total_amount)}
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="mx-5 mt-4 flex items-start gap-2.5 px-3.5 py-3 bg-red-500/10 rounded-xl border border-red-800/40">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-xs text-red-300 leading-relaxed">
            This is permanent and will cancel the order. The action will be recorded in the audit log.
          </p>
        </div>

        {/* Fields */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Your PIN <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter your PIN"
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-white/[0.1] rounded-xl text-zinc-100 placeholder:text-zinc-600 text-sm focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30 tracking-widest"
              disabled={isSubmitting}
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Void Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the reason for voiding this bill…"
              rows={3}
              maxLength={300}
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-white/[0.1] rounded-xl text-zinc-100 placeholder:text-zinc-600 text-sm focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30 resize-none"
              disabled={isSubmitting}
            />
            <p className="text-[11px] text-zinc-600 mt-1 text-right">{reason.length}/300</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 h-11 rounded-xl border border-white/[0.1] bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'flex-1 h-11 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2',
              'bg-red-600 hover:bg-red-500 text-white',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <XCircle className="w-4 h-4" strokeWidth={2.5} />
                Void Bill
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
