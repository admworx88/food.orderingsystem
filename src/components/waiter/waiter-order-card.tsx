'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, MapPin, Phone, AlertTriangle, ChefHat, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { updateItemToServed } from '@/services/order-service';
import { useElapsedTimer } from '@/hooks/use-elapsed-timer';
import type { OrderItemStatus } from '@/lib/constants/item-status';
import type { WaiterOrder, WaiterOrderItem } from '@/hooks/use-realtime-waiter-orders';

interface WaiterOrderCardProps {
  order: WaiterOrder;
  onItemServed: (itemId: string, newStatus: OrderItemStatus) => void;
  onClick?: () => void;
  delayClass?: string;
}

const ORDER_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  dine_in: { label: 'DINE-IN', icon: '🍽' },
  room_service: { label: 'ROOM SERVICE', icon: '🛎' },
  takeout: { label: 'TAKEOUT', icon: '📦' },
};

/**
 * Status icon indicator for item rows
 * Shows different icons based on item status (pending, preparing, ready, served)
 */
function ItemStatusIcon({ status }: { status: OrderItemStatus }) {
  const iconClasses = {
    pending: 'waiter-item-status-icon waiter-item-status-pending',
    preparing: 'waiter-item-status-icon waiter-item-status-preparing',
    ready: 'waiter-item-status-icon waiter-item-status-ready',
    served: 'waiter-item-status-icon waiter-item-status-served',
  };

  return (
    <div className={iconClasses[status]}>
      {status === 'served' ? (
        <Check className="w-4 h-4" />
      ) : status === 'ready' ? (
        <ChefHat className="w-4 h-4" />
      ) : (
        <Clock className="w-3.5 h-3.5" />
      )}
    </div>
  );
}

/**
 * Item action component - renders SERVE button or SERVED badge
 * Uses explicit button design matching kitchen "DONE" button pattern
 */
function ItemAction({
  item,
  onServe,
}: {
  item: WaiterOrderItem;
  onServe: (itemId: string) => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const isReady = item.status === 'ready';
  const isServed = item.status === 'served';

  const handleServe = async () => {
    if (!isReady || isUpdating) return;

    setIsUpdating(true);
    const result = await updateItemToServed(item.id);

    if (result.success) {
      onServe(item.id);
      if (result.data.orderCompleted) {
        toast.success('Order complete!');
      }
    } else {
      toast.error(result.error || 'Failed to mark item as served');
    }

    setIsUpdating(false);
  };

  // Ready items: show explicit SERVE button
  if (isReady) {
    return (
      <button
        onClick={handleServe}
        disabled={isUpdating}
        className="waiter-item-serve-btn"
        aria-label={`Mark ${item.item_name} as served`}
      >
        {isUpdating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Check className="w-4 h-4" />
            <span>SERVE</span>
          </>
        )}
      </button>
    );
  }

  // Served items: show SERVED badge
  if (isServed) {
    return (
      <span className="waiter-item-served-badge">
        <Check className="w-3 h-3" />
        SERVED
      </span>
    );
  }

  // Pending/preparing: no action button
  return null;
}

