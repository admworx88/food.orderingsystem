'use client';

import { useState, useCallback, useEffect } from 'react';
import { MapPin, X, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DiscountSelector } from './discount-selector';
import { PaymentForm } from './payment-form';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import type { CashierOrder } from '@/types/payment';

interface PaymentDialogProps {
  order: CashierOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: (methodOrId: string, amountTendered?: number) => Promise<boolean>;
  onDiscountApplied: () => void;
  isPayMongoEnabled: boolean;
  cashierId: string;
  kioskTheme?: boolean;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Dine-in',
  room_service: 'Room Service',
  takeout: 'Takeout',
  ocean_view: 'Ocean View',
};

export function PaymentDialog({
  order,
  isOpen,
  onClose,
  onPaymentComplete,
  onDiscountApplied,
  isPayMongoEnabled,
  cashierId,
  kioskTheme,
}: PaymentDialogProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const [paidOrder, setPaidOrder] = useState<CashierOrder | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSuccess(false);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPaidOrder(null);
    }
  }, [isOpen]);

  const handlePaymentProcess = useCallback(async (methodOrId: string, amountTendered?: number) => {
    if (!order) return;
    // Snapshot the order NOW (before realtime removes it from the queue)
    const snapshot = order;
    const success = await onPaymentComplete(methodOrId, amountTendered);
    if (success) {
      setPaidOrder(snapshot);
      setIsSuccess(true);
    }
  }, [onPaymentComplete, order]);

  if (!order && !isSuccess) return null;

  const displayOrder = order ?? paidOrder;
  if (!displayOrder) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'max-w-[980px] sm:max-w-[980px] w-full p-0 border-[var(--pos-border)] bg-[var(--pos-surface)] overflow-hidden gap-0 rounded-2xl flex flex-col max-h-[92vh]',
          kioskTheme && 'kiosk-payment-override shadow-2xl'
        )}
      >
        <DialogTitle className="sr-only">Process Payment</DialogTitle>
        <DialogDescription className="sr-only">Process payment for the selected order.</DialogDescription>
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-5 py-3 bg-[linear-gradient(135deg,var(--pos-elevated)_0%,var(--pos-surface)_100%)]"
          style={{ borderTop: '3px solid var(--pos-mint)', borderBottom: '1px solid var(--pos-border)' }}
        >
          <div>
            <p className="text-[11px] font-bold text-[var(--pos-text-muted)] uppercase tracking-[0.12em] mb-1">
              Process Payment
            </p>
            <div className="flex items-center gap-2.5">
              <span className="font-['JetBrains_Mono',monospace] text-xl font-black text-[var(--pos-mint)]">
                #{displayOrder.order_number}
              </span>
              <span className="text-[13px] text-[var(--pos-text-muted)]">
                {ORDER_TYPE_LABELS[displayOrder.order_type] || displayOrder.order_type}
              </span>
              {(displayOrder.table_number || displayOrder.room_number) && (
                <span className="flex items-center gap-1 text-[13px] text-[var(--pos-text-muted)]">
                  <MapPin className="w-3.5 h-3.5" />
                  {displayOrder.table_number
                    ? `Table ${displayOrder.table_number}`
                    : `Room ${displayOrder.room_number}`}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-[10px] font-semibold text-[var(--pos-text-muted)] uppercase tracking-wider mb-0.5">
                Total Due
              </p>
              <p
                className="font-['JetBrains_Mono',monospace] text-2xl font-black text-[var(--pos-mint)]"
                style={{ textShadow: '0 0 20px var(--pos-mint-glow)' }}
              >
                {formatCurrency(displayOrder.total_amount)}
              </p>
            </div>
            <button
              aria-label="Close payment dialog"
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--pos-card)] border border-[var(--pos-border)] text-[var(--pos-text-muted)] hover:text-[var(--pos-text)] hover:border-[var(--pos-border-bright)] transition-all duration-150 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body: two columns */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: Discount selector */}
          <div
            className="w-[270px] flex-shrink-0 overflow-y-auto p-5 bg-[var(--pos-base)]"
            style={{ borderRight: '1px solid var(--pos-border)' }}
          >
            <DiscountSelector
              orderId={displayOrder.id}
              subtotal={displayOrder.subtotal}
              currentDiscount={displayOrder.discount_amount || 0}
              onDiscountApplied={onDiscountApplied}
            />
          </div>

          {/* Right: Payment form */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <PaymentForm
              order={displayOrder}
              onPaymentComplete={handlePaymentProcess}
              isPayMongoEnabled={isPayMongoEnabled}
              cashierId={cashierId}
            />
          </div>
        </div>

        {/* Success overlay — paidOrder snapshot freezes amount at payment time */}
        {isSuccess && paidOrder && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.97)' }}>
            <div className="flex flex-col items-center gap-5 px-10 py-10 text-center max-w-sm w-full">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-11 h-11 text-emerald-600" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-stone-900">Payment Successful!</h2>
                <p className="text-stone-500 mt-1 text-sm">Order #{paidOrder.order_number}</p>
              </div>
              <div className="bg-stone-50 rounded-2xl px-8 py-4 border border-stone-100 w-full">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Amount Paid</p>
                <p
                  className="text-3xl font-black text-emerald-600"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {formatCurrency(paidOrder.total_amount)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all duration-200 active:scale-[0.97] text-lg"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
