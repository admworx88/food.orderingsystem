'use client';

import { useState, useCallback } from 'react';
import { Receipt, Clock, Search } from 'lucide-react';
import { RecentOrderCard } from './recent-order-card';
import { RecentOrderDetail } from './recent-order-detail';
import { cn } from '@/lib/utils';
import type { RecentOrder } from '@/types/payment';

interface RecentOrdersClientProps {
  initialOrders: RecentOrder[];
}

/**
 * Recent Orders split-panel layout — Terminal Command Center theme
 * Left panel: compact order cards list
 * Right panel: full order detail + receipt button
 */
export function RecentOrdersClient({ initialOrders }: RecentOrdersClientProps) {
  const [orders] = useState<RecentOrder[]>(initialOrders);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    initialOrders.length > 0 ? initialOrders[0].id : null
  );
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOrder = selectedOrderId
    ? orders.find((o) => o.id === selectedOrderId) || null
    : null;

  const filteredOrders = searchQuery.trim()
    ? orders.filter(
        (o) =>
          o.order_number.includes(searchQuery) ||
          o.table_number?.includes(searchQuery) ||
          o.room_number?.includes(searchQuery)
      )
    : orders;

  const handleSelectOrder = useCallback((id: string) => {
    setSelectedOrderId(id);
  }, []);

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Left panel: Order list */}
      <div className="w-[380px] flex-shrink-0 flex flex-col border-r border-[var(--pos-border)]">
        {/* Search header */}
        <div className="p-3 border-b border-[var(--pos-border)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--pos-text-muted)]" />
            <input
              type="text"
              placeholder="Search by order #, table, room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--pos-surface)] border border-[var(--pos-border)] rounded-lg text-[var(--pos-text)] placeholder:text-[var(--pos-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--pos-accent)]"
            />
          </div>
          <p className="text-xs text-[var(--pos-text-muted)] mt-2">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} in last 24 hours
          </p>
        </div>

        {/* Order list */}
        <div className="flex-1 overflow-y-auto pos-scrollbar">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="w-10 h-10 mx-auto mb-3 text-[var(--pos-text-muted)] opacity-40" />
              <p className="text-sm text-[var(--pos-text-muted)]">
                {searchQuery ? 'No orders match your search' : 'No recent orders'}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredOrders.map((order) => (
                <RecentOrderCard
                  key={order.id}
                  order={order}
                  isSelected={order.id === selectedOrderId}
                  onSelect={handleSelectOrder}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Order detail */}
      <div className="flex-1 overflow-y-auto pos-scrollbar">
        {selectedOrder ? (
          <RecentOrderDetail order={selectedOrder} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className={cn(
                'w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center',
                'bg-[var(--pos-surface)] border border-[var(--pos-border)]'
              )}>
                <Receipt className="w-8 h-8 text-[var(--pos-text-muted)]" />
              </div>
              <p className="text-[var(--pos-text-muted)] text-sm">
                Select an order to view details
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
