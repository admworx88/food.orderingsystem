'use client';

import { useState, useEffect } from 'react';
import { Clock, MapPin, AlertTriangle, Wallet } from 'lucide-react';
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
 * Unified payment queue — pending_payment + bill_later orders
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

  const noExpiry = (o: CashierOrder) => o.payment_method === 'bill_later' || o.payment_method === 'cash';
  const activeOrders = orders.filter(
    (o) => noExpiry(o) || !o.expires_at || new Date(o.expires_at).getTime() > now
  );
  const expiredOrders = orders.filter(
    (o) => !noExpiry(o) && o.expires_at && new Date(o.expires_at).getTime() <= now
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="pos-queue-header">
        <h2 className="pos-queue-title">Payment Queue</h2>
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
          const isBillLater = order.payment_method === 'bill_later';
          const isCash = order.payment_method === 'cash';
          const hasNoTimer = isBillLater || isCash;
          const expiresAt = order.expires_at;
          const minutesLeft = !hasNoTimer && expiresAt
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
              {/* Row 1: Order number + Timer or Bill Later badge */}
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  'pos-order-number',
                  isSelected && 'pos-order-number-selected'
                )}>
                  #{order.order_number}
                </span>
                {isBillLater ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Wallet className="w-2.5 h-2.5" />
                    Bill Later
                  </span>
                ) : isCash ? null : (
                  <ExpirationCountdown expiresAt={order.expires_at} />
                )}
              </div>

              {/* Row 2: Type · Location + Kiosk badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] text-[var(--pos-text-muted)]">
                  <span>{ORDER_TYPE_LABELS[order.order_type] || order.order_type}</span>
                  {(order.table_number || order.room_number) && (
                    <>
                      <span className="opacity-30">·</span>
                      <MapPin className="w-2.5 h-2.5 shrink-0" />
                      <span>
                        {order.table_number ? `Table ${order.table_number}` : `Room ${order.room_number}`}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {order.kiosk_location === 'ocean_view' && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--pos-blue-glow)] text-[var(--pos-blue)] border border-[rgba(96,165,250,0.3)]">
                      Ocean View
                    </span>
                  )}
                  {order.kiosk_location === 'restaurant' && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--pos-mint-glow)] text-[var(--pos-mint)] border border-[rgba(52,211,153,0.3)]">
                      Restaurant
                    </span>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="my-3 h-px bg-[var(--pos-border)]" />

              {/* Row 3: Items + Amount */}
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-[var(--pos-text-muted)]">
                  {order.order_items?.length || 0} item{(order.order_items?.length || 0) !== 1 ? 's' : ''}
                </span>
                <span className={cn(
                  'pos-order-amount text-[15px]',
                  isSelected && 'pos-order-amount-selected'
                )}>
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
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