function OrderTimer({ paidAt, isFullyServed }: { paidAt: string | null; isFullyServed: boolean }) {
  const elapsed = useElapsedTimer(paidAt);

  // Hide timer if no elapsed time or if all items are served
  if (elapsed === 0 || isFullyServed) return null;

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  let timerClass = 'waiter-timer waiter-timer-ok';
  if (minutes >= 10) timerClass = 'waiter-timer waiter-timer-danger';
  else if (minutes >= 5) timerClass = 'waiter-timer waiter-timer-warning';

  return (
    <div className={cn('flex items-center gap-1.5', timerClass)}>
      <Clock className="w-3.5 h-3.5" />
      <span>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}

export function WaiterOrderCard({ order, onItemServed, onClick, delayClass }: WaiterOrderCardProps) {
  const orderType = ORDER_TYPE_LABELS[order.order_type] || ORDER_TYPE_LABELS.takeout;

  const location =
    order.order_type === 'dine_in'
      ? `Table ${order.table_number}`
      : order.order_type === 'room_service'
        ? `Room ${order.room_number}`
        : 'Pickup Counter';

  const hasReadyItems = order.readyCount > 0;

  // Check if all items are served
  const isFullyServed = order.order_items.every((item) => item.status === 'served');

  // Get row style class based on item status
  const getRowClass = (status: OrderItemStatus) => {
    switch (status) {
      case 'ready':
        return 'waiter-item-row waiter-item-row-ready';
      case 'served':
        return 'waiter-item-row waiter-item-row-served';
      case 'preparing':
        return 'waiter-item-row waiter-item-row-preparing';
      default:
        return 'waiter-item-row waiter-item-row-pending';
    }
  };

  return (
    <motion.div
      layoutId={`order-card-${order.id}`}
      onClick={onClick}
      className={cn(
        'waiter-card',
        hasReadyItems && 'waiter-card-ready',
        onClick && 'cursor-pointer',
        delayClass
      )}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          {/* Order Number */}
          <div className="flex items-center gap-3">
            <span className={cn(
              'waiter-order-number',
              hasReadyItems && 'waiter-order-number-ready'
            )}>
              #{order.order_number}
            </span>
            {/* Ready Badge */}
            {hasReadyItems && (
              <span className="waiter-ready-badge">
                <span className="waiter-ready-badge-dot" />
                {order.readyCount}/{order.totalCount} Ready
              </span>
            )}
          </div>

          {/* Timer - hidden when all items served */}
          <OrderTimer paidAt={order.paid_at} isFullyServed={isFullyServed} />
        </div>

        {/* Order Type & Location */}
        <div className="mt-3 flex items-center justify-between">
          <div className="waiter-order-type">
            <span>{orderType.icon}</span>
            <span>{orderType.label}</span>
          </div>
          <div className="waiter-location">
            <MapPin className="w-3.5 h-3.5" />
            <span>{location}</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="waiter-divider mx-4" />

      {/* Items List */}
      <div className="flex-1 px-4 py-4 space-y-2.5 overflow-y-auto max-h-72">
        {order.order_items.map((item) => (
          <div
            key={item.id}
            className={getRowClass(item.status)}
          >
            {/* Status Icon */}
            <ItemStatusIcon status={item.status} />

            {/* Item Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {/* Quantity */}
                <span className={cn(
                  'flex-shrink-0 text-sm font-bold',
                  item.status === 'served' ? 'text-[var(--waiter-text-muted)]' : 'text-[var(--waiter-text)]'
                )}>
                  {item.quantity}x
                </span>
                {/* Name */}
                <span className={cn(
                  'text-sm font-medium',
                  item.status === 'served'
                    ? 'text-[var(--waiter-text-muted)] line-through'
                    : 'text-[var(--waiter-text)]'
                )}>
                  {item.item_name}
                </span>
              </div>

              {/* Addons */}
              {item.order_item_addons.length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {item.order_item_addons.map((addon) => (
                    <p
                      key={addon.id}
                      className={cn(
                        'text-xs pl-6',
                        item.status === 'served'
                          ? 'text-[var(--waiter-text-muted)]'
                          : 'text-[var(--waiter-text-secondary)]'
                      )}
                    >
                      + {addon.addon_name}
                    </p>
                  ))}
                </div>
              )}

              {/* Special instructions */}
              {item.special_instructions && (
                <div className="mt-2 flex items-start gap-2 px-2.5 py-2 rounded-lg bg-[var(--waiter-preparing-light)] border border-[rgba(217,119,6,0.2)]">
                  <AlertTriangle className="w-3.5 h-3.5 text-[var(--waiter-preparing)] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[var(--waiter-preparing)] font-medium">
                    {item.special_instructions}
                  </p>
                </div>
              )}
            </div>

            {/* Action Button / Status Badge */}
            <ItemAction
              item={item}
              onServe={(itemId) => onItemServed(itemId, 'served')}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="waiter-card-footer">
        <span className="font-semibold text-[var(--waiter-text)]">
          {formatCurrency(order.total_amount)}
        </span>
        {order.guest_phone && (
          <div className="flex items-center gap-1.5 text-[var(--waiter-text-muted)]">
            <Phone className="w-3.5 h-3.5" />
            <span className="text-xs font-mono">{order.guest_phone}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
