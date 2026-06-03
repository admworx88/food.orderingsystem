'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface UseRealtimeReconnectionOptions {
  channelName: string;
  maxRetries?: number;
  onMaxRetriesReached?: () => void;
  onReconnect?: () => void;
}

interface ReconnectionHandler {
  handleStatus: (status: string) => void;
  triggerReconnect: () => void;
  reset: () => void;
}

// Module-level Set to track which channels have shown error toast
// This prevents showing 4 simultaneous toasts when all hooks fail
const channelsWithErrorToast = new Set<string>();

export function useRealtimeReconnection(
  options: UseRealtimeReconnectionOptions
): ReconnectionHandler {
  const { channelName, maxRetries = 3, onMaxRetriesReached, onReconnect } = options;

  const retryCountRef = useRef(0);
  const isRetryingRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      // Clean up toast tracking on unmount
      channelsWithErrorToast.delete(channelName);
    };
  }, [channelName]);

  const reset = useCallback(() => {
    retryCountRef.current = 0;
    isRetryingRef.current = false;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const showErrorToast = useCallback(() => {
    // Only show toast once per channel to prevent spam
    if (!channelsWithErrorToast.has(channelName)) {
      channelsWithErrorToast.add(channelName);

      toast.error('Realtime connection lost. Using backup polling mode.', {
        duration: 60000,
        action: {
          label: 'Refresh Page',
          onClick: () => {
            window.location.reload();
          },
        },
      });
    }
  }, [channelName]);

  const triggerReconnect = useCallback(() => {
    if (isRetryingRef.current) {
      return; // Already retrying, prevent concurrent attempts
    }

    if (retryCountRef.current >= maxRetries) {
      console.warn(`[${channelName}] Max reconnection attempts reached`);
      showErrorToast();
      if (onMaxRetriesReached) {
        onMaxRetriesReached();
      }
      return;
    }

    isRetryingRef.current = true;

    // Exponential backoff: 2^retryCount * 1000ms (1s, 2s, 4s)
    const delay = Math.pow(2, retryCountRef.current) * 1000;
    retryCountRef.current++;

    console.log(
      `[${channelName}] Reconnection attempt ${retryCountRef.current}/${maxRetries} in ${delay}ms`
    );

    retryTimeoutRef.current = setTimeout(() => {
      isRetryingRef.current = false;
      retryTimeoutRef.current = null;
      // Trigger the actual reconnection
      if (onReconnect) {
        onReconnect();
      }
    }, delay);
  }, [channelName, maxRetries, onMaxRetriesReached, onReconnect, showErrorToast]);

  const handleStatus = useCallback((status: string) => {
    if (status === 'SUBSCRIBED' || status === 'CLOSED') {
      // Successful connection or intentional close - reset retry state
      reset();
      // Clear error toast if it was shown
      channelsWithErrorToast.delete(channelName);
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      // Connection failed - trigger reconnection logic
      triggerReconnect();
    }
  }, [channelName, reset, triggerReconnect]);

  return {
    handleStatus,
    triggerReconnect,
    reset,
  };
}
