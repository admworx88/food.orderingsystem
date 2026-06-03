'use client';

import { Banknote, Smartphone, CreditCard, UtensilsCrossed, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import type { RecentOrder } from '@/types/payment';

interface RecentOrderCardProps {
  order: RecentOrder;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Dine In',
  room_service: 'Room Svc',
  takeout: 'Takeout',
  ocean_view: 'Ocean View',
};

const STATUS_CONFIG: Record<string, { label: string; badge: string; bar: string }> = {
  paid:      { label: 'PAID',      badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
  served:    { label: 'SERVED',    badge: 'bg-blue-100 text-blue-700',       bar: 'bg-blue-500'    },
  preparing: { label: 'PREPARING', badge: 'bg-amber-100 text-amber-700',     bar: 'bg-amber-500'   },
  ready:     { label: 'READY',     badge: 'bg-cyan-100 text-cyan-700',       bar: 'bg-cyan-500'    },
  cancelled: { label: 'CANCELLED', badge: 'bg-red-100 text-red-600',         bar: 'bg-red-500'     },
};

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  cash:  <Banknote className="w-3 h-3" />,
  gcash: <Smartphone className="w-3 h-3" />,
  card:  <CreditCard className="w-3 h-3" />,
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash', gcash: 'GCash', card: 'Card',
};

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '--:--';
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function RecentOrderCard({ order, isSelected, onSelect }: RecentOrderCardProps) {
  const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
  const isRefunded = order.payment_status === 'refunded';
  const statusKey = isRefunded ? 'cancelled' : 'paid';
  const status = STATUS_CONFIG[statusKey] ?? { label: order.status.toUpperCase(), badge: 'bg-gray-100 text-gray-600', bar: 'bg-gray-400' };
  const payment = order.payments[0];
  const location = order.kiosk_location
    ? ORDER_TYPE_LABELS[order.kiosk_location] ?? order.kiosk_location
    : ORDER_TYPE_LABELS[order.order_type] ?? order.order_type;

  return (
    <button
      onClick={() => onSelect(order.id)}
      className={cn(
        'w-full text-left rounded-xl border transition-all duration-150 overflow-hidden cursor-pointer',
        'flex flex-col',
        isSelected
          ? 'border-[var(--pos-accent)] shadow-md ring-1 ring-[var(--pos-accent)]/30 bg-white'
          : 'border-[var(--pos-border)] bg-white hover:border-[var(--pos-accent)]/40 hover:shadow-sm'
      )}
    >
      {/* Status color bar */}
      <div className={cn('h-1 w-full flex-shrink-0', status.bar)} />

      <div className="p-3 flex flex-col gap-2">
        {/* Top row: order number + status badge */}
        <div className="flex items-start justify-between gap-1">
          <span className="text-[13px] font-bold text-[var(--pos-text)] tabular-nums leading-tight">
            #{order.order_number}
          </span>
          <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none shrink-0', status.badge)}>
            {isRefunded ? 'REFUNDED' : status.label}
          </span>
        </div>

        {/* Amount — primary focal point */}
        <div className="text-[15px] font-bold text-[var(--pos-text)] tabular-nums leading-none">
          {formatCurrency(order.total_amount)}
        </div>

        {/* Meta row: type + table */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[var(--pos-surface)] text-[var(--pos-text-muted)]">
            {location}
          </span>
          {order.table_number && (
            <span className="text-[9px] font-medium text-[var(--pos-text-muted)]">
              T{order.table_number}
            </span>
          )}
          {order.room_number && (
            <span className="text-[9px] font-medium text-[var(--pos-text-muted)]">
              Rm {order.room_number}
            </span>
          )}
          <span className="flex items-center gap-0.5 text-[9px] text-[var(--pos-text-muted)] ml-auto">
            <UtensilsCrossed className="w-2.5 h-2.5" />
            {itemCount}
          </span>
        </div>

        {/* Footer row: time + payment */}
        <div className="flex items-center justify-between border-t border-[var(--pos-border)] pt-2">
          <span className="flex items-center gap-1 text-[9px] text-[var(--pos-text-muted)]">
            <Clock className="w-2.5 h-2.5" />
            {formatTime(order.paid_at)}
          </span>
          {payment && (
            <span className="flex items-center gap-1 text-[9px] text-[var(--pos-text-muted)]">
              {PAYMENT_ICONS[payment.method] ?? <Banknote className="w-3 h-3" />}
              {PAYMENT_LABELS[payment.method] ?? payment.method}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
