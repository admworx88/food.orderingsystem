'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const PING_URL = '/arenalogo.png';
const PING_TIMEOUT_MS = 5000;

async function checkConnectivity(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const res = await fetch(`${PING_URL}?_=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const mountedRef = useRef(true);

  const verify = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsChecking(true);
    const ok = await checkConnectivity();
    if (mountedRef.current) {
      setIsOnline(ok);
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const handleOffline = () => {
      if (mountedRef.current) setIsOnline(false);
    };
    const handleOnline = () => {
      verify();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!navigator.onLine) setIsOnline(false);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [verify]);

  return { isOnline, isChecking, retry: verify };
}
