'use client';

import { useState } from 'react';
import { Receipt, Printer, User } from 'lucide-react';
import { ReceiptPreview } from './receipt-preview';
import { generateBIRReceipt } from '@/services/bir-service';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import type { RecentOrder, BIRReceiptData } from '@/types/payment';

interface RecentOrderDetailProps {
  order: RecentOrder;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Dine In',
  room_service: 'Room Service',
  takeout: 'Takeout',
  ocean_view: 'Ocean View',
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '--';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Full order detail panel for the Recent Orders right side
 */
export function RecentOrderDetail({ order }: RecentOrderDetailProps) {
  const [receiptData, setReceiptData] = useState<BIRReceiptData | null>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

  const payment = order.payments.length > 0 ? order.payments[0] : null;

  const handleViewReceipt = async () => {
    setIsLoadingReceipt(true);
    const result = await generateBIRReceipt(order.id);
    if (result.success) {
      setReceiptData(result.data);
    }
    setIsLoadingReceipt(false);
  };

  if (receiptData) {
    return (
      <div className="p-6 max-w-md mx-auto space-y-4">
        <button
          onClick={() => setReceiptData(null)}
          className="text-sm text-[var(--pos-accent)] hover:underline"
        >
          &larr; Back to order details
        </button>
        <ReceiptPreview receipt={receiptData} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Order header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--pos-text)] tabular-nums">
            Order #{order.order_number}
          </h2>
          <div className="flex items-center gap-3 mt-1 text-sm text-[var(--pos-text-muted)]">
            <span>{ORDER_TYPE_LABELS[order.order_type] || order.order_type}</span>
            {order.table_number && <span>Table {order.table_number}</span>}
            {order.room_number && <span>Room {order.room_number}</span>}
            <span>{formatDateTime(order.paid_at)}</span>
          </div>
        </div>

        <button
          onClick={handleViewReceipt}
          disabled={isLoadingReceipt}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            'bg-[var(--pos-accent)] text-white hover:opacity-90',
            isLoadingReceipt && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Printer className="w-4 h-4" />
          {isLoadingReceipt ? 'Loading...' : 'View Receipt'}
        </button>
      </div>

      {/* Status and payment info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-[var(--pos-surface)] border border-[var(--pos-border)]">
          <p className="text-xs text-[var(--pos-text-muted)] mb-1">Status</p>
          <p className="text-sm font-semibold text-[var(--pos-text)] capitalize">
            {order.payment_status === 'refunded' ? 'Refunded' : order.status}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--pos-surface)] border border-[var(--pos-border)]">
          <p className="text-xs text-[var(--pos-text-muted)] mb-1">Payment Method</p>
          <p className="text-sm font-semibold text-[var(--pos-text)] capitalize">
            {payment?.method || 'N/A'}
          </p>
        </div>
        {payment?.cashier_name && (
          <div className="p-4 rounded-lg bg-[var(--pos-surface)] border border-[var(--pos-border)]">
            <p className="text-xs text-[var(--pos-text-muted)] mb-1">Processed By</p>
            <p className="text-sm font-semibold text-[var(--pos-text)] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {payment.cashier_name}
            </p>
          </div>
        )}
        {payment?.cash_received && (
          <div className="p-4 rounded-lg bg-[var(--pos-surface)] border border-[var(--pos-border)]">
            <p className="text-xs text-[var(--pos-text-muted)] mb-1">Cash / Change</p>
            <p className="text-sm font-semibold text-[var(--pos-text)]">
              {formatCurrency(payment.cash_received)} / {formatCurrency(payment.change_given || 0)}
            </p>
          </div>
        )}
      </div>

      {/* Order items */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--pos-text)] mb-3 flex items-center gap-2">
          <Receipt className="w-4 h-4" />
          Items ({order.order_items.length})
        </h3>
        <div className="space-y-2">
          {order.order_items.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-lg bg-[var(--pos-surface)] border border-[var(--pos-border)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--pos-text)]">
                    {item.quantity}x {item.item_name}
                  </p>
                  {item.order_item_addons.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {item.order_item_addons.map((addon) => (
                        <p key={addon.id} className="text-xs text-[var(--pos-text-muted)]">
                          + {addon.addon_name} ({formatCurrency(addon.additional_price)})
                        </p>
                      ))}
                    </div>
                  )}
                  {item.special_instructions && (
                    <p className="text-xs text-amber-400 mt-1 italic">
                      &quot;{item.special_instructions}&quot;
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold text-[var(--pos-text)] tabular-nums">
                  {formatCurrency(item.total_price)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="p-4 rounded-lg bg-[var(--pos-surface)] border border-[var(--pos-border)] space-y-2">
        <div className="flex justify-between text-sm text-[var(--pos-text-muted)]">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatCurrency(order.subtotal)}</span>
        </div>
        {order.discount_amount && order.discount_amount > 0 ? (
          <div className="flex justify-between text-sm text-emerald-400">
            <span>Discount{order.promo_codes ? ` (${order.promo_codes.code})` : ''}</span>
            <span className="tabular-nums">-{formatCurrency(order.discount_amount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-sm text-[var(--pos-text-muted)]">
          <span>VAT (12%)</span>
          <span className="tabular-nums">{formatCurrency(order.tax_amount)}</span>
        </div>
        {order.service_charge && order.service_charge > 0 ? (
          <div className="flex justify-between text-sm text-[var(--pos-text-muted)]">
            <span>Service Charge (10%)</span>
            <span className="tabular-nums">{formatCurrency(order.service_charge)}</span>
          </div>
        ) : null}
        <div className="border-t border-[var(--pos-border)] pt-2 flex justify-between text-base font-bold text-[var(--pos-text)]">
          <span>Total</span>
          <span className="tabular-nums">{formatCurrency(order.total_amount)}</span>
        </div>
      </div>
    </div>
  );
}
