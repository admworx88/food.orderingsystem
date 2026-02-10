'use client';

import { useState } from 'react';
import { Clock, ChevronRight, AlertTriangle, MapPin, Phone, Check, ChefHat } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import { updateOrderStatus, updateItemToReady, markAllItemsReady } from '@/services/order-service';
import { useElapsedTimer } from '@/hooks/use-elapsed-timer';
import { calculateItemStatusCounts } from '@/lib/utils/item-status';
import type { KitchenOrder } from '@/hooks/use-realtime-orders';

interface OrderCardProps {
  order: KitchenOrder;
  onStatusUpdated: (orderId: string, newStatus: string, newVersion: number) => void;
  isHistorical?: boolean;
  hideStatusBadge?: boolean;
}

const ORDER_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  dine_in: { label: 'DINE-IN', icon: '🍽' },
  room_service: { label: 'ROOM SERVICE', icon: '🛎' },
  takeout: { label: 'TAKEOUT', icon: '📦' },
};

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; cardClass: string; numberClass: string; bumpClass: string; nextLabel: string }> = {
  paid: {
    label: 'NEW',
    badgeClass: 'kds-badge-new',
    cardClass: 'kds-card-new',
    numberClass: 'kds-order-number-new',
    bumpClass: 'kds-bump-btn-new',
    nextLabel: 'Start Preparing',
  },
  preparing: {
    label: 'PREPARING',
    badgeClass: 'kds-badge-preparing',
    cardClass: 'kds-card-preparing',
    numberClass: 'kds-order-number-preparing',
    bumpClass: 'kds-bump-btn-preparing',
    nextLabel: 'Mark Ready',
  },
  ready: {
    label: 'READY',
    badgeClass: 'kds-badge-ready',
    cardClass: 'kds-card-ready',
    numberClass: 'kds-order-number-ready',
    bumpClass: 'kds-bump-btn-ready',
    nextLabel: '', // Kitchen stops at Ready - Waiter handles "Mark Served"
  },
  served: {
    label: 'SERVED',
    badgeClass: 'kds-badge-served',
    cardClass: 'kds-card-served',
    numberClass: 'kds-order-number-served',
    bumpClass: '',
    nextLabel: '', // Historical view - no actions
  },
};

// Kitchen workflow: paid → preparing → ready (stops here)
// Waiter handles: ready → served
const NEXT_STATUS: Record<string, string> = {
  paid: 'preparing',
  preparing: 'ready',
  // No 'ready: served' - that's the waiter's responsibility
};

function getTimerState(elapsedMinutes: number): { class: string; isCritical: boolean } {
  if (elapsedMinutes < 5) return { class: 'kds-timer-ok', isCritical: false };
  if (elapsedMinutes < 10) return { class: 'kds-timer-warning', isCritical: false };
  if (elapsedMinutes < 15) return { class: 'kds-timer-danger', isCritical: false };
  return { class: 'kds-timer-critical', isCritical: true };
}

