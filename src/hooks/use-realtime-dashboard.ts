'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { refreshDashboardData } from '@/services/analytics-service';
import type { DashboardData } from '@/types/dashboard';

interface UseRealtimeDashboardReturn {
  data: DashboardData | null;
  isLive: boolean;
  lastUpdated: Date | null;
}

const DEBOUNCE_MS = 5000;

export function useRealtimeDashboard(
  initialData: DashboardData
): UseRealtimeDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(initialData);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);

  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserClient();
    }
    return supabaseRef.current;
  }

  const refetchData = useCallback(async () => {
    const result = await refreshDashboardData();
    if (result.success) {
      setData(result.data);
      setLastUpdated(new Date());
    }
  }, []);

  const debouncedRefetch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      refetchData();
    }, DEBOUNCE_MS);
  }, [refetchData]);

  useEffect(() => {
    const supabase = getSupabase();

    const channel = supabase
      .channel('dashboard-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          debouncedRefetch();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsLive(false);
        }
      });

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [debouncedRefetch]);

  return { data, isLive, lastUpdated };
}
