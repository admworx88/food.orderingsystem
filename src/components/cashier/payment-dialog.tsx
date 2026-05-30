'use client';

import { MapPin, X } from 'lucide-react';
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
  onPaymentComplete: (methodOrId: string, amountTendered?: number) => void;
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
  if (!order) return null;

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
                #{order.order_number}
              </span>
              <span className="text-[13px] text-[var(--pos-text-muted)]">
                {ORDER_TYPE_LABELS[order.order_type] || order.order_type}
              </span>
              {(order.table_number || order.room_number) && (
                <span className="flex items-center gap-1 text-[13px] text-[var(--pos-text-muted)]">
                  <MapPin className="w-3.5 h-3.5" />
                  {order.table_number
                    ? `Table ${order.table_number}`
                    : `Room ${order.room_number}`}
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
                {formatCurrency(order.total_amount)}
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
              orderId={order.id}
              subtotal={order.subtotal}
              currentDiscount={order.discount_amount || 0}
              onDiscountApplied={onDiscountApplied}
            />
          </div>

          {/* Right: Payment form */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <PaymentForm
              order={order}
              onPaymentComplete={(methodOrId, amountTendered) => {
                onPaymentComplete(methodOrId, amountTendered);
                onClose();
              }}
              isPayMongoEnabled={isPayMongoEnabled}
              cashierId={cashierId}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
