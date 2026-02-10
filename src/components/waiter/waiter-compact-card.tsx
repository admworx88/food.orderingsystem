'use client';

import { motion } from 'framer-motion';
import { Check, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import type { WaiterOrder } from '@/hooks/use-realtime-waiter-orders';

interface WaiterCompactCardProps {
  order: WaiterOrder;
  onClick: () => void;
  delayClass?: string;
}

const ORDER_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  dine_in: { label: 'DINE-IN', icon: '🍽' },
  room_service: { label: 'ROOM SVC', icon: '🛎' },
  takeout: { label: 'TAKEOUT', icon: '📦' },
};

/**
 * Compact card for the Recent tab kanban grid.
 * Tap to expand and show full order details in split panel.
 */
export function WaiterCompactCard({
  order,
  onClick,
  delayClass,
}: WaiterCompactCardProps) {
  const orderType = ORDER_TYPE_LABELS[order.order_type] || ORDER_TYPE_LABELS.takeout;

  const location =
    order.order_type === 'dine_in'
      ? `Table ${order.table_number}`
      : order.order_type === 'room_service'
        ? `Room ${order.room_number}`
        : 'Pickup';

  // Calculate time ago
  const timeAgo = order.served_at
    ? getTimeAgo(new Date(order.served_at))
    : order.paid_at
      ? getTimeAgo(new Date(order.paid_at))
      : '';

  const itemCount = order.order_items.length;

  return (
    <motion.button
      type="button"
      layoutId={`order-card-${order.id}`}
      onClick={onClick}
      className={cn(
        'waiter-compact-card',
        delayClass
      )}
    >
      {/* Top row: Order number + SERVED badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="waiter-compact-order-number">#{order.order_number}</span>
        <span className="waiter-compact-served-badge">
          <Check className="w-3 h-3" />
          SERVED
        </span>
      </div>

      {/* Middle row: Order type badge */}
      <div className="waiter-compact-type">
        <span>{orderType.icon}</span>
        <span>{orderType.label}</span>
      </div>

      {/* Bottom rows: Item count, total, location, time */}
      <div className="waiter-compact-meta">
        <div className="flex items-center gap-2">
          <span className="waiter-compact-items">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>
          <span className="waiter-compact-separator">•</span>
          <span className="waiter-compact-total">{formatCurrency(order.total_amount)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="waiter-compact-location">
            <MapPin className="w-3 h-3" />
            {location}
          </span>
          {timeAgo && (
            <>
              <span className="waiter-compact-separator">•</span>
              <span className="waiter-compact-time">{timeAgo}</span>
            </>
          )}
        </div>
      </div>
    </motion.button>
  );
}

/**
 * Format time difference as human-readable string
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}
