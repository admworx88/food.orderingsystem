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

interface UseRealtimeUnpaidBillsOptions {
  initialData?: CashierOrder[];
}

/**
 * Realtime subscription for cashier unpaid bills queue.
 * Filters for payment_method = 'bill_later', payment_status = 'unpaid',
 * and status IN ('preparing', 'ready', 'served').
 * These are dine-in orders where customers chose "Pay After Meal".
 * Accepts initialData from server-side fetch to avoid redundant client fetch.
 */
export function useRealtimeUnpaidBills(
  { initialData }: UseRealtimeUnpaidBillsOptions = {}
): UseRealtimeUnpaidBillsReturn {
  const [orders, setOrders] = useState<CashierOrder[]>(initialData ?? []);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);

  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserClient();
    }
    return supabaseRef.current;
  }

  const fetchOrders = useCallback(async () => {
    const supabase = getSupabase();

    // Guard: only fetch if there is a valid authenticated session.
    // Without this, the browser client calls auth.uid() → null → RLS blocks query.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      console.warn('[Cashier] fetchOrders (unpaid bills) skipped: no active session');
      setIsLoading(false);
      return;
    }

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

  const reconnection = useRealtimeReconnection({
    channelName: 'cashier-unpaid-bills',
    onMaxRetriesReached: () => {
      console.warn('[Cashier] Max reconnection attempts reached for unpaid bills, using polling fallback');
    },
    onReconnect: () => {
      setReconnectTrigger(prev => prev + 1);
    },
  });

  // Stable ref so useEffect doesn't re-run when reconnection object changes identity
  const reconnectionRef = useRef(reconnection);
  reconnectionRef.current = reconnection;

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
    // Skip initial fetch if server already provided data
    if (!initialData) {
      fetchOrders();
    }

    const supabase = getSupabase();

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
        reconnectionRef.current.handleStatus(status);

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
      reconnectionRef.current.reset();
      supabase.removeChannel(channel);
    };
  // reconnectTrigger intentionally drives reconnection; reconnection object excluded (stable via ref)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOrders, handleRealtimeChange, reconnectTrigger]);

  return { orders, isLoading, error, refetch: fetchOrders };
}
