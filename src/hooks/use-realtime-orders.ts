'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { useRealtimeReconnection } from './use-realtime-reconnection';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type OrderItemAddon = Database['public']['Tables']['order_item_addons']['Row'];

export type KitchenOrder = Order & {
  order_items: (OrderItem & {
    order_item_addons: OrderItemAddon[];
  })[];
};

export interface UseRealtimeOrdersOptions {
  includeServed?: boolean;
}

interface UseRealtimeOrdersReturn {
  orders: KitchenOrder[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  optimisticStatusUpdate: (orderId: string, newStatus: string, newVersion: number) => void;
}

// Notification sound for new orders
const NOTIFICATION_SOUND_URL = '/sounds/notification.mp3';

// Get midnight of today in ISO format for current shift filtering
function getTodayMidnight(): string {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return midnight.toISOString();
}

export function useRealtimeOrders(
  soundEnabled: boolean = true,
  options: UseRealtimeOrdersOptions = {}
): UseRealtimeOrdersReturn {
  const { includeServed = false } = options;
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);
  const prevNewOrderCountRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);

  // Reconnection hook at top level
  const reconnection = useRealtimeReconnection({
    channelName: 'kitchen-orders',
    onMaxRetriesReached: () => {
      console.warn('[KDS] Max reconnection attempts reached, using polling fallback');
    },
    onReconnect: () => {
      // Trigger a refetch by incrementing counter
      setReconnectTrigger(prev => prev + 1);
    },
  });

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

  // Count new orders (status = 'paid')
  const newOrderCount = orders.filter((o) => o.status === 'paid').length;

  // Play notification sound when new orders arrive
  useEffect(() => {
    if (soundEnabled && newOrderCount > prevNewOrderCountRef.current && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.warn('Failed to play notification sound:', err);
      });
    }
    prevNewOrderCountRef.current = newOrderCount;
  }, [newOrderCount, soundEnabled]);

  const fetchOrders = useCallback(async () => {
    const supabase = getSupabase();

    // Build status filter based on includeServed option
    const statusFilter = includeServed
      ? ['paid', 'preparing', 'ready', 'served'] as const
      : ['paid', 'preparing', 'ready'] as const;

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
      console.error('Failed to fetch kitchen orders:', fetchError);
      setError(fetchError.message);
    } else {
      setOrders((data || []) as KitchenOrder[]);
      setError(null);
    }

    setIsLoading(false);
  }, [includeServed]);

  // Optimistic UI update — called immediately after a successful server action
  const optimisticStatusUpdate = useCallback((
    orderId: string,
    newStatus: string,
    newVersion: number
  ) => {
    // If cancelled, always remove
    if (newStatus === 'cancelled') {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } else if (newStatus === 'served' && !includeServed) {
      // If served and we're not showing served orders, remove
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } else {
      // Update the order status
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: newStatus as Order['status'], version: newVersion }
            : o
        )
      );
    }
    // Background refetch for full data consistency (timestamps, etc.)
    fetchOrders();
  }, [fetchOrders, includeServed]);

  // Refetch full order details when a change comes in
  const handleRealtimeChange = useCallback(async (payload: {
    eventType: string;
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }) => {
    console.log('[KDS Realtime] Event received:', payload.eventType, (payload.new as Record<string, unknown>)?.id);
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
      ? ['paid', 'preparing', 'ready', 'served']
      : ['paid', 'preparing', 'ready'];

    // If order is in a valid status, fetch full details and upsert
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
        const fullOrder = data as KitchenOrder;
        setOrders((prev) => {
          const existing = prev.findIndex((o) => o.id === fullOrder.id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = fullOrder;
            return updated;
          }
          // New order — add to the end
          return [...prev, fullOrder];
        });
      }
    }
  }, [includeServed]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial fetch + subscription setup pattern
    fetchOrders();

    const supabase = getSupabase();

    // Subscribe to realtime changes on orders table.
    // NOTE: Supabase Realtime postgres_changes does not support `in` filters
    // (e.g., status=in.(paid,preparing,ready)). Only single `eq` filters are
    // supported. We listen to all changes and filter client-side in
    // handleRealtimeChange. This is a known limitation — when Supabase adds
    // multi-value filter support, add: filter: 'status=in.(paid,preparing,ready)'
    const ordersChannel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        handleRealtimeChange
      )
      .subscribe((status) => {
        reconnection.handleStatus(status);

        if (status === 'SUBSCRIBED') {
          console.log('[KDS Realtime] Orders channel connected');
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[KDS Realtime] Orders channel error - attempting reconnect');
        } else if (status === 'TIMED_OUT') {
          console.warn('[KDS Realtime] Orders connection timed out - attempting reconnect');
        } else {
          console.log('[KDS Realtime] Orders status:', status);
        }
      });

    // Subscribe to order_items changes for item-level status updates
    const itemsChannel = supabase
      .channel('kitchen-order-items')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_items',
        },
        () => {
          // Refetch orders when any item status changes
          console.log('[KDS Realtime] Item updated, refetching...');
          fetchOrders();
        }
      )
      .subscribe((status) => {
        reconnection.handleStatus(status);

        if (status === 'SUBSCRIBED') {
          console.log('[KDS Realtime] Items channel connected');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[KDS Realtime] Items channel error - attempting reconnect');
        }
      });

    // Polling fallback: refetch every 10s to catch new orders if Realtime fails
    const pollInterval = setInterval(fetchOrders, 10_000);

    return () => {
      reconnection.reset();
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(itemsChannel);
      clearInterval(pollInterval);
    };
  }, [fetchOrders, handleRealtimeChange, reconnection, reconnectTrigger]);

  return { orders, isLoading, error, refetch: fetchOrders, optimisticStatusUpdate };
}
