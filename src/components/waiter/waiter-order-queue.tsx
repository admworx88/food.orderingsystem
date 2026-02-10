'use client';

import { useState, useCallback, useSyncExternalStore, useMemo } from 'react';
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, Clock, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRealtimeWaiterOrders, type WaiterOrder } from '@/hooks/use-realtime-waiter-orders';
import { WaiterSplitPanel } from './waiter-split-panel';
import type { OrderItemStatus } from '@/lib/constants/item-status';

const STORAGE_KEY = 'waiter-sound-enabled';

// Custom hook for localStorage with SSR support
function useWaiterSoundPreference() {
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return 'true';
    return localStorage.getItem(STORAGE_KEY) ?? 'true';
  }, []);

  const getServerSnapshot = useCallback(() => 'true', []);

  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener('storage', callback);
    // Also listen for custom events for same-tab updates
    window.addEventListener('waiter-sound-change', callback);
    return () => {
      window.removeEventListener('storage', callback);
      window.removeEventListener('waiter-sound-change', callback);
    };
  }, []);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return value === 'true';
}

interface WaiterOrderQueueProps {
  initialOrders: WaiterOrder[];
}

type ViewFilter = 'ready' | 'preparing' | 'recent';

export function WaiterOrderQueue({ initialOrders }: WaiterOrderQueueProps) {
  const [viewFilter, setViewFilter] = useState<ViewFilter>('ready');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const soundEnabled = useWaiterSoundPreference();

  const {
    orders,
    isLoading,
    error,
    refetch,
    optimisticItemUpdate,
  } = useRealtimeWaiterOrders(soundEnabled, { includeServed: true });

  // Use server data initially, then switch to realtime
  const displayOrders = orders.length > 0 || !isLoading ? orders : initialOrders;

  // Filter orders based on view
  const filteredOrders = useMemo(() => {
    switch (viewFilter) {
      case 'ready':
        // Orders with ANY ready items (not served)
        return displayOrders.filter((order) =>
          order.readyCount > 0 && order.status !== 'served'
        );
      case 'preparing':
        // Orders with items still preparing (not all ready/served)
        return displayOrders.filter((order) =>
          order.status !== 'served' &&
          order.order_items.some((item) => item.status === 'preparing')
        );
      case 'recent':
        // Served orders only (from current shift)
        return displayOrders.filter((order) => order.status === 'served');
    }
  }, [viewFilter, displayOrders]);

  // Count for each tab
  const tabCounts = useMemo(() => ({
    ready: displayOrders.filter((o) => o.readyCount > 0 && o.status !== 'served').length,
    preparing: displayOrders.filter((o) =>
      o.status !== 'served' &&
      o.order_items.some((item) => item.status === 'preparing')
    ).length,
    recent: displayOrders.filter((o) => o.status === 'served').length,
  }), [displayOrders]);

  // Sort: orders with ready items first, then by paid_at (or served_at for recent)
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      if (viewFilter === 'recent') {
        // For recent tab, sort by served_at descending (most recently served first)
        const aTime = a.served_at ? new Date(a.served_at).getTime() : 0;
        const bTime = b.served_at ? new Date(b.served_at).getTime() : 0;
        return bTime - aTime;
      }
      // Orders with ready items first for active views
      if (a.readyCount > 0 && b.readyCount === 0) return -1;
      if (a.readyCount === 0 && b.readyCount > 0) return 1;
      // Then by paid_at
      const aTime = a.paid_at ? new Date(a.paid_at).getTime() : 0;
      const bTime = b.paid_at ? new Date(b.paid_at).getTime() : 0;
      return aTime - bTime;
    });
  }, [filteredOrders, viewFilter]);

  const handleItemServed = (itemId: string, newStatus: OrderItemStatus) => {
    optimisticItemUpdate(itemId, newStatus);
  };

  // Handle order selection
  const handleSelectOrder = useCallback((id: string | null) => {
    setSelectedOrderId(id);
  }, []);

  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="waiter-empty-icon mx-auto">
            <AlertCircle className="w-10 h-10" />
          </div>
          <div>
            <h2 className="waiter-empty-title">Connection Error</h2>
            <p className="waiter-empty-description mt-2">{error}</p>
          </div>
          <button onClick={refetch} className="waiter-refresh-btn mx-auto">
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with tabs and controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Tabs */}
        <div className="waiter-tabs">
          {/* Ready tab */}
          <button
            onClick={() => setViewFilter('ready')}
            className={cn(
              'waiter-tab',
              viewFilter === 'ready' && 'waiter-tab-active waiter-tab-ready'
            )}
          >
            <span className="waiter-tab-dot" />
            <span>Ready</span>
            {tabCounts.ready > 0 && (
              <span className="waiter-tab-count">{tabCounts.ready}</span>
            )}
          </button>

          {/* Preparing tab */}
          <button
            onClick={() => setViewFilter('preparing')}
            className={cn(
              'waiter-tab',
              viewFilter === 'preparing' && 'waiter-tab-active waiter-tab-preparing'
            )}
          >
            <span className="waiter-tab-dot" />
            <span>Preparing</span>
            {tabCounts.preparing > 0 && (
              <span className="waiter-tab-count">{tabCounts.preparing}</span>
            )}
          </button>

          {/* Recent tab */}
          <button
            onClick={() => setViewFilter('recent')}
            className={cn(
              'waiter-tab',
              viewFilter === 'recent' && 'waiter-tab-active waiter-tab-recent'
            )}
          >
            <span className="waiter-tab-dot" />
            <span>Recent</span>
            {tabCounts.recent > 0 && (
              <span className="waiter-tab-count">{tabCounts.recent}</span>
            )}
          </button>
        </div>

        {/* Right: Order count + Refresh */}
        <div className="flex items-center gap-4">
          <span className="waiter-order-count">
            {sortedOrders.length} order{sortedOrders.length !== 1 ? 's' : ''}
          </span>

          <button
            onClick={refetch}
            disabled={isLoading}
            className="waiter-refresh-btn"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && displayOrders.length === 0 && (
        <div className="flex h-[50vh] items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--waiter-ready)] mx-auto" />
            <p className="text-[var(--waiter-text-muted)]">Loading orders...</p>
          </div>
        </div>
      )}

      {/* Empty states */}
      {!isLoading && sortedOrders.length === 0 && (
        <div className="flex h-[50vh] items-center justify-center">
          <div className="text-center space-y-5 max-w-md">
            {viewFilter === 'ready' && (
              <>
                <div className="waiter-empty-icon mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="waiter-empty-title">No Items Ready</h2>
                <p className="waiter-empty-description">
                  When the kitchen marks items as ready for service,
                  they&apos;ll appear here. Check the Preparing tab to see
                  orders currently being made.
                </p>
              </>
            )}
            {viewFilter === 'preparing' && (
              <>
                <div className="waiter-empty-icon mx-auto">
                  <Clock className="w-10 h-10" />
                </div>
                <h2 className="waiter-empty-title">Kitchen Queue Empty</h2>
                <p className="waiter-empty-description">
                  There are no orders being prepared at the moment.
                  New orders will appear here once the kitchen starts working on them.
                </p>
              </>
            )}
            {viewFilter === 'recent' && (
              <>
                <div className="waiter-empty-icon mx-auto">
                  <Coffee className="w-10 h-10" />
                </div>
                <h2 className="waiter-empty-title">No Completed Orders</h2>
                <p className="waiter-empty-description">
                  Orders you&apos;ve served during this shift will appear here.
                  A quiet moment before the rush begins.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Split Panel Layout (Grid or List + Detail) */}
      {sortedOrders.length > 0 && (
        <WaiterSplitPanel
          orders={sortedOrders}
          selectedOrderId={selectedOrderId}
          onSelectOrder={handleSelectOrder}
          viewFilter={viewFilter}
          onItemServed={handleItemServed}
        />
      )}
    </div>
  );
}
