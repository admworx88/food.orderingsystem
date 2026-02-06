'use client';

import { useState, useEffect } from 'react';
import { Clock, ChevronRight, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import { updateOrderStatus } from '@/services/order-service';
import type { KitchenOrder } from '@/hooks/use-realtime-orders';

interface OrderCardProps {
  order: KitchenOrder;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'DINE-IN',
  room_service: 'ROOM SERVICE',
  takeout: 'TAKEOUT',
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; nextLabel: string }> = {
  paid: {
    label: 'NEW',
    bg: 'bg-blue-600',
    text: 'text-blue-100',
    nextLabel: 'Start Preparing',
  },
  preparing: {
    label: 'PREPARING',
    bg: 'bg-amber-600',
    text: 'text-amber-100',
    nextLabel: 'Mark Ready',
  },
  ready: {
    label: 'READY',
    bg: 'bg-green-600',
    text: 'text-green-100',
    nextLabel: 'Mark Served',
  },
};

const NEXT_STATUS: Record<string, string> = {
  paid: 'preparing',
  preparing: 'ready',
  ready: 'served',
};

function getTimerColor(elapsedMinutes: number): string {
  if (elapsedMinutes < 5) return 'text-green-400';
  if (elapsedMinutes < 10) return 'text-yellow-400';
  if (elapsedMinutes < 15) return 'text-orange-400';
  return 'text-red-400';
}

function OrderTimer({ paidAt }: { paidAt: string | null }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!paidAt) return;

    const calculate = () => {
      const diff = Math.floor((Date.now() - new Date(paidAt).getTime()) / 1000);
      setElapsed(Math.max(0, diff));
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [paidAt]);

  if (!paidAt) return null;

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const color = getTimerColor(minutes);
  const isCritical = minutes >= 15;

  return (
    <div className={cn('flex items-center gap-1.5 font-mono text-lg font-bold tabular-nums', color, isCritical && 'animate-pulse')}>
      <Clock className="w-4 h-4" />
      <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
    </div>
  );
}

export function OrderCard({ order }: OrderCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.paid;
  const nextStatus = NEXT_STATUS[order.status];
  const location = order.order_type === 'dine_in'
    ? `Table ${order.table_number}`
    : order.order_type === 'room_service'
      ? `Room ${order.room_number}`
      : 'Takeout';

  const handleBump = async () => {
    if (!nextStatus || isUpdating) return;
    setIsUpdating(true);

    const result = await updateOrderStatus(
      order.id,
      nextStatus as 'preparing' | 'ready' | 'served',
      order.version ?? undefined
    );

    if (!result.success) {
      console.error('Failed to update status:', result.error);
    }

    setIsUpdating(false);
  };

  return (
    <div className={cn(
      'bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex flex-col',
      order.status === 'paid' && 'border-blue-500/50',
      order.status === 'preparing' && 'border-amber-500/50',
      order.status === 'ready' && 'border-green-500/50'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-750 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-white">{order.order_number}</span>
          <span className={cn('px-2 py-0.5 rounded text-xs font-bold', statusConfig.bg, statusConfig.text)}>
            {statusConfig.label}
          </span>
        </div>
        <OrderTimer paidAt={order.paid_at} />
      </div>

      {/* Order type & location */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700/50">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          {ORDER_TYPE_LABELS[order.order_type] || order.order_type}
        </span>
        <span className="text-sm font-semibold text-gray-300">{location}</span>
      </div>

      {/* Items */}
      <div className="flex-1 px-4 py-3 space-y-2 overflow-y-auto max-h-64">
        {order.order_items.map((item) => (
          <div key={item.id} className="space-y-1">
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold text-sm min-w-[24px]">
                {item.quantity}x
              </span>
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-200">{item.item_name}</span>
                {/* Addons */}
                {item.order_item_addons.length > 0 && (
                  <div className="mt-0.5 space-y-0.5">
                    {item.order_item_addons.map((addon) => (
                      <p key={addon.id} className="text-xs text-gray-400 pl-2">
                        + {addon.addon_name}
                      </p>
                    ))}
                  </div>
                )}
                {/* Special instructions */}
                {item.special_instructions && (
                  <div className="mt-1 flex items-start gap-1">
                    <AlertTriangle className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-400 italic">{item.special_instructions}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-800/50 border-t border-gray-700/50 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-300">
          {formatCurrency(order.total_amount)}
        </span>
        {order.guest_phone && (
          <span className="text-xs text-gray-500">{order.guest_phone}</span>
        )}
      </div>

      {/* Bump Button */}
      {nextStatus && (
        <button
          onClick={handleBump}
          disabled={isUpdating}
          className={cn(
            'w-full py-4 text-base font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]',
            order.status === 'paid' && 'bg-blue-600 hover:bg-blue-700 text-white',
            order.status === 'preparing' && 'bg-amber-600 hover:bg-amber-700 text-white',
            order.status === 'ready' && 'bg-green-600 hover:bg-green-700 text-white',
            isUpdating && 'opacity-60 cursor-not-allowed'
          )}
        >
          {isUpdating ? (
            <span>Updating...</span>
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
