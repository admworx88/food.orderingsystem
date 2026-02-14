'use client';

import { useState, useEffect } from 'react';
import { Clock, MapPin, User, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { ExpirationCountdown } from './expiration-countdown';
import type { CashierOrder } from '@/types/payment';

interface PendingOrdersListProps {
  orders: CashierOrder[];
  selectedOrderId: string | null;
  onSelectOrder: (orderId: string) => void;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Dine-in',
  room_service: 'Room Svc',
  takeout: 'Takeout',
  ocean_view: 'Ocean View',
};

/**
 * Pending orders queue - Terminal Command Center theme
 */
export function PendingOrdersList({
  orders,
  selectedOrderId,
  onSelectOrder,
}: PendingOrdersListProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(interval);
  }, []);

  const activeOrders = orders.filter(
    (o) => !o.expires_at || new Date(o.expires_at).getTime() > now
  );
  const expiredOrders = orders.filter(
    (o) => o.expires_at && new Date(o.expires_at).getTime() <= now
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="pos-queue-header">
        <h2 className="pos-queue-title">Pending Orders</h2>
        <p className="pos-queue-subtitle">
          {activeOrders.length} order{activeOrders.length !== 1 ? 's' : ''} awaiting payment
        </p>
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto pos-scrollbar">
        {activeOrders.length === 0 && expiredOrders.length === 0 && (
          <div className="py-16 text-center">
            <Clock className="w-8 h-8 mx-auto text-[var(--pos-text-muted)] mb-3" />
            <p className="text-[var(--pos-text-muted)] text-sm">No pending orders</p>
          </div>
        )}

        {/* Active orders */}
        {activeOrders.map((order, index) => {
          const isSelected = order.id === selectedOrderId;
          const expiresAt = order.expires_at;
          const minutesLeft = expiresAt
            ? (new Date(expiresAt).getTime() - now) / 60_000
            : null;
          const isUrgent = minutesLeft !== null && minutesLeft < 2;

          return (
            <div
              key={order.id}
              style={{ animationDelay: `${index * 50}ms` }}
              className={cn(
                'pos-order-card',
                isSelected && 'pos-order-card-selected',
                isUrgent && !isSelected && 'pos-order-card-urgent'
              )}
              onClick={() => onSelectOrder(order.id)}
            >
              {/* Top row: Order number + badges */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'pos-order-number',
                    isSelected && 'pos-order-number-selected'
                  )}>
                    #{order.order_number}
                  </span>
                  <span className="pos-order-badge">
                    {ORDER_TYPE_LABELS[order.order_type] || order.order_type}
                  </span>
                </div>
                <ExpirationCountdown expiresAt={order.expires_at} />
              </div>

              {/* Middle row: Items + Amount */}
              <div className="pos-order-meta">
                <span>
                  {order.order_items?.length || 0} item{(order.order_items?.length || 0) !== 1 ? 's' : ''}
                </span>
                <span className={cn(
                  'pos-order-amount',
                  isSelected && 'pos-order-amount-selected'
                )}>
                  {formatCurrency(order.total_amount)}
                </span>
              </div>

              {/* Bottom row: Location */}
              {(order.table_number || order.room_number) && (
                <div className="flex items-center gap-1 mt-2 text-xs text-[var(--pos-text-muted)]">
                  <MapPin className="w-3 h-3" />
                  {order.table_number && <span>Table {order.table_number}</span>}
                  {order.room_number && <span>Room {order.room_number}</span>}
                </div>
              )}
            </div>
          );
        })}

        {/* Expired section */}
        {expiredOrders.length > 0 && (
          <>
            <div className="px-4 pt-6 pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--pos-text-muted)] uppercase tracking-wider">
                <AlertTriangle className="w-3 h-3" />
                Expired
              </div>
            </div>
            {expiredOrders.map((order) => (
              <div
                key={order.id}
                className="pos-order-card pos-order-card-expired"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="pos-order-number">#{order.order_number}</span>
                    <span className="pos-order-badge pos-order-badge-expired">
                      EXPIRED
                    </span>
                  </div>
                  <span className="pos-order-amount">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
