'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import type { CashierOrder } from '@/types/payment';
import { getPendingOrders } from '@/services/payment-service';
import { useRealtimeReconnection } from './use-realtime-reconnection';

type Order = Database['public']['Tables']['orders']['Row'] & { kiosk_location?: string | null };

interface UseRealtimePendingOrdersReturn {
  orders: CashierOrder[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseRealtimePendingOrdersOptions {
  initialData?: CashierOrder[];
  kioskLocation?: string | null;
}

/**
 * Realtime subscription for cashier pending orders queue.
 * Filters for payment_status = 'unpaid', status = 'pending_payment'.
 * When kioskLocation is 'ocean_view', only shows ocean_view orders.
 * Accepts initialData from server-side fetch to avoid redundant client fetch.
 */
export function useRealtimePendingOrders(
  { initialData, kioskLocation }: UseRealtimePendingOrdersOptions = {}
): UseRealtimePendingOrdersReturn {
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
    const result = await getPendingOrders(kioskLocation);
    if (result.success) {
      setOrders(result.data);
      setError(null);
    } else {
      console.error('Failed to fetch pending orders:', result.error);
      setError(result.error);
    }
    setIsLoading(false);
  }, [kioskLocation]);

  const reconnection = useRealtimeReconnection({
    channelName: 'cashier-pending-orders',
    onMaxRetriesReached: () => {
      console.warn('[Cashier] Max reconnection attempts reached for pending orders, using polling fallback');
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

    // Remove from pending queue if no longer pending payment or out of scope
    const locationMatch = kioskLocation !== 'ocean_view' || newOrder.kiosk_location === 'ocean_view';
    if (
      newOrder.payment_status !== 'unpaid' ||
      newOrder.status !== 'pending_payment' ||
      newOrder.deleted_at !== null ||
      !locationMatch
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
    // Skip initial fetch if server already provided data, but always refetch on reconnect
    if (!initialData || reconnectTrigger > 0) {
      fetchOrders();
    }

    const supabase = getSupabase();

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
        reconnectionRef.current.handleStatus(status);

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
      reconnectionRef.current.reset();
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
    };
  // reconnectTrigger intentionally drives reconnection; reconnection object excluded (stable via ref)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOrders, handleRealtimeChange, reconnectTrigger]);

  return { orders, isLoading, error, refetch: fetchOrders };
}
