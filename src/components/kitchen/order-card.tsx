'use client';

import { useState } from 'react';
import { Clock, ChevronRight, AlertTriangle, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import { updateOrderStatus } from '@/services/order-service';
import { useElapsedTimer } from '@/hooks/use-elapsed-timer';
import type { KitchenOrder } from '@/hooks/use-realtime-orders';

interface OrderCardProps {
  order: KitchenOrder;
  onStatusUpdated: (orderId: string, newStatus: string, newVersion: number) => void;
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
    nextLabel: 'Mark Served',
  },
};

const NEXT_STATUS: Record<string, string> = {
  paid: 'preparing',
  preparing: 'ready',
  ready: 'served',
};

function getTimerState(elapsedMinutes: number): { class: string; isCritical: boolean } {
  if (elapsedMinutes < 5) return { class: 'kds-timer-ok', isCritical: false };
  if (elapsedMinutes < 10) return { class: 'kds-timer-warning', isCritical: false };
  if (elapsedMinutes < 15) return { class: 'kds-timer-danger', isCritical: false };
  return { class: 'kds-timer-critical', isCritical: true };
}

function OrderTimer({ elapsed }: { elapsed: number }) {
  if (elapsed === 0) return null;

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timerState = getTimerState(minutes);

  return (
    <div className={cn('kds-timer flex items-center gap-2', timerState.class)}>
      <Clock className="w-4 h-4" />
      <span>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}

export function OrderCard({ order, onStatusUpdated }: OrderCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  // Single shared timer — eliminates duplicate intervals per card
  const elapsed = useElapsedTimer(order.paid_at);
  const minutes = Math.floor(elapsed / 60);
  const isCritical = minutes >= 15;

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.paid;
  const nextStatus = NEXT_STATUS[order.status];
  const orderType = ORDER_TYPE_LABELS[order.order_type] || ORDER_TYPE_LABELS.takeout;

  const location =
    order.order_type === 'dine_in'
      ? `Table ${order.table_number}`
      : order.order_type === 'room_service'
        ? `Room ${order.room_number}`
        : 'Pickup Counter';

  const handleBump = async () => {
    if (!nextStatus || isUpdating) return;
    setIsUpdating(true);

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
      {/* Header: Order Number + Status + Timer */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className={cn('kds-order-number', statusConfig.numberClass, isCritical && 'kds-order-number-critical')}>
            #{order.order_number}
          </div>
          <div className={cn('kds-badge', statusConfig.badgeClass)}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {statusConfig.label}
          </div>
        </div>

        <OrderTimer elapsed={elapsed} />
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Order Type & Location */}
      <div className="px-5 py-3 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="text-base">{orderType.icon}</span>
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            {orderType.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-300">
          <MapPin className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-sm font-semibold">{location}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Items List */}
      <div className="flex-1 px-5 py-4 space-y-3 overflow-y-auto max-h-56 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {order.order_items.map((item) => (
          <div key={item.id} className="space-y-1">
            <div className="flex items-start gap-3">
              {/* Quantity badge */}
              <span className="flex-shrink-0 w-7 h-7 rounded-md bg-amber-500/20 text-amber-400 font-mono font-bold text-sm flex items-center justify-center">
                {item.quantity}
              </span>

              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-zinc-200 block">
                  {item.item_name}
                </span>

                {/* Addons */}
                {item.order_item_addons.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {item.order_item_addons.map((addon) => (
                      <p
                        key={addon.id}
                        className="text-xs text-zinc-500 pl-0.5 flex items-center gap-1"
                      >
                        <span className="text-zinc-600">+</span>
                        {addon.addon_name}
                      </p>
                    ))}
                  </div>
                )}

                {/* Special instructions */}
                {item.special_instructions && (
                  <div className="mt-2 flex items-start gap-1.5 px-2 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-300/90 leading-relaxed">
                      {item.special_instructions}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Footer: Total & Phone */}
      <div className="px-5 py-3 flex items-center justify-between bg-white/[0.02]">
        <span className="font-mono font-bold text-zinc-200">
          {formatCurrency(order.total_amount)}
        </span>
        {order.guest_phone && (
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Phone className="w-3.5 h-3.5" />
            <span className="text-xs font-mono">{order.guest_phone}</span>
          </div>
        )}
      </div>

      {/* Bump Button */}
      {nextStatus && (
        <button
          onClick={handleBump}
          disabled={isUpdating}
          className={cn(
            'kds-bump-btn',
            statusConfig.bumpClass,
            isUpdating && 'opacity-60 cursor-not-allowed'
          )}
        >
          {isUpdating ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              Updating...
            </span>
          ) : (
            <>
              <span>{statusConfig.nextLabel}</span>
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
