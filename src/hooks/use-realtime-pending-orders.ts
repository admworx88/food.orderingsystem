'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import type { CashierOrder } from '@/types/payment';
import { useRealtimeReconnection } from './use-realtime-reconnection';

type Order = Database['public']['Tables']['orders']['Row'];

interface UseRealtimePendingOrdersReturn {
  orders: CashierOrder[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Realtime subscription for cashier pending orders queue.
 * Filters for payment_status = 'unpaid', status = 'pending_payment'.
 * Removes orders from list when paid, expired, or cancelled.
 */
export function useRealtimePendingOrders(): UseRealtimePendingOrdersReturn {
  const [orders, setOrders] = useState<CashierOrder[]>([]);
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
        ),
        promo_codes(code, discount_value, discount_type)
      `)
      .eq('payment_status', 'unpaid')
      .eq('status', 'pending_payment')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Failed to fetch pending orders:', fetchError);
      setError(fetchError.message);
    } else {
      setOrders((data || []) as CashierOrder[]);
      setError(null);
    }

    setIsLoading(false);
  }, []);

  const handleRealtimeChange = useCallback(async (payload: {
    eventType: string;
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }) => {
    const supabase = getSupabase();

    if (payload.eventType === 'DELETE') {
      const oldId = payload.old?.id as string;
      if (oldId) {
        setOrders((prev) => prev.filter((o) => o.id !== oldId));
      }
      return;
    }

    const newOrder = payload.new as Order;

    // Remove from pending queue if no longer pending payment
    if (
      newOrder.payment_status !== 'unpaid' ||
      newOrder.status !== 'pending_payment' ||
      newOrder.deleted_at !== null
    ) {
      setOrders((prev) => prev.filter((o) => o.id !== newOrder.id));
      return;
    }

    // New or updated pending order — fetch full details with joins
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          order_item_addons(*)
        ),
        promo_codes(code, discount_value, discount_type)
      `)
      .eq('id', newOrder.id)
      .is('deleted_at', null)
      .single();

    if (data) {
      const fullOrder = data as CashierOrder;
      setOrders((prev) => {
        const existing = prev.findIndex((o) => o.id === fullOrder.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = fullOrder;
          return updated;
        }
        return [...prev, fullOrder];
      });
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const supabase = getSupabase();

    const reconnection = useRealtimeReconnection({
      channelName: 'cashier-pending-orders',
      onMaxRetriesReached: () => {
        console.warn('[Cashier] Max reconnection attempts reached for pending orders, using polling fallback');
      },
      onReconnect: () => {
        // Refetch orders after reconnection delay
        fetchOrders();
      },
    });

    // Subscribe to all orders table changes, filter client-side
    const channel = supabase
      .channel('cashier-pending-orders')
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
          console.log('[Cashier Realtime] Pending orders channel connected');
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Cashier Realtime] Pending orders channel error - attempting reconnect');
        } else if (status === 'TIMED_OUT') {
          console.warn('[Cashier Realtime] Pending orders timed out - attempting reconnect');
        }
      });

    // Refresh expiration display every 30 seconds
    const refreshInterval = setInterval(() => {
      setOrders((prev) => [...prev]); // Trigger re-render for countdown timers
    }, 30_000);

    return () => {
      reconnection.reset();
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
    };
  }, [fetchOrders, handleRealtimeChange]);

  return { orders, isLoading, error, refetch: fetchOrders };
}
