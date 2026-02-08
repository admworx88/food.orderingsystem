'use client';

import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
};

/**
 * Left panel: scrollable list of pending orders.
 * Active orders sorted by created_at ASC (oldest first).
 * Expired orders shown with red badge, dimmed and unselectable.
 */
export function PendingOrdersList({
  orders,
  selectedOrderId,
  onSelectOrder,
}: PendingOrdersListProps) {
  const [now, setNow] = useState(() => Date.now());

  // Refresh expiration status every 10 seconds
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
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold">Pending Orders</h2>
        <p className="text-sm text-muted-foreground">
          {activeOrders.length} order{activeOrders.length !== 1 ? 's' : ''} awaiting payment
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3">
          {activeOrders.length === 0 && expiredOrders.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              No pending orders
            </div>
          )}

          {activeOrders.map((order) => {
            const isSelected = order.id === selectedOrderId;
            const expiresAt = order.expires_at;
            const minutesLeft = expiresAt
              ? (new Date(expiresAt).getTime() - now) / 60_000
              : null;
            const isUrgent = minutesLeft !== null && minutesLeft < 2;

            return (
              <Card
                key={order.id}
                className={cn(
                  'cursor-pointer p-3 transition-colors',
                  isSelected && 'border-blue-500 bg-blue-50 ring-1 ring-blue-500',
                  !isSelected && 'hover:bg-muted/50',
                  isUrgent && !isSelected && 'border-red-300 bg-red-50'
                )}
                onClick={() => onSelectOrder(order.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">#{order.order_number}</span>
                    <Badge variant="outline" className="text-xs">
                      {ORDER_TYPE_LABELS[order.order_type] || order.order_type}
                    </Badge>
                  </div>
                  <ExpirationCountdown expiresAt={order.expires_at} />
                </div>

                <div className="mt-1.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {order.order_items?.length || 0} item{(order.order_items?.length || 0) !== 1 ? 's' : ''}
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>

                {order.table_number && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Table {order.table_number}
                  </div>
                )}
                {order.room_number && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Room {order.room_number}
                  </div>
                )}
              </Card>
            );
          })}

          {expiredOrders.length > 0 && (
            <>
              <div className="px-1 pt-4 pb-1 text-xs font-medium text-muted-foreground uppercase">
                Expired
              </div>
              {expiredOrders.map((order) => (
                <Card
                  key={order.id}
                  className="cursor-not-allowed p-3 opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">#{order.order_number}</span>
                      <Badge variant="destructive" className="text-xs">
                        EXPIRED
                      </Badge>
                    </div>
                    <span className="text-sm font-semibold">
                      {formatCurrency(order.total_amount)}
                    </span>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
