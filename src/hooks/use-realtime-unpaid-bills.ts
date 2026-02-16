'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import type { CashierOrder } from '@/types/payment';
import { useRealtimeReconnection } from './use-realtime-reconnection';

type Order = Database['public']['Tables']['orders']['Row'];

interface UseRealtimeUnpaidBillsReturn {
  orders: CashierOrder[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Realtime subscription for cashier unpaid bills queue.
 * Filters for payment_method = 'bill_later', payment_status = 'unpaid',
 * and status IN ('preparing', 'ready', 'served').
 * These are dine-in orders where customers chose "Pay After Meal".
 */
export function useRealtimeUnpaidBills(): UseRealtimeUnpaidBillsReturn {
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
      .eq('payment_method', 'bill_later')
      .in('status', ['preparing', 'ready', 'served'])
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Failed to fetch unpaid bills:', fetchError);
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

    // Remove from unpaid bills queue if:
    // - Payment completed (payment_status !== 'unpaid')
    // - Payment method changed (not bill_later anymore)
    // - Status no longer eligible
    // - Order deleted
    const isEligible =
      newOrder.payment_status === 'unpaid' &&
      newOrder.payment_method === 'bill_later' &&
      ['preparing', 'ready', 'served'].includes(newOrder.status) &&
      newOrder.deleted_at === null;

    if (!isEligible) {
      setOrders((prev) => prev.filter((o) => o.id !== newOrder.id));
      return;
    }

    // New or updated unpaid bill — fetch full details with joins
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
      channelName: 'cashier-unpaid-bills',
      onMaxRetriesReached: () => {
        console.warn('[Cashier] Max reconnection attempts reached for unpaid bills, using polling fallback');
      },
      onReconnect: () => {
        // Refetch orders after reconnection delay
        fetchOrders();
      },
    });

    // Subscribe to all orders table changes, filter client-side
    const channel = supabase
      .channel('cashier-unpaid-bills')
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
          console.log('[Cashier Realtime] Unpaid bills channel connected');
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Cashier Realtime] Unpaid bills channel error - attempting reconnect');
        } else if (status === 'TIMED_OUT') {
          console.warn('[Cashier Realtime] Unpaid bills timed out - attempting reconnect');
        }
      });

    return () => {
      reconnection.reset();
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, handleRealtimeChange]);

  return { orders, isLoading, error, refetch: fetchOrders };
}
