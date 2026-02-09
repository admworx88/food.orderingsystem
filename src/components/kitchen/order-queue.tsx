'use client';

import { useState } from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRealtimeOrders } from '@/hooks/use-realtime-orders';
import { OrderCard } from './order-card';

type FilterStatus = 'all' | 'paid' | 'preparing' | 'ready';
type FilterOrderType = 'all' | 'dine_in' | 'room_service' | 'takeout';

const STATUS_FILTERS: { value: FilterStatus; label: string; colorClass: string }[] = [
  { value: 'all', label: 'All Orders', colorClass: '' },
  { value: 'paid', label: 'New', colorClass: 'kds-filter-btn-new' },
  { value: 'preparing', label: 'Preparing', colorClass: 'kds-filter-btn-preparing' },
  { value: 'ready', label: 'Ready', colorClass: 'kds-filter-btn-ready' },
];

const ORDER_TYPE_FILTERS: { value: FilterOrderType; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'dine_in', label: 'Dine-in' },
  { value: 'room_service', label: 'Room Service' },
  { value: 'takeout', label: 'Takeout' },
];

export function OrderQueue() {
  const { orders, isLoading, error, refetch, optimisticStatusUpdate } = useRealtimeOrders();
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [typeFilter, setTypeFilter] = useState<FilterOrderType>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (typeFilter !== 'all' && order.order_type !== typeFilter) return false;
    return true;
  });

  const orderCounts = {
    all: orders.length,
    paid: orders.filter((o) => o.status === 'paid').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    ready: orders.filter((o) => o.status === 'ready').length,
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-cyan-400/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <p className="text-zinc-400 text-lg font-medium">Initializing display...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-rose-500/10 flex items-center justify-center">
            <span className="text-3xl">⚠</span>
          </div>
          <p className="text-rose-400 text-xl font-semibold mb-2">Connection Error</p>
          <p className="text-zinc-500 text-sm mb-8">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-cyan-950 rounded-lg font-bold text-sm uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Status Summary Bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 bg-[#0a0a0c]/80 backdrop-blur-sm rounded-xl border border-white/[0.04]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="kds-status-dot kds-status-dot-new" />
            <span className="text-zinc-400 text-sm">
              <span className="font-mono font-bold text-cyan-400">{orderCounts.paid}</span>
              <span className="ml-1.5">New</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="kds-status-dot kds-status-dot-preparing" />
            <span className="text-zinc-400 text-sm">
              <span className="font-mono font-bold text-amber-400">{orderCounts.preparing}</span>
              <span className="ml-1.5">Preparing</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="kds-status-dot kds-status-dot-ready" />
            <span className="text-zinc-400 text-sm">
              <span className="font-mono font-bold text-green-400">{orderCounts.ready}</span>
              <span className="ml-1.5">Ready</span>
            </span>
          </div>
        </div>

        <div className="text-sm text-zinc-500">
          <span className="font-mono font-bold text-zinc-300">{orderCounts.all}</span>
          <span className="ml-1.5">total active orders</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Status filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'kds-filter-btn',
                filter.colorClass,
                statusFilter === filter.value && 'kds-filter-btn-active'
              )}
            >
              <span>{filter.label}</span>
              <span className="kds-count">{orderCounts[filter.value]}</span>
            </button>
          ))}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Order type filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as FilterOrderType)}
              className="appearance-none bg-[#111114] text-zinc-300 border border-white/[0.08] rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer"
            >
              {ORDER_TYPE_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-lg bg-[#111114] border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:border-cyan-500/30 hover:bg-zinc-800/50 transition-all disabled:opacity-50"
            aria-label="Refresh orders"
          >
            <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            {/* Animated empty state icon */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border border-dashed border-zinc-700 animate-spin" style={{ animationDuration: '20s' }} />
              <div className="absolute inset-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
                <span className="text-4xl">🍳</span>
              </div>
            </div>

            <p className="text-zinc-300 text-xl font-semibold mb-2">
              {orders.length === 0 ? 'Awaiting Orders' : 'No Matches'}
            </p>
            <p className="text-zinc-600 text-sm max-w-xs mx-auto">
              {orders.length === 0
                ? 'New orders will appear here instantly via real-time sync'
                : 'Try adjusting your filter criteria to see more orders'
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredOrders.map((order, index) => (
            <div
              key={order.id}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <OrderCard order={order} onStatusUpdated={optimisticStatusUpdate} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
