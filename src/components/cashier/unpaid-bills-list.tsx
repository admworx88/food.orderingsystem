'use client';

import { Clock, MapPin, CheckCircle2, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import type { CashierOrder } from '@/types/payment';

interface UnpaidBillsListProps {
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

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins === 1) return '1 min ago';
  if (diffMins < 60) return `${diffMins} mins ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

/**
 * Unpaid bills queue (Bill Later orders) - Terminal Command Center theme
 */
export function UnpaidBillsList({
  orders,
  selectedOrderId,
  onSelectOrder,
}: UnpaidBillsListProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="pos-queue-header">
        <h2 className="pos-queue-title">Unpaid Bills</h2>
        <p className="pos-queue-subtitle">
          {orders.length} bill{orders.length !== 1 ? 's' : ''} awaiting payment
        </p>
      </div>

      {/* Bills list */}
      <div className="flex-1 overflow-y-auto pos-scrollbar">
        {orders.length === 0 && (
          <div className="py-16 text-center">
            <UtensilsCrossed className="w-8 h-8 mx-auto text-[var(--pos-text-muted)] mb-3" />
            <p className="text-[var(--pos-text-muted)] text-sm">No unpaid bills</p>
          </div>
        )}

        {orders.map((order, index) => {
          const isSelected = order.id === selectedOrderId;
          const timeSince = order.created_at ? getTimeAgo(order.created_at) : null;

          return (
            <div
              key={order.id}
              style={{ animationDelay: `${index * 50}ms` }}
              className={cn(
                'pos-order-card',
                isSelected && 'pos-order-card-selected'
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
                  <span className="pos-order-badge pos-order-badge-served">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Served
                  </span>
                </div>
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

              {/* Bottom row: Location + Time */}
              <div className="flex items-center justify-between mt-2 text-xs text-[var(--pos-text-muted)]">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {order.table_number && <span>Table {order.table_number}</span>}
                  {order.room_number && <span>Room {order.room_number}</span>}
                  {!order.table_number && !order.room_number && <span>Takeout</span>}
                </div>
                {timeSince && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Ordered {timeSince}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
