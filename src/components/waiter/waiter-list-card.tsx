'use client';

import { motion } from 'framer-motion';
import { MapPin, ChefHat, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import type { WaiterOrder } from '@/hooks/use-realtime-waiter-orders';

interface WaiterListCardProps {
  order: WaiterOrder;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

const ORDER_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  dine_in: { label: 'DINE-IN', icon: '🍽' },
  room_service: { label: 'ROOM SVC', icon: '🛎' },
  takeout: { label: 'TAKEOUT', icon: '📦' },
  ocean_view: { label: 'OCEAN VIEW', icon: '🌊' },
};

/**
 * Condensed card for the left sidebar list view in split-panel layout.
 * Fixed height ~80px, shows order summary with selection highlight.
 */
export function WaiterListCard({
  order,
  isSelected,
  onClick,
  index,
}: WaiterListCardProps) {
  const orderType = ORDER_TYPE_LABELS[order.order_type] || ORDER_TYPE_LABELS.takeout;

  const location =
    order.order_type === 'dine_in'
      ? `T.${order.table_number}`
      : order.order_type === 'room_service'
        ? `R.${order.room_number}`
        : 'Pickup';

  const hasReadyItems = order.readyCount > 0;
  const isFullyServed = order.status === 'served';
  const itemCount = order.order_items.length;

  // Status badge text
  const statusText = isFullyServed
    ? 'SERVED'
    : `${order.readyCount}/${order.totalCount}`;

  return (
    <motion.button
      type="button"
      layoutId={`order-card-${order.id}`}
      onClick={onClick}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.05,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={cn(
        'waiter-list-card',
        isSelected && 'waiter-list-card-selected',
        hasReadyItems && !isFullyServed && 'waiter-list-card-ready'
      )}
    >
      {/* Selection indicator bar */}
      {isSelected && <div className="waiter-list-card-indicator" />}

      {/* Content */}
      <div className="waiter-list-card-content">
        {/* Top row: Order number + Status badge */}
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'waiter-list-card-number',
            hasReadyItems && !isFullyServed && 'waiter-list-card-number-ready'
          )}>
            #{order.order_number}
          </span>
          <span className={cn(
            'waiter-list-card-status',
            isFullyServed && 'waiter-list-card-status-served',
            hasReadyItems && !isFullyServed && 'waiter-list-card-status-ready'
          )}>
            {isFullyServed ? (
              <Check className="w-3 h-3" />
            ) : (
              <ChefHat className="w-3 h-3" />
            )}
            {statusText}
          </span>
        </div>

        {/* Middle row: Order type + Location */}
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <span className="waiter-list-card-type">
            <span>{orderType.icon}</span>
            <span>{orderType.label}</span>
          </span>
          <span className="waiter-list-card-location">
            <MapPin className="w-3 h-3" />
            {location}
          </span>
        </div>

        {/* Bottom row: Item count + Total */}
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <span className="waiter-list-card-items">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>
          <span className="waiter-list-card-total">
            {formatCurrency(order.total_amount)}
          </span>
        </div>
      </div>
    </motion.button>
  );
}
