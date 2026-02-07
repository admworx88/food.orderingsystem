'use client';

import { useState, useEffect } from 'react';

/**
 * Hook that tracks elapsed seconds since a given timestamp.
 * Used by KDS OrderCard/OrderTimer to avoid duplicate intervals.
 */
export function useElapsedTimer(startTime: string | null): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;

    const calculate = () => {
      const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
      setElapsed(Math.max(0, diff));
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return elapsed;
}
