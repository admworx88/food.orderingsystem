'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { calculateItemStatusCounts, hasReadyItems } from '@/lib/utils/item-status';
import type { OrderItemStatus } from '@/lib/constants/item-status';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type OrderItemAddon = Database['public']['Tables']['order_item_addons']['Row'];

export type WaiterOrderItem = OrderItem & {
  order_item_addons: OrderItemAddon[];
};

export type WaiterOrder = Order & {
  order_items: WaiterOrderItem[];
  readyCount: number;
  servedCount: number;
  totalCount: number;
  preparingCount: number;
};

export interface UseRealtimeWaiterOrdersOptions {
  includeServed?: boolean;
}

interface UseRealtimeWaiterOrdersReturn {
  orders: WaiterOrder[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  totalReadyItems: number;
  totalPreparingItems: number;
  optimisticItemUpdate: (itemId: string, newStatus: OrderItemStatus) => void;
}

// Notification sound for ready items
const NOTIFICATION_SOUND_URL = '/sounds/notification.mp3';

// Get midnight of today in ISO format for current shift filtering
function getTodayMidnight(): string {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return midnight.toISOString();
}

export function useRealtimeWaiterOrders(
  soundEnabled: boolean = true,
  options: UseRealtimeWaiterOrdersOptions = {}
): UseRealtimeWaiterOrdersReturn {
  const { includeServed = false } = options;
  const [orders, setOrders] = useState<WaiterOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);
  const prevReadyCountRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
      audioRef.current.volume = 0.5;
    }
    return () => {
      audioRef.current = null;
    };
  }, []);

  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserClient();
    }
    return supabaseRef.current;
  }

  // Calculate total ready and preparing items across all orders
  const totalReadyItems = orders.reduce((sum, order) => sum + order.readyCount, 0);
  const totalPreparingItems = orders.reduce((sum, order) => sum + order.preparingCount, 0);

  // Play notification sound when new items become ready
  useEffect(() => {
    if (soundEnabled && totalReadyItems > prevReadyCountRef.current && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.warn('Failed to play notification sound:', err);
      });
    }
    prevReadyCountRef.current = totalReadyItems;
  }, [totalReadyItems, soundEnabled]);

  const fetchOrders = useCallback(async () => {
    const supabase = getSupabase();

    // Build status filter based on includeServed option
    const statusFilter = includeServed
      ? ['preparing', 'ready', 'served'] as const
      : ['preparing', 'ready'] as const;

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          order_item_addons(*)
        )
      `)
      .in('status', statusFilter)
      .is('deleted_at', null);

    // For served orders, filter to current shift (since midnight today)
    if (includeServed) {
      const todayMidnight = getTodayMidnight();
      // Get active orders OR served orders from today
      query = query.or(`status.neq.served,served_at.gte.${todayMidnight}`);
    }

    const { data, error: fetchError } = await query.order('paid_at', { ascending: true, nullsFirst: false });

    if (fetchError) {
      console.error('Failed to fetch waiter orders:', fetchError);
      setError(fetchError.message);
    } else {
      // Calculate item status counts for each order
      const ordersWithCounts: WaiterOrder[] = (data || []).map((order) => {
        const items = order.order_items || [];
        const counts = calculateItemStatusCounts(items);
        return {
          ...order,
          readyCount: counts.ready,
          servedCount: counts.served,
          totalCount: counts.total,
          preparingCount: counts.preparing,
        } as WaiterOrder;
      });

      // Filter out orders with no ready items if needed
      setOrders(ordersWithCounts);
      setError(null);
    }

    setIsLoading(false);
  }, [includeServed]);

  // Optimistic UI update for item status
  const optimisticItemUpdate = useCallback((
    itemId: string,
    newStatus: OrderItemStatus
  ) => {
    setOrders((prev) =>
      prev.map((order) => {
        const itemIndex = order.order_items.findIndex((item) => item.id === itemId);
        if (itemIndex === -1) return order;

        // Update the item status
        const updatedItems = [...order.order_items];
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          status: newStatus,
          served_at: newStatus === 'served' ? new Date().toISOString() : updatedItems[itemIndex].served_at,
        };

        // Recalculate counts
        const counts = calculateItemStatusCounts(updatedItems);

        return {
          ...order,
          order_items: updatedItems,
          readyCount: counts.ready,
          servedCount: counts.served,
          totalCount: counts.total,
          preparingCount: counts.preparing,
        };
      }).filter((order) => {
        // Remove orders where all items are served (unless we're including served)
        if (includeServed) return true;
        const counts = calculateItemStatusCounts(order.order_items);
        return counts.served < counts.total;
      })
    );

    // Background refetch for full data consistency
    fetchOrders();
  }, [fetchOrders, includeServed]);

  // Handle realtime changes
  const handleRealtimeChange = useCallback(async (payload: {
    eventType: string;
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }) => {
    console.log('[Waiter Realtime] Event received:', payload.eventType);
    const supabase = getSupabase();

    if (payload.eventType === 'DELETE') {
      const oldId = payload.old?.id as string;
      if (oldId) {
        setOrders((prev) => prev.filter((o) => o.id !== oldId));
      }
      return;
    }

    const newOrder = payload.new as Order;

    // If order status moved to cancelled, remove from queue
    if (newOrder.status === 'cancelled') {
      setOrders((prev) => prev.filter((o) => o.id !== newOrder.id));
      return;
    }

    // If order status moved to served and we're not including served, remove from queue
    if (newOrder.status === 'served' && !includeServed) {
      setOrders((prev) => prev.filter((o) => o.id !== newOrder.id));
      return;
    }

    // Build valid statuses based on includeServed option
    const validStatuses = includeServed
      ? ['preparing', 'ready', 'served']
      : ['preparing', 'ready'];

    // If order is in a valid status for waiter, fetch full details
    if (validStatuses.includes(newOrder.status)) {
      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            order_item_addons(*)
          )
        `)
        .eq('id', newOrder.id)
        .is('deleted_at', null)
        .single();

      if (data) {
        const items = data.order_items || [];
        const counts = calculateItemStatusCounts(items);
        const fullOrder: WaiterOrder = {
          ...data,
          readyCount: counts.ready,
          servedCount: counts.served,
          totalCount: counts.total,
          preparingCount: counts.preparing,
        } as WaiterOrder;

        setOrders((prev) => {
          const existing = prev.findIndex((o) => o.id === fullOrder.id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = fullOrder;
            return updated;
          }
          // New order with ready items or served (if including served)
          if (hasReadyItems(counts) || (includeServed && data.status === 'served')) {
            return [...prev, fullOrder];
          }
          return prev;
        });
      }
    }
  }, [includeServed]);

  useEffect(() => {
    fetchOrders();

    const supabase = getSupabase();

    // Subscribe to realtime changes on orders table
    const ordersChannel = supabase
      .channel('waiter-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        handleRealtimeChange
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Waiter Realtime] Orders channel connected');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Waiter Realtime] Orders channel error:', err);
        }
      });

    // Also subscribe to order_items changes for item-level updates
    const itemsChannel = supabase
      .channel('waiter-order-items')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_items',
        },
        () => {
          // Refetch orders when any item status changes
          console.log('[Waiter Realtime] Item updated, refetching...');
          fetchOrders();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Waiter Realtime] Items channel connected');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Waiter Realtime] Items channel error:', err);
        }
      });

    // Polling fallback: refetch every 10s
    const pollInterval = setInterval(fetchOrders, 10_000);

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(itemsChannel);
      clearInterval(pollInterval);
    };
  }, [fetchOrders, handleRealtimeChange]);

  return {
    orders,
    isLoading,
    error,
    refetch: fetchOrders,
    totalReadyItems,
    totalPreparingItems,
    optimisticItemUpdate,
  };
}
