'use client';

import { useState } from 'react';
import { RefreshCw, Loader2, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRealtimeOrders } from '@/hooks/use-realtime-orders';
import { OrderCard } from './order-card';

type FilterStatus = 'all' | 'paid' | 'preparing' | 'ready';
type FilterOrderType = 'all' | 'dine_in' | 'room_service' | 'takeout';

const STATUS_FILTERS: { value: FilterStatus; label: string; color: string }[] = [
  { value: 'all', label: 'All Orders', color: 'bg-gray-600' },
  { value: 'paid', label: 'New', color: 'bg-blue-600' },
  { value: 'preparing', label: 'Preparing', color: 'bg-amber-600' },
  { value: 'ready', label: 'Ready', color: 'bg-green-600' },
];

const ORDER_TYPE_FILTERS: { value: FilterOrderType; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'dine_in', label: 'Dine-in' },
  { value: 'room_service', label: 'Room Service' },
  { value: 'takeout', label: 'Takeout' },
];

export function OrderQueue() {
  const { orders, isLoading, error, refetch } = useRealtimeOrders();
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
          <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">Failed to load orders</p>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Status filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all',
                statusFilter === filter.value
                  ? cn(filter.color, 'text-white shadow-lg')
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
              )}
            >
              <span>{filter.label}</span>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs font-bold',
                statusFilter === filter.value
                  ? 'bg-white/20'
                  : 'bg-gray-700'
              )}>
                {orderCounts[filter.value]}
              </span>
            </button>
          ))}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Order type filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as FilterOrderType)}
              className="bg-gray-800 text-gray-300 border border-gray-700 rounded-lg px-3 py-2 text-sm font-medium focus:border-amber-500 focus:outline-none"
            >
              {ORDER_TYPE_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-all disabled:opacity-50"
            aria-label="Refresh orders"
          >
            <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <span className="text-4xl">🍳</span>
            </div>
            <p className="text-gray-400 text-lg font-medium mb-2">
              {orders.length === 0 ? 'No active orders' : 'No orders match filters'}
            </p>
            <p className="text-gray-600 text-sm">
              {orders.length === 0
                ? 'New orders will appear here in real-time'
                : 'Try adjusting your filter criteria'
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
