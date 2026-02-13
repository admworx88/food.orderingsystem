'use client';

import { UtensilsCrossed, Clock } from 'lucide-react';
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

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-emerald-500/20 text-emerald-400',
  served: 'bg-blue-500/20 text-blue-400',
  preparing: 'bg-amber-500/20 text-amber-400',
  ready: 'bg-cyan-500/20 text-cyan-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '--:--';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Compact order card for the Recent Orders left panel
 */
export function RecentOrderCard({ order, isSelected, onSelect }: RecentOrderCardProps) {
  const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
  const isPaid = order.payment_status === 'paid';
  const isRefunded = order.payment_status === 'refunded';

  return (
    <button
      onClick={() => onSelect(order.id)}
      className={cn(
        'w-full text-left p-3 rounded-lg transition-all',
        'border border-transparent',
        isSelected
          ? 'bg-[var(--pos-accent)]/10 border-[var(--pos-accent)]/40'
          : 'hover:bg-[var(--pos-surface)]'
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-[var(--pos-text)] tabular-nums">
            #{order.order_number}
          </span>
          <span className={cn(
            'text-[10px] font-semibold px-1.5 py-0.5 rounded',
            STATUS_COLORS[order.status] || 'bg-gray-500/20 text-gray-400'
          )}>
            {isRefunded ? 'REFUNDED' : order.status.toUpperCase()}
          </span>
        </div>
        <span className="text-sm font-bold text-[var(--pos-text)] tabular-nums">
          {formatCurrency(order.total_amount)}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--pos-text-muted)]">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-[var(--pos-surface)] text-[10px] font-medium">
            {ORDER_TYPE_LABELS[order.order_type] || order.order_type}
          </span>
          {order.table_number && (
            <span>T{order.table_number}</span>
          )}
          <span className="flex items-center gap-0.5">
            <UtensilsCrossed className="w-3 h-3" />
            {itemCount}
          </span>
        </div>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTime(order.paid_at)}
        </span>
      </div>

      {/* Payment method badge */}
      {isPaid && order.payments.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[var(--pos-text-muted)]">
          <span>
            {order.payments[0].method === 'cash' ? '💵' : order.payments[0].method === 'gcash' ? '📱' : '💳'}
          </span>
          <span className="capitalize">{order.payments[0].method}</span>
          {order.payments[0].cashier_name && (
            <span className="ml-1 opacity-60">by {order.payments[0].cashier_name}</span>
          )}
        </div>
      )}
    </button>
  );
}
