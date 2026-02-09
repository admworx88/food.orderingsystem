'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type OrderItemAddon = Database['public']['Tables']['order_item_addons']['Row'];

export type KitchenOrder = Order & {
  order_items: (OrderItem & {
    order_item_addons: OrderItemAddon[];
  })[];
};

interface UseRealtimeOrdersReturn {
  orders: KitchenOrder[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  optimisticStatusUpdate: (orderId: string, newStatus: string, newVersion: number) => void;
}

export function useRealtimeOrders(): UseRealtimeOrdersReturn {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);

  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserClient();
    }
    return supabaseRef.current;
  }

  const fetchOrders = useCallback(async () => {
    const supabase = getSupabase();

    const { data, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          order_item_addons(*)
        )
      `)
      .in('status', ['paid', 'preparing', 'ready'])
      .is('deleted_at', null)
      .order('paid_at', { ascending: true, nullsFirst: false });

    if (fetchError) {
      console.error('Failed to fetch kitchen orders:', fetchError);
      setError(fetchError.message);
    } else {
      setOrders((data || []) as KitchenOrder[]);
      setError(null);
    }

    setIsLoading(false);
  }, []);

  // Optimistic UI update — called immediately after a successful server action
  const optimisticStatusUpdate = useCallback((
    orderId: string,
    newStatus: string,
    newVersion: number
  ) => {
    if (newStatus === 'served' || newStatus === 'cancelled') {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } else {
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
  }, [fetchOrders]);

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

    // If order status moved to served or cancelled, remove from queue
    if (newOrder.status === 'served' || newOrder.status === 'cancelled') {
      setOrders((prev) => prev.filter((o) => o.id !== newOrder.id));
      return;
    }

    // If order is in an active status, fetch full details and upsert
    if (['paid', 'preparing', 'ready'].includes(newOrder.status)) {
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
  }, []);

  useEffect(() => {
    fetchOrders();

    const supabase = getSupabase();

    // Subscribe to realtime changes on orders table.
    // NOTE: Supabase Realtime postgres_changes does not support `in` filters
    // (e.g., status=in.(paid,preparing,ready)). Only single `eq` filters are
    // supported. We listen to all changes and filter client-side in
    // handleRealtimeChange. This is a known limitation — when Supabase adds
    // multi-value filter support, add: filter: 'status=in.(paid,preparing,ready)'
    const channel = supabase
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
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[KDS Realtime] Connected successfully');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[KDS Realtime] Channel error:', err);
        } else if (status === 'TIMED_OUT') {
          console.warn('[KDS Realtime] Connection timed out');
        } else {
          console.log('[KDS Realtime] Status:', status);
        }
      });

    // Polling fallback: refetch every 10s to catch new orders if Realtime fails
    const pollInterval = setInterval(fetchOrders, 10_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchOrders, handleRealtimeChange]);

  return { orders, isLoading, error, refetch: fetchOrders, optimisticStatusUpdate };
}