function OrderTimer({ elapsed, servedAt }: { elapsed: number; servedAt?: string | null }) {
  // For served orders, show when it was served
  if (servedAt) {
    const servedTime = new Date(servedAt);
    const timeStr = servedTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return (
      <div className="kds-timer kds-timer-responsive flex items-center gap-1.5 lg:gap-2 text-zinc-500">
        <Check className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
        <span>Served at {timeStr}</span>
      </div>
    );
  }

  if (elapsed === 0) return null;

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timerState = getTimerState(minutes);

  return (
    <div className={cn('kds-timer kds-timer-responsive flex items-center gap-1.5 lg:gap-2', timerState.class)}>
      <Clock className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
      <span>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}

export function OrderCard({ order, onStatusUpdated, isHistorical = false, hideStatusBadge = false }: OrderCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  // Single shared timer — eliminates duplicate intervals per card
  // Don't run timer for historical (served) orders
  const elapsed = useElapsedTimer(isHistorical ? null : order.paid_at);
  const minutes = Math.floor(elapsed / 60);
  const isCritical = !isHistorical && minutes >= 15;

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.paid;
  const nextStatus = NEXT_STATUS[order.status];
  const orderType = ORDER_TYPE_LABELS[order.order_type] || ORDER_TYPE_LABELS.takeout;

  // Calculate item-level status counts
  const itemCounts = calculateItemStatusCounts(order.order_items);
  const hasPartialReady = itemCounts.ready > 0 && itemCounts.ready < itemCounts.total;
  const isPreparing = order.status === 'preparing';

  const location =
    order.order_type === 'dine_in'
      ? `Table ${order.table_number}`
      : order.order_type === 'room_service'
        ? `Room ${order.room_number}`
        : 'Pickup Counter';

  // Handle marking individual item as ready
  const handleItemReady = async (itemId: string) => {
    if (updatingItemId) return;
    setUpdatingItemId(itemId);

    const result = await updateItemToReady(itemId);

    if (result.success) {
      if (result.data.orderAutoUpdated) {
        toast.success('All items ready!');
        onStatusUpdated(order.id, 'ready', (order.version ?? 0) + 1);
      }
    } else {
      toast.error(result.error || 'Failed to mark item as ready');
    }

    setUpdatingItemId(null);
  };

  const handleBump = async () => {
    if (!nextStatus || isUpdating) return;
    setIsUpdating(true);

    // When bumping from preparing to ready, use markAllItemsReady to sync items
    if (order.status === 'preparing' && nextStatus === 'ready') {
      const result = await markAllItemsReady(order.id);
      if (result.success) {
        onStatusUpdated(order.id, 'ready', (order.version ?? 0) + 1);
      } else {
        toast.error(result.error || 'Failed to mark order as ready');
      }
      setIsUpdating(false);
      return;
    }

    const result = await updateOrderStatus(
      order.id,
      nextStatus as 'preparing' | 'ready' | 'served',
      order.version ?? undefined
    );

    if (result.success && result.data) {
      onStatusUpdated(order.id, result.data.status, result.data.version);
    } else if (!result.success) {
      console.error('Failed to update status:', result.error);

      // Show toast feedback so kitchen staff see the failure
      if (result.error.includes('another user')) {
        toast.error('Order updated by another user. Refreshing...');
      } else {
        toast.error('Failed to update order status. Please try again.');
      }
    }

    setIsUpdating(false);
  };

  return (
    <div
      className={cn(
        'kds-card flex flex-col overflow-hidden',
        statusConfig.cardClass,
        isCritical && 'kds-card-critical'
      )}
    >
      {/* Header: Order Number + Status + Timer - responsive padding */}
      <div className="px-3 pt-3 pb-3 lg:px-5 lg:pt-5 lg:pb-4">
        <div className="flex items-start justify-between gap-2 lg:gap-3 mb-3 lg:mb-4">
          <div className={cn('kds-order-number kds-order-number-responsive', statusConfig.numberClass, isCritical && 'kds-order-number-critical')}>
            #{order.order_number}
          </div>
          {!hideStatusBadge && (
            <div className={cn('kds-badge kds-badge-responsive', statusConfig.badgeClass)}>
              <span className="w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full bg-current" />
              {statusConfig.label}
            </div>
          )}
        </div>

        <OrderTimer elapsed={elapsed} servedAt={isHistorical ? order.served_at : null} />
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Order Type & Location - responsive padding */}
      <div className="px-3 py-2 lg:px-5 lg:py-3 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-1.5 lg:gap-2">
          <span className="text-sm lg:text-base">{orderType.icon}</span>
          <span className="text-[10px] lg:text-xs font-bold text-zinc-500 uppercase tracking-wider">
            {orderType.label}
          </span>
        </div>
        <div className="flex items-center gap-1 lg:gap-1.5 text-zinc-300">
          <MapPin className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-zinc-500" />
          <span className="text-xs lg:text-sm font-semibold">{location}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Partial Ready Badge (when some items are ready) - responsive padding */}
      {hasPartialReady && (
        <>
          <div className="px-3 py-1.5 lg:px-5 lg:py-2 bg-emerald-500/10 flex items-center justify-center gap-1.5 lg:gap-2">
            <ChefHat className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-emerald-400" />
            <span className="text-[10px] lg:text-xs font-bold text-emerald-400 uppercase tracking-wide">
              {itemCounts.ready}/{itemCounts.total} Items Ready
            </span>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </>
      )}

      {/* Items List - responsive padding */}
      <div className="flex-1 px-3 py-3 lg:px-5 lg:py-4 space-y-2 lg:space-y-3 overflow-y-auto max-h-48 lg:max-h-56 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {/* Instructional hint for preparing orders */}
        {isPreparing && itemCounts.preparing > 0 && (
          <div className="kds-items-hint kds-items-hint-responsive">
            <span className="kds-items-hint-icon">👆</span>
            <span>Tap <strong>DONE</strong> on each item when it&apos;s ready</span>
          </div>
        )}

        {order.order_items.map((item) => {
          // Kitchen tracks: preparing → ready (served status is waiter's domain)
          // Note: When order bumps to 'preparing', trigger sets all items to 'preparing'
          const isItemReady = item.status === 'ready' || item.status === 'served';
          // No actions for historical orders
          const canMarkReady = !isHistorical && isPreparing && item.status === 'preparing';
          const isUpdatingThisItem = updatingItemId === item.id;

          return (
            <div
              key={item.id}
              className="space-y-1"
            >
              <div className="flex items-start gap-2 lg:gap-3">
                {/* Quantity badge - now purely informational - responsive */}
                <span
                  className={cn(
                    'kds-item-qty kds-item-qty-responsive',
                    isItemReady ? 'kds-item-qty-ready' : 'kds-item-qty-pending'
                  )}
                >
                  {isItemReady ? (
                    <Check className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  ) : (
                    item.quantity
                  )}
                </span>

                {/* Item details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 lg:gap-2 flex-wrap">
                    <span
                      className={cn(
                        'text-xs lg:text-sm font-medium',
                        isItemReady ? 'text-emerald-300' : 'text-zinc-200'
                      )}
                    >
                      {item.item_name}
                    </span>
                  </div>

                  {/* Addons */}
                  {item.order_item_addons.length > 0 && (
                    <div className="mt-0.5 lg:mt-1 space-y-0.5">
                      {item.order_item_addons.map((addon) => (
                        <p
                          key={addon.id}
                          className="text-[10px] lg:text-xs text-zinc-500 pl-0.5 flex items-center gap-1"
                        >
                          <span className="text-zinc-600">+</span>
                          {addon.addon_name}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Special instructions */}
                  {item.special_instructions && (
                    <div className="mt-1.5 lg:mt-2 flex items-start gap-1 lg:gap-1.5 px-1.5 py-1 lg:px-2 lg:py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                      <AlertTriangle className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] lg:text-xs text-amber-300/90 leading-relaxed">
                        {item.special_instructions}
                      </p>
                    </div>
                  )}
                </div>

                {/* Explicit DONE button / READY badge - right aligned - responsive */}
                {/* Kitchen only shows: DONE button (pending) or READY badge (ready/served) */}
                {canMarkReady ? (
                  <button
                    onClick={() => handleItemReady(item.id)}
                    disabled={isUpdatingThisItem}
                    className="kds-item-done-btn kds-item-done-btn-responsive"
                  >
                    {isUpdatingThisItem ? (
                      <span className="w-3.5 h-3.5 lg:w-4 lg:h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                        <span>DONE</span>
                      </>
                    )}
                  </button>
                ) : isItemReady ? (
                  <span className="kds-item-ready-badge kds-item-ready-badge-responsive">
                    <Check className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                    READY
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Footer: Total & Phone - responsive padding */}
      <div className="px-3 py-2 lg:px-5 lg:py-3 flex items-center justify-between bg-white/[0.02]">
        <span className="font-mono font-bold text-xs lg:text-sm text-zinc-200">
          {formatCurrency(order.total_amount)}
        </span>
        {order.guest_phone && (
          <div className="flex items-center gap-1 lg:gap-1.5 text-zinc-500">
            <Phone className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
            <span className="text-[10px] lg:text-xs font-mono">{order.guest_phone}</span>
          </div>
        )}
      </div>

      {/* Bump Button - not shown for historical orders - responsive */}
      {nextStatus && !isHistorical && (
        <button
          onClick={handleBump}
          disabled={isUpdating}
          className={cn(
            'kds-bump-btn kds-bump-btn-responsive',
            statusConfig.bumpClass,
            isUpdating && 'opacity-60 cursor-not-allowed'
          )}
        >
          {isUpdating ? (
            <span className="flex items-center gap-1.5 lg:gap-2">
              <span className="w-3.5 h-3.5 lg:w-4 lg:h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              Updating...
            </span>
          ) : (
            <>
              <span>{statusConfig.nextLabel}</span>
              <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
